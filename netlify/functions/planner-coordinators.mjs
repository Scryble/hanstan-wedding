// HW-PLANNER-001 | Master-only coordinator registry CRUD.

import { validateToken, COORDINATORS_KEY } from "./_planner_lib/auth.mjs";

export default async function handler(request) {
  const auth = await validateToken(request);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error }),
      { status: auth.status, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  if (!auth.isMaster) {
    return new Response(
      JSON.stringify({ error: "master_only" }),
      { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  let coords;
  try {
    const raw = await auth.store.get(COORDINATORS_KEY);
    coords = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "read_failed" }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (request.method === "GET") {
    const list = Object.entries(coords).map(([token, info]) => ({
      token,
      name: info.name,
      isMaster: !!info.isMaster,
      addedAt: info.addedAt,
      addedBy: info.addedBy
    }));
    return new Response(
      JSON.stringify({ coordinators: list }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
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

  const targetToken = (body.token || "").trim();
  if (!targetToken) {
    return new Response(
      JSON.stringify({ error: "token_required" }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (request.method === "POST") {
    if (coords[targetToken]) {
      return new Response(
        JSON.stringify({ error: "token_exists" }),
        { status: 409, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "name_required" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    coords[targetToken] = {
      name: body.name,
      isMaster: false,
      addedAt: new Date().toISOString(),
      addedBy: auth.name
    };
    await auth.store.set(COORDINATORS_KEY, JSON.stringify(coords));
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (request.method === "PUT") {
    if (!coords[targetToken]) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    if (!body.name) {
      return new Response(
        JSON.stringify({ error: "name_required" }),
        { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    coords[targetToken].name = body.name;
    coords[targetToken].updatedAt = new Date().toISOString();
    coords[targetToken].updatedBy = auth.name;
    await auth.store.set(COORDINATORS_KEY, JSON.stringify(coords));
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (request.method === "DELETE") {
    if (!coords[targetToken]) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    if (coords[targetToken].isMaster) {
      return new Response(
        JSON.stringify({ error: "cannot_remove_master" }),
        { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
    delete coords[targetToken];
    await auth.store.set(COORDINATORS_KEY, JSON.stringify(coords));
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    { status: 405, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
