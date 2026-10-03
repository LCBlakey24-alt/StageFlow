import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(
  JSON.stringify({
    error: "This Stage Flow endpoint has been retired. Structured organisation tables are now used."
  }),
  {
    status: 410,
    headers: { "Content-Type": "application/json" }
  }
));
