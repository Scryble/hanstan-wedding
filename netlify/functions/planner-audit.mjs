// HW-PLANNER-001 | Read audit log. Any valid coordinator can read (L19).

import { validateToken } from "./_planner_lib/auth.mjs";

const AUDIT_KEY = "planner/audit-log.json";

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  const auth = await validateToken(request);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error }),
      { status: auth.status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  try {
    const raw = await auth.store.get(AUDIT_KEY);
    const log = raw ? JSON.parse(raw) : { entries: [] };
    const url = new URL(request.url, "http://localhost");
    const limit = parseInt(url.searchParams.get("limit") || "500", 10);
    const safeLimit = Math.max(1, Math.min(5000, limit));
    return new Response(
      JSON.stringify({ entries: log.entries.slice(0, safeLimit) }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "read_failed", detail: e.message }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
