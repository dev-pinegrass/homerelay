'use client';
import { useEffect, useState, useRef } from 'react';
import { registerReader } from '@/lib/webmcp';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Task } from '@/lib/types';
export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]),
    [role, setRole] = useState('adult-a'),
    [title, setTitle] = useState(
      'The repair visit moved to 4 PM. Find someone who can be home.',
    ),
    [live, setLive] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function refresh() {
    const r = await fetch('/api/handoffs');
    const d = (await r.json()) as {
      tasks: Task[];
      live: boolean;
      error?: string;
    };
    if (!r.ok) throw Error(d.error);
    setTasks(d.tasks);
    setLive(d.live);
  }
  useEffect(() => {
    let active = true;
    fetch('/api/handoffs')
      .then(
        (r) =>
          r.json() as Promise<{ tasks: Task[]; live: boolean; error?: string }>,
      )
      .then((d) => {
        if (!active) return;
        if (d.error) throw Error(d.error);
        setTasks(d.tasks);
        setLive(d.live);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function action(operation: string, t?: Task, mode?: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/handoffs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: operation,
          actor: role,
          id: t?.id,
          version: t?.version,
          title,
          mode,
        }),
      });
      const d = (await r.json()) as {
        tasks: Task[];
        live: boolean;
        error?: string;
      };
      if (!r.ok) throw Error(d.error);
      setTasks(d.tasks);
      setLive(d.live);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportTask(t: Task) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ simulation: true, ...t }, null, 2)], {
        type: 'application/json',
      }),
    );
    a.download = 'homerelay-' + t.id + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const selected = tasks[0];
  const current = useRef<unknown>(null);
  useEffect(() => {
    current.current = { tasks, role, simulation: true };
  }, [tasks, role]);
  useEffect(() => registerReader(() => current.current), []);
  return (
    <main>
      <header>
        <h1>
          HomeRelay<span style={{ color: '#006d91' }}> / </span>Household
          handoffs
        </h1>
        <span className="mode">
          Simulated Alexa+ experience · no messages sent
        </span>
      </header>
      <div className="workspace">
        <section className="panel">
          <div className="step">01 / ASK & REVIEW</div>
          <h2>Who can take the handoff?</h2>
          <p>
            Try both household roles in your private simulation. A proposal
            becomes responsibility only when its recipient accepts.
          </p>
          <Tabs value={role} onValueChange={(v) => setRole(String(v))}>
            <TabsList>
              <TabsTrigger disabled={busy} value="adult-a">
                Alex · owner
              </TabsTrigger>
              <TabsTrigger disabled={busy} value="adult-b">
                Sam · recipient
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <label htmlFor="request">Household request</label>
          <Textarea
            disabled={busy}
            id="request"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <div className="actions">
            <Button
              disabled={busy || role !== 'adult-a' || !title.trim()}
              onClick={() => action('create')}
            >
              Create handoff
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Refresh
            </Button>
          </div>
          <div className="calendars">
            <div>
              <strong>Alex</strong>
              <p>At work · unavailable</p>
            </div>
            <div>
              <strong>Sam</strong>
              <p>At home · may accept</p>
            </div>
          </div>
          <small>
            Synthetic calendar data. This is not connected to a household
            calendar or Alexa device.
          </small>
        </section>
        <section className="panel">
          <div className="step">02 / DECIDE</div>
          <h2>Current handoff</h2>
          {!selected ? (
            <p>Create a request to start. Nothing is assigned yet.</p>
          ) : (
            <>
              <span className="state">
                {selected.state.replaceAll('_', ' ')}
              </span>
              <h3>{selected.title}</h3>
              <small>
                Version {selected.version} ·{' '}
                {selected.proposal
                  ? 'Proposal expires ' +
                    new Date(selected.proposal.expires).toLocaleTimeString()
                  : 'No active proposal'}
              </small>
              {selected.suggestion && (
                <div className="quote">
                  <p>{selected.suggestion.reason}</p>
                  <small>
                    {selected.suggestion.mode === 'bedrock'
                      ? 'Live Bedrock planner'
                      : 'Synthetic practice planner'}
                  </small>
                </div>
              )}
              <div className="actions">
                {role === 'adult-a' && (
                  <>
                    <Button
                      disabled={busy || selected.state === 'accepted'}
                      onClick={() =>
                        action(
                          'suggest',
                          selected,
                          live ? 'bedrock' : 'fixture',
                        )
                      }
                    >
                      {live ? 'Ask AI for a handoff' : 'Run practice planner'}
                    </Button>
                    {live && (
                      <Button
                        variant="outline"
                        disabled={busy || selected.state === 'accepted'}
                        onClick={() => action('suggest', selected, 'fixture')}
                      >
                        Practice planner
                      </Button>
                    )}
                    <Button
                      disabled={busy || selected.state !== 'draft'}
                      onClick={() => action('approve', selected)}
                    >
                      Approve sharing with Sam
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => action('revise', selected)}
                    >
                      Replace with edited request
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => action('revoke', selected)}
                    >
                      Revoke handoff
                    </Button>
                  </>
                )}
                {role === 'adult-b' && (
                  <>
                    <Button
                      disabled={busy || selected.state !== 'awaiting_recipient'}
                      onClick={() => action('accept', selected)}
                    >
                      Accept responsibility
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || selected.state !== 'awaiting_recipient'}
                      onClick={() => action('decline', selected)}
                    >
                      Decline
                    </Button>
                  </>
                )}
              </div>
              {selected.state === 'accepted' && (
                <p>
                  <strong>Sam accepted responsibility.</strong> The household
                  task itself is not marked completed.
                </p>
              )}
              <Button variant="outline" onClick={() => exportTask(selected)}>
                Export simulation receipt
              </Button>
            </>
          )}
        </section>
        {error && (
          <div className="error wide" role="alert">
            {error}
          </div>
        )}
        <section className="panel wide">
          <div className="step">03 / TRACE</div>
          <h2>Decisions stay visible</h2>
          {busy && <output>Working…</output>}
          {selected ? (
            <ol className="audit">
              {selected.audit.map((a, i) => (
                <li key={i}>
                  {a.event.replaceAll('_', ' ')} ·{' '}
                  {a.actor === 'adult-a' ? 'Alex' : 'Sam'} ·{' '}
                  {new Date(a.at).toLocaleString()}
                </li>
              ))}
            </ol>
          ) : (
            <p>No decisions yet.</p>
          )}
          <details>
            <summary>Earlier cases ({Math.max(0, tasks.length - 1)})</summary>
            {tasks.slice(1).map((t) => (
              <div className="task" key={t.id}>
                {t.title} · {t.state}
                <Button variant="link" onClick={() => exportTask(t)}>
                  Export
                </Button>
              </div>
            ))}
          </details>
        </section>
      </div>
      <footer>
        Private role simulation. Each signed-in user has a separate saved
        workspace. No actual calendar changes, invitations, reminders or device
        actions.
      </footer>
    </main>
  );
}
