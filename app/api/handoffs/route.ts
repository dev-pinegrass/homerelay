import type { Suggestion } from '@/lib/types';
import { bindings, sandbox, list, get, insert, save } from '@/lib/store';
import {
  createTask,
  propose,
  approve,
  respond,
  revise,
  revoke,
  readTask,
} from '@/lib/handoff.mjs';
const calendars = [
  {
    actor: 'adult-a',
    name: 'Alex',
    available: false,
    detail: 'Away at work during the repair visit.',
  },
  {
    actor: 'adult-b',
    name: 'Sam',
    available: true,
    detail: 'Available at home, subject to explicit acceptance.',
  },
];
const configured = () =>
  Boolean(bindings.HOME_BACKEND_URL && bindings.HOME_BACKEND_TOKEN);
async function result(key: string) {
  return Response.json(
    {
      tasks: (await list(key)).map((task) => {
        delete task.privateNote;
        return task;
      }),
      calendars,
      live: configured(),
      simulation: true,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
export async function GET(req: Request) {
  try {
    return await result(sandbox(req));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 401 });
  }
}
export async function POST(req: Request) {
  try {
    if (
      req.headers.get('origin') &&
      req.headers.get('origin') !== new URL(req.url).origin
    )
      return Response.json(
        { error: 'Cross-origin request rejected' },
        { status: 403 },
      );
    const key = sandbox(req),
      raw = await req.text();
    if (raw.length > 12000) throw Error('Input too large');
    const b = JSON.parse(raw),
      actor = b.actor;
    if (!['adult-a', 'adult-b'].includes(actor))
      throw Error('Choose a simulation role');
    if (b.action === 'create') {
      if (actor !== 'adult-a') throw Error('Owner role required');
      if (typeof b.title !== 'string' || b.title.length > 1000)
        throw Error('Invalid task title');
      await insert(
        key,
        createTask({
          id: crypto.randomUUID(),
          owner: 'adult-a',
          title: b.title,
          privateNote: 'Synthetic private note: the spare key stays with Alex.',
        }),
      );
      return result(key);
    }
    const previous = await get(key, b.id);
    if (b.action === 'read') {
      return Response.json({ task: readTask(previous, actor) });
    }
    if (b.action === 'suggest') {
      if (actor !== 'adult-a') throw Error('Owner role required');
      if (b.version !== previous.version) throw Error('stale_version');
      let suggestion: Suggestion;
      if (b.mode === 'fixture')
        suggestion = {
          recipient: 'adult-b',
          reason:
            'The synthetic calendar shows Sam available. Acceptance is still required.',
          trace: [
            { tool: 'get_task', result: previous.title },
            { tool: 'list_availability', result: calendars },
          ],
          mode: 'fixture',
        };
      else {
        if (!configured())
          throw Error(
            'Live Bedrock setup is pending. Use the labeled practice planner.',
          );
        const url = new URL(bindings.HOME_BACKEND_URL!);
        if (
          url.protocol !== 'https:' ||
          !url.hostname.endsWith('.lambda-url.us-east-1.on.aws')
        )
          throw Error('Invalid backend URL');
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: 'Bearer ' + bindings.HOME_BACKEND_TOKEN,
          },
          body: JSON.stringify({
            task: {
              id: previous.id,
              title: previous.title,
              version: previous.version,
            },
            calendars,
          }),
          signal: AbortSignal.timeout(55000),
        });
        if (!r.ok)
          throw Error('Live planner unavailable; no approval was recorded');
        suggestion = (await r.json()) as Suggestion;
        suggestion.mode = 'bedrock';
      }
      if (
        suggestion.recipient !== 'adult-b' ||
        !calendars.find((c) => c.actor === suggestion.recipient)?.available
      )
        throw Error('Planner did not find an available recipient');
      // A suggestion remains a draft. Model output can never approve or accept.
      const next = propose(previous, {
        actor,
        version: b.version,
        recipient: suggestion.recipient,
      });
      next.suggestion = suggestion;
      await save(key, previous, next);
      return result(key);
    }
    const args = {
      actor,
      version: b.version,
      title: b.title,
      accept: b.action === 'accept',
    };
    let next;
    if (b.action === 'approve') next = approve(previous, args);
    else if (['accept', 'decline'].includes(b.action))
      next = respond(previous, args);
    else if (b.action === 'revise') next = revise(previous, args);
    else if (b.action === 'revoke') next = revoke(previous, args);
    else throw Error('Unknown action');
    await save(key, previous, next);
    return result(key);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
