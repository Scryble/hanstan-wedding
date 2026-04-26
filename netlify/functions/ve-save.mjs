import { getStore } from "@netlify/blobs";
import { validateTokenString } from "./_planner_lib/auth.mjs";

const PLANNER_STORE_NAME = "hanstan-wedding-data";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;

// Stage 3 Phase A (2026-04-26) — auth unification helper.
// Accepts: (a) Bearer master coordinator token via auth.mjs (canonical);
//          (b) legacy x-admin-token header with ADMIN_WRITE_TOKEN env-var (fallback during migration);
//          (c) Bearer master coordinator token (alternative to (a) for clients already speaking Bearer).
async function authVeSave(req) {
  const authHeader = req.headers.get("Authorization") || "";
  const xAdmin = req.headers.get("x-admin-token") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7).trim();
  else if (xAdmin) token = xAdmin.trim();
  if (!token) return { ok: false, error: "no_token", status: 401 };

  // Try canonical coordinator-token validation
  const coordResult = await validateTokenString(token);
  if (coordResult.ok) {
    if (!coordResult.isMaster) return { ok: false, error: "master_only", status: 403 };
    return { ok: true, name: coordResult.name, isMaster: true, token, viaLegacy: false };
  }

  // Legacy fallback
  const legacyToken = (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get("ADMIN_WRITE_TOKEN")) || process.env.ADMIN_WRITE_TOKEN;
  if (legacyToken && token === legacyToken) {
    return { ok: true, name: "admin-write-legacy", isMaster: true, token, viaLegacy: true };
  }
  return { ok: false, error: "Unauthorized", status: 401 };
}

async function appendPlannerAudit(entries) {
  if (!entries.length) return;
  const plannerStore = getStore(PLANNER_STORE_NAME);
  let log;
  try {
    const raw = await plannerStore.get(AUDIT_KEY);
    log = raw ? JSON.parse(raw) : { entries: [] };
  } catch (e) { log = { entries: [] }; }
  log.entries = [...entries.reverse(), ...log.entries];
  if (log.entries.length > MAX_AUDIT_ENTRIES) log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
  await plannerStore.set(AUDIT_KEY, JSON.stringify(log));
}

export default async function handler(req) {
  const store = getStore("ve-overrides");
  const url = new URL(req.url, "http://localhost");
  const type = url.searchParams.get("type");

  // GET — serve CSS or elements manifest (public, no auth) — unchanged from pre-Stage-3.
  if (req.method === "GET") {
    try {
      if (type === "elements") {
        const data = await store.get("elements.json");
        return new Response(data || "[]", { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" } });
      }
      const css = await store.get("overrides.css");
      return new Response(css || "/* no overrides */", { status: 200, headers: { "Content-Type": "text/css", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" } });
    } catch (e) {
      return new Response(type === "elements" ? "[]" : "/* no overrides */", { status: 200, headers: { "Content-Type": type === "elements" ? "application/json" : "text/css" } });
    }
  }

  // POST — save (Stage 3 Phase A auth: master coordinator OR legacy env-var)
  if (req.method === "POST") {
    const authResult = await authVeSave(req);
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.status, headers: { "Content-Type": "application/json" } });
    }
    try {
      const body = await req.json();
      if (body.css !== undefined) await store.set("overrides.css", body.css);
      if (body.elements !== undefined) await store.set("elements.json", JSON.stringify(body.elements));
      if (body.settings !== undefined) await store.set("settings.json", JSON.stringify(body.settings));
      // Revision history
      if (body.css !== undefined) {
        const ts = new Date().toISOString();
        const revKey = "rev-" + ts.replace(/[:.]/g, "-");
        await store.set(revKey, JSON.stringify({ timestamp: ts, css: body.css, elements: body.elements || [], settings: body.settings || {} }));
        let manifest = [];
        try { const raw = await store.get("revisions-manifest"); if (raw) manifest = JSON.parse(raw); } catch (e) {}
        manifest.push({ key: revKey, timestamp: ts });
        if (manifest.length > 30) { for (const r of manifest.splice(0, manifest.length - 30)) { try { await store.delete(r.key); } catch (e) {} } }
        await store.set("revisions-manifest", JSON.stringify(manifest));
      }

      // Stage 3 Phase A.7 (2026-04-26): audit-log unification.
      // Emit a planner-side audit entry so CSS-override saves land in the same
      // audit-log.json as planner-state changes (write-path consolidation per
      // DDQ-S3-1). Per Scrybal's 2026-04-26 directive ("audit at promote-to-baseline
      // time, not per-tweak") the existing per-save behavior IS the per-tweak event;
      // the promote-to-baseline event will be a separate Stage-3-Phase-C action when
      // the Site Content tab CSS-promotion tool ships. For now, every ve-save.mjs
      // POST emits one entry. If volume gets noisy, batch later.
      try {
        const ts = new Date().toISOString();
        const auditEntries = [];
        if (body.css !== undefined) {
          const cssLen = (body.css || "").length;
          auditEntries.push({
            ts, by: authResult.name,
            entity: "cssOverride",
            action: "cssOverride.set",
            target: "overrides.css",
            field: "css",
            summary: "CSS overrides saved (" + cssLen + " char" + (cssLen === 1 ? "" : "s") + ")",
            viaLegacyAuth: !!authResult.viaLegacy
          });
        }
        if (body.elements !== undefined) {
          auditEntries.push({
            ts, by: authResult.name,
            entity: "cssOverride",
            action: "cssOverride.elements",
            target: "elements.json",
            field: "elements",
            summary: "Visual editor element selectors updated (" + (Array.isArray(body.elements) ? body.elements.length : 0) + ")",
            viaLegacyAuth: !!authResult.viaLegacy
          });
        }
        if (auditEntries.length) await appendPlannerAudit(auditEntries);
      } catch (auditErr) { /* don't fail the save on audit-write failure */ }

      return new Response(JSON.stringify({ ok: true, viaLegacyAuth: !!authResult.viaLegacy }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // PATCH — revision operations (Stage 3 Phase A auth: master coordinator OR legacy env-var)
  if (req.method === "PATCH") {
    const authResult = await authVeSave(req);
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.status, headers: { "Content-Type": "application/json" } });
    }
    try {
      const body = await req.json();
      if (body.action === "list") {
        const raw = await store.get("revisions-manifest");
        return new Response(raw || "[]", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (body.action === "restore" && body.key) {
        const rev = await store.get(body.key);
        if (!rev) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
        const parsed = JSON.parse(rev);
        await store.set("overrides.css", parsed.css || "");
        if (parsed.elements) await store.set("elements.json", JSON.stringify(parsed.elements));
        await store.set("settings.json", JSON.stringify(parsed.settings || {}));
        return new Response(JSON.stringify({ ok: true, settings: parsed.settings }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
  return new Response("Method not allowed", { status: 405 });
}
export const config = { path: "/.netlify/functions/ve-save" };
