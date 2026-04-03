import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  const store = getStore("ve-overrides");
  const url = new URL(req.url, "http://localhost");
  const type = url.searchParams.get("type");

  // GET — serve CSS or elements manifest (public, no auth)
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

  // POST — save (auth required)
  if (req.method === "POST") {
    const token = req.headers.get("x-admin-token");
    if (!token || token !== Netlify.env.get("ADMIN_WRITE_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // PATCH — revision operations (auth required)
  if (req.method === "PATCH") {
    const token = req.headers.get("x-admin-token");
    if (!token || token !== Netlify.env.get("ADMIN_WRITE_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
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
