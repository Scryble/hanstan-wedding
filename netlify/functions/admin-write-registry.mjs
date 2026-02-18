import { readFile } from "fs/promises";
import { getStore } from "@netlify/blobs";

const BLOB_STORE_NAME = "hanstan-wedding-data";
const META_KEY = "meta/registry-current.json";
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

  // Auth
  const authHeader = request.headers.get("Authorization") || "";
  const expectedToken = process.env.ADMIN_WRITE_TOKEN;
  if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedToken) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
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

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        newDraftVersion: newDraftVersion,
        newPublishedVersion: newPublishedVersion,
        meta: updatedMeta,
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
