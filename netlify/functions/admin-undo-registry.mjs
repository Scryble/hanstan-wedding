import { readFile } from "fs/promises";
import { getStore } from "@netlify/blobs";
import { validateTokenString } from "./_planner_lib/auth.mjs";

const BLOB_STORE_NAME = "hanstan-wedding-data";
const META_KEY = "meta/registry-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;

// Stage 3 Phase A (2026-04-26) — auth unification helper.
// Mirrors admin-write-registry.mjs auth strategy: master coordinator OR legacy env-var.
async function authMasterUndoRegistry(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const xAdmin = request.headers.get("x-admin-token") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7).trim();
  else if (xAdmin) token = xAdmin.trim();
  if (!token) return { ok: false, error: "no_token", status: 401 };
  const coordResult = await validateTokenString(token);
  if (coordResult.ok) {
    if (!coordResult.isMaster) return { ok: false, error: "master_only", status: 403 };
    return { ok: true, name: coordResult.name, isMaster: true, token, store: coordResult.store, viaLegacy: false };
  }
  const legacyToken = process.env.ADMIN_WRITE_TOKEN;
  if (legacyToken && token === legacyToken) {
    return { ok: true, name: "admin-write-legacy", isMaster: true, token, store: getStore(BLOB_STORE_NAME), viaLegacy: true };
  }
  return { ok: false, error: "unauthorized", status: 401 };
}

async function appendAudit(store, entries) {
  if (!entries.length) return;
  let log;
  try {
    const raw = await store.get(AUDIT_KEY);
    log = raw ? JSON.parse(raw) : { entries: [] };
  } catch (e) { log = { entries: [] }; }
  log.entries = [...entries.reverse(), ...log.entries];
  if (log.entries.length > MAX_AUDIT_ENTRIES) log.entries = log.entries.slice(0, MAX_AUDIT_ENTRIES);
  await store.set(AUDIT_KEY, JSON.stringify(log));
}
const SEED_PATHS = {
  "data/gifts.json": new URL("../../data/gifts.json", import.meta.url),
  "data/copy.registry.json": new URL("../../data/copy.registry.json", import.meta.url),
  "data/theme.tokens.json": new URL("../../data/theme.tokens.json", import.meta.url),
  "data/ordering.registry.json": new URL("../../data/ordering.registry.json", import.meta.url),
};

async function ensureFirstRun(store) {
  let metaText = await store.get(META_KEY);
  if (metaText) return JSON.parse(metaText);

  const seeds = {};
  for (const [key, path] of Object.entries(SEED_PATHS)) {
    seeds[key] = await readFile(path, "utf-8");
  }

  for (const [key, content] of Object.entries(seeds)) {
    await store.set("versions/v000001/" + key, content);
    await store.set("versions/d000001/" + key, content);
  }

  const now = Date.now();
  const meta = {
    publishedVersion: "v000001",
    draftVersion: "d000001",
    lastPublishedAt: now,
    lastDraftSavedAt: now,
    history: ["v000001"],
    draftHistory: ["d000001"],
    schemaVersion: 1,
  };
  await store.set(META_KEY, JSON.stringify(meta));
  return meta;
}

export default async function handler(request, context) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Stage 3 Phase A (2026-04-26) auth unification: master coordinator OR legacy env-var.
  const authResult = await authMasterUndoRegistry(request);
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (body.mode !== "undo_publish") {
    return new Response(JSON.stringify({ error: "invalid_mode" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const store = getStore(BLOB_STORE_NAME);
    const meta = await ensureFirstRun(store);

    if (!meta.history || meta.history.length < 2) {
      return new Response(JSON.stringify({ error: "no_undo" }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const prevVersion = meta.history[1];
    const newHistory = meta.history.slice(1);

    const updatedMeta = {
      ...meta,
      publishedVersion: prevVersion,
      lastPublishedAt: Date.now(),
      history: newHistory,
    };

    await store.set(META_KEY, JSON.stringify(updatedMeta));

    return new Response(JSON.stringify({ ok: true, meta: updatedMeta }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
