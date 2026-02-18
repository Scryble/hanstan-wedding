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

export default async function handler(request, context) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const store = getStore(BLOB_STORE_NAME);
    const meta = await ensureFirstRun(store);
    const content = await store.get(
      "versions/" + meta.publishedVersion + "/data/gifts.json"
    );

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
