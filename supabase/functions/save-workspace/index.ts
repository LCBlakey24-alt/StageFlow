import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function lessonAssignedToCaller(lesson: any, caller: any) {
  const coachId = String(lesson?.coachId || "");
  const accountId = `account:${caller.id}`;
  if (coachId) return coachId === caller.id || coachId === accountId;
  return String(lesson?.coach || "").trim() === String(caller.display_name || "").trim();
}

function changedKeys(a: Record<string, unknown> = {}, b: Record<string, unknown> = {}) {
  return [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]
    .filter((key) => !same(a?.[key], b?.[key]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);

    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const url = Deno.env.get("SUPABASE_URL");
    if (!url || !publishableKey || !secretKey) return json({ error: "Stage Flow workspace service is not configured" }, 500);

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: caller, error: callerError } = await adminClient
      .from("staff_members")
      .select("id, organisation_id, display_name, role, permissions, is_active")
      .eq("auth_user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (callerError || !caller) return json({ error: "Active staff profile not found" }, 403);

    const body = await req.json();
    const organisationId = String(body.organisationId || "");
    const expectedRevision = Number(body.expectedRevision) || 0;
    const nextState = body.state && typeof body.state === "object" ? body.state : null;
    if (!organisationId || organisationId !== caller.organisation_id) return json({ error: "Organisation mismatch" }, 403);
    if (!nextState) return json({ error: "Workspace state is required" }, 400);

    const { data: current, error: currentError } = await adminClient
      .from("organisation_workspaces")
      .select("state, revision")
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return json({ error: "Workspace not found" }, 404);

    const currentRevision = Number(current.revision) || 1;
    if (currentRevision !== expectedRevision) return json({ ok: false, conflict: true, revision: currentRevision });

    const currentState = current.state && typeof current.state === "object" ? current.state : {};
    const isAdmin = ["owner", "admin"].includes(String(caller.role || "").toLowerCase());

    if (!isAdmin) {
      const permissions = caller.permissions && typeof caller.permissions === "object" ? caller.permissions : {};
      for (const key of ["lessons", "framework", "certificates", "pack", "audit"]) {
        if (!same(currentState[key], nextState[key])) return json({ error: `Coach accounts cannot change ${key}` }, 403);
      }

      const lessons = Array.isArray(currentState.lessons) ? currentState.lessons : [];
      const allowedLessons = new Map(
        lessons.filter((lesson: any) => lessonAssignedToCaller(lesson, caller))
          .map((lesson: any) => [String(lesson.id), lesson])
      );

      const oldLearners = Array.isArray(currentState.learners) ? currentState.learners : [];
      const newLearners = Array.isArray(nextState.learners) ? nextState.learners : [];
      if (oldLearners.length !== newLearners.length) return json({ error: "Coach accounts cannot add or remove learners" }, 403);

      const oldById = new Map(oldLearners.map((learner: any) => [String(learner.id), learner]));
      for (const learner of newLearners) {
        const oldLearner: any = oldById.get(String(learner?.id));
        if (!oldLearner) return json({ error: "Coach accounts cannot add learners" }, 403);
        if (same(oldLearner, learner)) continue;

        const lessonId = String(oldLearner.lesson || "");
        const assignedLesson: any = allowedLessons.get(lessonId);
        if (!assignedLesson) return json({ error: "That learner is not in an assigned session" }, 403);
        if (permissions.learners === false) return json({ error: "Learner access is disabled for this account" }, 403);

        for (const key of ["id", "lesson", "name", "stage", "notes"]) {
          if (!same(oldLearner[key], learner[key])) return json({ error: `Coach accounts cannot change learner ${key}` }, 403);
        }

        if (assignedLesson?.features?.notes === false && !same(oldLearner.sessionNote, learner.sessionNote)) {
          return json({ error: "Notes are disabled for this session" }, 403);
        }

        const assessmentChanged =
          !same(oldLearner.res, learner.res) ||
          !same(oldLearner.dist, learner.dist) ||
          !same(oldLearner.nc, learner.nc);
        if (assessmentChanged && (permissions.assess === false || assignedLesson?.features?.assessment === false)) {
          return json({ error: "Assessment is disabled for this account or session" }, 403);
        }
      }

      const oldRecords = currentState.sessionRecords && typeof currentState.sessionRecords === "object" ? currentState.sessionRecords : {};
      const newRecords = nextState.sessionRecords && typeof nextState.sessionRecords === "object" ? nextState.sessionRecords : {};
      const currentLearnersById = new Map(oldLearners.map((learner: any) => [String(learner.id), learner]));
      const allowedRecordKeys = new Set(["lessonId", "date", "startedAt", "completedAt", "learners"]);
      const allowedSnapshotKeys = new Set(["att", "res", "dist", "nc", "sessionNote"]);

      for (const key of changedKeys(oldRecords, newRecords)) {
        const oldRecord: any = oldRecords[key] || null;
        const newRecord: any = newRecords[key] || null;
        if (!newRecord) return json({ error: "Coach accounts cannot delete session history" }, 403);

        const [keyLessonId, keyDate] = String(key).split("::");
        const lessonId = String(newRecord.lessonId || keyLessonId || "");
        const assignedLesson: any = allowedLessons.get(lessonId);
        if (!assignedLesson) return json({ error: "Coach accounts can only save occurrences for assigned sessions" }, 403);
        if (keyLessonId !== lessonId) return json({ error: "Session history lesson mismatch" }, 403);
        if (newRecord.date && keyDate && String(newRecord.date) !== keyDate) {
          return json({ error: "Session history date mismatch" }, 403);
        }

        for (const field of Object.keys(newRecord)) {
          if (!allowedRecordKeys.has(field)) return json({ error: `Unsupported session history field: ${field}` }, 403);
        }

        const oldSnapshots = oldRecord?.learners && typeof oldRecord.learners === "object" ? oldRecord.learners : {};
        const newSnapshots = newRecord.learners && typeof newRecord.learners === "object" ? newRecord.learners : {};

        for (const learnerId of changedKeys(oldSnapshots, newSnapshots)) {
          const oldSnapshot: any = oldSnapshots[learnerId] || null;
          const newSnapshot: any = newSnapshots[learnerId] || null;
          if (!newSnapshot) return json({ error: "Coach accounts cannot delete learner history" }, 403);

          const currentLearner: any = currentLearnersById.get(String(learnerId));
          if (!currentLearner || String(currentLearner.lesson || "") !== lessonId) {
            return json({ error: "Session history contains a learner outside the assigned session" }, 403);
          }
          if (permissions.learners === false) return json({ error: "Learner access is disabled for this account" }, 403);

          for (const field of Object.keys(newSnapshot)) {
            if (!allowedSnapshotKeys.has(field)) return json({ error: `Unsupported learner history field: ${field}` }, 403);
          }

          const baseline = oldSnapshot || {
            att: currentLearner.att,
            res: currentLearner.res,
            dist: currentLearner.dist,
            nc: currentLearner.nc,
            sessionNote: currentLearner.sessionNote
          };

          if (assignedLesson?.features?.notes === false && !same(baseline?.sessionNote, newSnapshot?.sessionNote)) {
            return json({ error: "Notes are disabled for this session" }, 403);
          }

          const assessmentChanged =
            !same(baseline?.res, newSnapshot?.res) ||
            !same(baseline?.dist, newSnapshot?.dist) ||
            !same(baseline?.nc, newSnapshot?.nc);

          if (assessmentChanged && (permissions.assess === false || assignedLesson?.features?.assessment === false)) {
            return json({ error: "Assessment is disabled for this account or session" }, 403);
          }
        }
      }
    }

    const nextRevision = currentRevision + 1;
    const { data: saved, error: saveError } = await adminClient
      .from("organisation_workspaces")
      .update({
        state: nextState,
        revision: nextRevision,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", organisationId)
      .eq("revision", currentRevision)
      .select("revision")
      .maybeSingle();

    if (saveError) throw saveError;
    if (!saved) return json({ ok: false, conflict: true, revision: currentRevision });
    return json({ ok: true, conflict: false, revision: Number(saved.revision) || nextRevision });
  } catch (error) {
    console.error("Stage Flow workspace save failed", error);
    return json({ error: error instanceof Error ? error.message : "Workspace save failed" }, 500);
  }
});
