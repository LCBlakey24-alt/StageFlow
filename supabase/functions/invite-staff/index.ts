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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);

    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const url = Deno.env.get("SUPABASE_URL");

    if (!url || !publishableKey || !secretKey) return json({ error: "Stage Flow account service is not configured" }, 500);

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: caller } = await userClient
      .from("staff_members")
      .select("id, organisation_id, role, is_active")
      .eq("auth_user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!caller) return json({ error: "Staff profile not found" }, 403);
    if (!["owner", "admin"].includes(caller.role)) return json({ error: "Admin access required" }, 403);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    const role = body.role === "admin" ? "admin" : "coach";
    const permissions = body.permissions && typeof body.permissions === "object" ? body.permissions : {};
    const redirectTo = String(body.redirectTo || "").trim();

    if (!email || !/^\\S+@\\S+\\.\\S+$/.test(email)) return json({ error: "Enter a valid email address" }, 400);
    if (!displayName) return json({ error: "Enter the staff member's name" }, 400);

    const { data: existingStaff } = await userClient
      .from("staff_members")
      .select("id")
      .eq("organisation_id", caller.organisation_id)
      .ilike("email", email)
      .maybeSingle();
    if (existingStaff) return json({ error: "That email is already linked to this organisation" }, 409);

    const { data: invitation, error: invitationError } = await userClient
      .from("staff_invitations")
      .insert({
        organisation_id: caller.organisation_id,
        email,
        display_name: displayName,
        role,
        permissions,
        invited_by: userData.user.id,
      })
      .select("id, email, display_name, role, expires_at")
      .single();
    if (invitationError) throw invitationError;

    const options: Record<string, unknown> = { data: { full_name: displayName } };
    if (redirectTo) options.redirectTo = redirectTo;

    const { data: authInvite, error: authInviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, options);

    if (authInviteError) {
      await adminClient.from("staff_invitations").delete().eq("id", invitation.id);
      return json({ error: authInviteError.message || "Could not send invitation" }, 400);
    }

    return json({ ok: true, invitation, authUserId: authInvite.user?.id || null });
  } catch (error) {
    console.error("Stage Flow staff invite failed", error);
    return json({ error: error instanceof Error ? error.message : "Invitation failed" }, 500);
  }
});
