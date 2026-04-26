import { readFile } from "fs/promises";
import { getStore } from "@netlify/blobs";
import { validateTokenString } from "./_planner_lib/auth.mjs";

const BLOB_STORE_NAME = "hanstan-wedding-data";
const META_KEY = "meta/registry-current.json";
const AUDIT_KEY = "planner/audit-log.json";
const MAX_AUDIT_ENTRIES = 5000;
const SEED_PATHS = {
  "data/gifts.json": new URL("../../data/gifts.json", import.meta.url),
  "data/copy.registry.json": new URL("../../data/copy.registry.json", import.meta.url),
  "data/theme.tokens.json": new URL("../../data/theme.tokens.json", import.meta.url),
  "data/ordering.registry.json": new URL("../../data/ordering.registry.json", import.meta.url),
};

// Stage 3 Phase A (2026-04-26) — auth unification helper.
// Accepts: (a) Bearer master coordinator token via auth.mjs; (b) legacy ADMIN_WRITE_TOKEN
// env-var token (Bearer or x-admin-token header) as fallback during migration window.
// Returns {ok, name, isMaster, token, store, viaLegacy} or {ok:false, error, status}.
async function authMasterWriteRegistry(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const xAdmin = request.headers.get("x-admin-token") || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7).trim();
  else if (xAdmin) token = xAdmin.trim();
  if (!token) return { ok: false, error: "no_token", status: 401 };

  // Try canonical coordinator-token validation first
  const coordResult = await validateTokenString(token);
  if (coordResult.ok) {
    if (!coordResult.isMaster) return { ok: false, error: "master_only", status: 403 };
    return { ok: true, name: coordResult.name, isMaster: true, token, store: coordResult.store, viaLegacy: false };
  }

  // Legacy fallback: env-var ADMIN_WRITE_TOKEN
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

function nextVersionId(current, prefix) {
  const num = parseInt(current.slice(1), 10);
  return prefix + String(num + 1).padStart(6, "0");
}

export default async function handler(request, context) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Stage 3 Phase A (2026-04-26) auth unification: accept master coordinator token
  // via Bearer (canonical) OR legacy ADMIN_WRITE_TOKEN env-var token (fallback).
  // Phase E retires the env-var path; until then both work to avoid breaking /admin/
  // standalone mid-build.
  const authResult = await authMasterWriteRegistry(request);
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

  const { mode, payload, client } = body;

  if (mode !== "save_draft" && mode !== "publish_live") {
    return new Response(JSON.stringify({ error: "invalid_mode" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  if (!payload || !client) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const store = getStore(BLOB_STORE_NAME);

    // Step 1: ensure first-run
    const meta = await ensureFirstRun(store);

    // Step 2: optimistic concurrency check
    if (
      client.expectedPublishedVersion !== meta.publishedVersion ||
      client.expectedDraftVersion !== meta.draftVersion
    ) {
      return new Response(
        JSON.stringify({
          error: "version_conflict",
          server: {
            publishedVersion: meta.publishedVersion,
            draftVersion: meta.draftVersion,
          },
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Step 3: compute new version id
    let newDraftVersion = null;
    let newPublishedVersion = null;
    let targetVersion;

    if (mode === "save_draft") {
      newDraftVersion = nextVersionId(meta.draftVersion, "d");
      targetVersion = newDraftVersion;
    } else {
      newPublishedVersion = nextVersionId(meta.publishedVersion, "v");
      targetVersion = newPublishedVersion;
    }

    // Step 4: write the four versioned keys (two-phase commit — write data first)
    const docMap = {
      "data/gifts.json": JSON.stringify(payload.gifts),
      "data/copy.registry.json": JSON.stringify(payload.copy),
      "data/theme.tokens.json": JSON.stringify(payload.theme),
      "data/ordering.registry.json": JSON.stringify(payload.ordering),
    };

    let writeStage = "none";
    try {
      for (const [docKey, docContent] of Object.entries(docMap)) {
        writeStage = docKey;
        await store.set("versions/" + targetVersion + "/" + docKey, docContent);
      }
    } catch (writeErr) {
      return new Response(
        JSON.stringify({ error: "write_failed", stage: writeStage }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Step 5: update meta (atomic commit point)
    const now = Date.now();
    let updatedMeta;

    if (mode === "save_draft") {
      updatedMeta = {
        ...meta,
        draftVersion: newDraftVersion,
        lastDraftSavedAt: now,
        draftHistory: [newDraftVersion, ...meta.draftHistory],
      };
    } else {
      updatedMeta = {
        ...meta,
        publishedVersion: newPublishedVersion,
        lastPublishedAt: now,
        history: [newPublishedVersion, ...meta.history],
      };
    }

    try {
      await store.set(META_KEY, JSON.stringify(updatedMeta));
    } catch (metaErr) {
      return new Response(
        JSON.stringify({ error: "write_failed", stage: META_KEY }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    // Stage 3 Phase A.7 (2026-04-26): audit-log unification.
    // Emit an audit entry so registry write events (gift / registryCopy / themeToken /
    // ordering changes via /admin) land in the same audit log as planner-state changes.
    // The Activity tab renders all of them. Granular per-field diffs would require
    // comparing prev vs new payload — for now we emit a coarse "registry.save_draft"
    // or "registry.publish" entry per write. Phase C may extend with finer-grained
    // entries when the Site Content tab ships.
    try {
      const ts = new Date(now).toISOString();
      const auditEntries = [];
      if (mode === "save_draft") {
        auditEntries.push({
          ts, by: authResult.name,
          entity: "registryDraft",
          action: "registryDraft.save",
          target: newDraftVersion,
          summary: "Registry draft saved: " + newDraftVersion + " (gifts/copy/theme/ordering)",
          viaLegacyAuth: !!authResult.viaLegacy
        });
      } else if (mode === "publish_live") {
        auditEntries.push({
          ts, by: authResult.name,
          entity: "registryPublish",
          action: "registry.publish",
          target: newPublishedVersion,
          summary: "Registry published live: " + newPublishedVersion + " (was " + meta.publishedVersion + ")",
          viaLegacyAuth: !!authResult.viaLegacy
        });
      }
      if (auditEntries.length) await appendAudit(store, auditEntries);
    } catch (auditErr) {
      // Don't fail the write on audit-write failure; just log silently.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        newDraftVersion: newDraftVersion,
        newPublishedVersion: newPublishedVersion,
        meta: updatedMeta,
        viaLegacyAuth: !!authResult.viaLegacy,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
