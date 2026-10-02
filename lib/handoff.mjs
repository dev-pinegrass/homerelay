// Original HomeRelay policy core. Identity must come from the authenticated host,
// never from a model's tool arguments. This module makes no external calls.
export function createTask({ id, owner, title, privateNote = '' }) {
  if (![id, owner, title].every((v) => typeof v === 'string' && v.trim()))
    throw Error('Invalid task');
  return {
    id,
    owner,
    title,
    privateNote,
    version: 1,
    state: 'unassigned',
    responsible: null,
    proposal: null,
    audit: [],
  };
}
function check(t, actor, version) {
  if (version !== t.version) throw Error('stale_version');
  if (actor !== t.owner) throw Error('owner_required');
}
function change(t, event, actor, patch, now) {
  return {
    ...t,
    ...patch,
    version: t.version + 1,
    audit: [
      ...t.audit,
      { event, actor, at: new Date(now).toISOString(), version: t.version + 1 },
    ],
  };
}
export function readTask(t, actor) {
  if (actor === t.owner) return structuredClone(t);
  if (
    t.proposal?.recipient !== actor ||
    !['awaiting_recipient', 'accepted'].includes(t.state)
  )
    throw Error('not_shared');
  // Explicit projection: neither private notes nor internal audit events escape.
  return {
    id: t.id,
    title: t.title,
    version: t.version,
    state: t.state,
    responsible: t.responsible,
    expires: t.proposal.expires,
  };
}
export function propose(
  t,
  { actor, version, recipient, now = Date.now(), expires = now + 1800000 },
) {
  check(t, actor, version);
  if (t.state === 'accepted') throw Error('revoke_before_reassigning');
  if (
    typeof recipient !== 'string' ||
    !recipient.trim() ||
    recipient === t.owner
  )
    throw Error('invalid_recipient');
  if (!Number.isFinite(expires) || expires <= now || expires > now + 1800000)
    throw Error('invalid_expiry');
  return change(
    t,
    'proposed',
    actor,
    { state: 'draft', proposal: { recipient, expires }, responsible: null },
    now,
  );
}
export function approve(t, { actor, version, now = Date.now() }) {
  check(t, actor, version);
  if (t.state !== 'draft') throw Error('draft_required');
  if (now >= t.proposal.expires) throw Error('expired_approval');
  return change(
    t,
    'owner_approved',
    actor,
    { state: 'awaiting_recipient' },
    now,
  );
}
export function respond(t, { actor, version, accept, now = Date.now() }) {
  if (version !== t.version) throw Error('stale_version');
  if (t.state !== 'awaiting_recipient') throw Error('not_awaiting_recipient');
  if (actor !== t.proposal.recipient) throw Error('recipient_required');
  if (now >= t.proposal.expires) throw Error('expired_approval');
  if (typeof accept !== 'boolean') throw Error('explicit_decision_required');
  return change(
    t,
    accept ? 'recipient_accepted' : 'recipient_declined',
    actor,
    {
      state: accept ? 'accepted' : 'declined',
      responsible: accept ? actor : null,
    },
    now,
  );
}
export function revise(t, { actor, version, title, now = Date.now() }) {
  check(t, actor, version);
  if (typeof title !== 'string' || !title.trim()) throw Error('invalid_title');
  return change(
    t,
    'revised',
    actor,
    { title, state: 'unassigned', proposal: null, responsible: null, suggestion: null },
    now,
  );
}
export function revoke(t, { actor, version, now = Date.now() }) {
  check(t, actor, version);
  return change(
    t,
    'revoked',
    actor,
    { state: 'unassigned', proposal: null, responsible: null, suggestion: null },
    now,
  );
}
