import type { Task } from './types';
import { env } from 'cloudflare:workers';
export const bindings = env as unknown as {
  DB: D1Database;
  HOME_BACKEND_URL?: string;
  HOME_BACKEND_TOKEN?: string;
};
export function sandbox(req: Request) {
  const id =
    req.headers.get('oai-authenticated-user-id') ||
    ((import.meta as ImportMeta & { env?: { DEV: boolean } }).env?.DEV
      ? 'local-simulation'
      : null);
  if (!id) throw Error('Sign in to use your private simulation.');
  return id;
}
export async function list(key: string) {
  const r = await bindings.DB.prepare(
    'SELECT payload FROM handoffs WHERE sandbox = ? ORDER BY updated DESC LIMIT 30',
  )
    .bind(key)
    .all<{ payload: string }>();
  return r.results.map((x) => JSON.parse(x.payload) as Task);
}
export async function get(key: string, id: string) {
  const r = await bindings.DB.prepare(
    'SELECT payload FROM handoffs WHERE sandbox = ? AND id = ?',
  )
    .bind(key, id)
    .first<{ payload: string }>();
  if (!r) throw Error('Case not found');
  return JSON.parse(r.payload) as Task;
}
export async function insert(key: string, t: Task) {
  await bindings.DB.prepare(
    'INSERT INTO handoffs (id,sandbox,version,payload,updated) VALUES (?,?,?,?,?)',
  )
    .bind(t.id, key, t.version, JSON.stringify(t), new Date().toISOString())
    .run();
}
export async function save(key: string, previous: Task, next: Task) {
  const r = await bindings.DB.prepare(
    'UPDATE handoffs SET version = ?, payload = ?, updated = ? WHERE id = ? AND sandbox = ? AND version = ?',
  )
    .bind(
      next.version,
      JSON.stringify(next),
      new Date().toISOString(),
      previous.id,
      key,
      previous.version,
    )
    .run();
  if (r.meta.changes !== 1)
    throw Error('This case changed. Refresh before acting.');
}
