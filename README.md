# HomeRelay

A simulated Alexa+ household handoff, built for the Amazon Developer hackathon. Amazon Nova Lite reads two bounded tools and proposes an available recipient. The app saves a draft; the owner must approve sharing, and the recipient must separately accept responsibility.

## Scope

Both adult roles belong to one signed-in user's private simulation. The role switch is a demonstration control, not separate adult authentication. Calendars are synthetic. No Alexa device, real calendar, messages, reminders or task completion are connected. Private notes are excluded from the workspace response and from model inputs.

## Run

Use Node 22.13+ and npm. Run `npm ci`, apply the migration with `npx wrangler d1 migrations apply site-creator-d1 --local --config wrangler.local.json`, then `npm run dev -- --port 3121`. Local development uses a single simulation workspace. Production requires the authenticated user header supplied by the hosting platform; do not expose this worker behind an untrusted header-forwarding proxy.

Run `npm run test:unit` for policy checks. With the dev server running, `npm test` also exercises D1 persistence, concurrent approval and HTTP origin rejection. Run `npx tsc --noEmit`, `npx oxlint app lib --deny-warnings`, and `npm run build` for application validation.

The migration is in `drizzle/`. If Wrangler cannot find it, apply its SQL with `npx wrangler d1 execute site-creator-d1 --local --config wrangler.local.json --file drizzle/0000_flaky_may_parker.sql`.

## Live planner

The server reads `HOME_BACKEND_URL` and secret `HOME_BACKEND_TOKEN`. Configure them in hosting secrets (or ignored `.dev.vars` for local development). Never put AWS credentials in this app. `aws-backend/template.json` defines the scoped Lambda role and Nova Lite invocation permission. Its NoEcho token parameter must be supplied securely. Choose a unique stack/function name for your own deployment; the template currently records this project's name. Regenerate inline Lambda code with `node aws-backend/prepare.cjs` after editing it.

The live tool set is `get_task`, `list_availability`, and `propose_handoff`. Approval and acceptance are deterministic application actions unavailable to the model. The planner has four rounds and a timeout. Failures leave responsibility unassigned and do not silently fall back to practice.

## Evidence and limitations

Eight local tests pass: six policy checks and two HTTP workflows. These cover exact-version approval, expiration, private-field projection, wrong-role actions, revocation and concurrent approval. Synthetic practice is explicitly labeled. Model selection quality has not been benchmarked across 20 requests. Browser interaction and WebMCP execution have not been verified. Hosted access is initially private; judging access and a public video remain submission tasks.

Original project work began September 6, 2026. Runtime scaffold and UI primitives come from Sites, React and shadcn; their licenses remain applicable. The Lambda template was adapted from this workspace's ListingProof deployment structure; HomeRelay's tool loop, state machine and interface are separate work. MIT license applies to original source.

Live evidence: `evidence/live-handoff.json` records a successful local HTTP → Lambda → Bedrock → D1 run, including all three model-selected tools, draft state, owner approval and recipient acceptance. This is one synthetic integration check, not a model quality benchmark.

September 13 evaluation: 20/20 development-authored paraphrases passed the live Bedrock tool trace and recipient check over one fixed synthetic availability scenario. See evidence/planner-evaluation-20260913.json. This is not a held-out benchmark or evidence of real household success. Run tests/live-planner.mjs only with deliberate live provider access; it is excluded from default tests.
