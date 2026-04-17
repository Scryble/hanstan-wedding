// HW-PLANNER-001 | POST {token} → {name, isMaster}
// Used by the gate screen on initial load and after sign-out.

import { validateTokenString } from "./_planner_lib/auth.mjs";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  const token = (body.token || "").trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "token_required" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  // Audit fix F-5: call validateTokenString directly instead of faking a Request
  const result = await validateTokenString(token);
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: result.status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  return new Response(
    JSON.stringify({ name: result.name, isMaster: result.isMaster }),
    { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
