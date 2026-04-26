// HW-PLANNER-001 | Stage 3 Phase A — public read of CSS overrides for the planner UI
// Mirrors ve-save.mjs's GET behavior but as a separate endpoint so Stage 3 client UI
// can fetch overrides without conflating with the writer endpoint surface.
// Public, no auth — same as ve-save.mjs GET. Cache-Control: no-cache so freshly-saved
// overrides land immediately on the next page load.

import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const store = getStore("ve-overrides");
  const url = new URL(req.url, "http://localhost");
  const type = url.searchParams.get("type");
  try {
    if (type === "elements") {
      const data = await store.get("elements.json");
      return new Response(data || "[]", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (type === "settings") {
      const data = await store.get("settings.json");
      return new Response(data || "{}", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const css = await store.get("overrides.css");
    return new Response(css || "/* no overrides */", {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response(type === "elements" ? "[]" : (type === "settings" ? "{}" : "/* no overrides */"), {
      status: 200,
      headers: { "Content-Type": type === "elements" || type === "settings" ? "application/json" : "text/css" }
    });
  }
}

export const config = { path: "/.netlify/functions/ve-overrides-read" };
