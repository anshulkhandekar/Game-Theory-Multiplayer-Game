# Railway workshop deployment

Checked October 13, 2026 against the current source and Railway documentation. No cloud deployment or purchase has been made. The repository file is HOSTING_GUIDE.md (there is no hosting.md).

## Deploy one service

1. Commit the source and supporting files listed below and push to a private GitHub repository. In Railway choose **New Project → Deploy from GitHub repo**, authorize access to that private repository and select its deployment branch. The repository root is the service root. Railway can deploy the entire app as one service; no separate frontend service or database is needed.
2. Create a Railway Hobby project and deploy the repository as one Node service. The repository pins Node 22.12–22.x. Build command: `npm ci && npm run build`. Start command: `node server/index.js`. Running Node directly makes graceful SIGTERM handling straightforward.
3. Add a persistent volume mounted at `/data`. Keep **one replica**: the active room lives in one process and the JSON score file is not a distributed database.
4. Set these service variables privately:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `STATE_FILE` | `/data/workshop.json` |
   | `EVENT_CODE` | A strong attendee code, at least 8 characters |
   | `HOST_KEY` | An independent random secret, preferably 32+ characters (minimum 16) |
   | `SPECTATOR_KEY` | Another independent random secret, preferably 32+ characters (minimum 16) |

   All three secrets must differ. Generate each administrative secret locally with `openssl rand -hex 24`. Let Railway supply `PORT`. Do not set `CLIENT_DIST`; it defaults to the built `dist` directory.
5. Choose a region near the workshop. Start with a 1-vCPU / 1-GB resource ceiling if configuring limits; actual consumption is billed. Watch CPU, RAM and network graphs in the service Metrics tab during rehearsal. Disable Serverless/sleep for the live event. Set the healthcheck path to `/health`, then generate a public Railway domain. Railway terminates HTTPS; the browser automatically connects with WSS.
6. Open the homepage and enter the event code. Open `/?view=host` and enter the host key; open `/?view=projector` and enter the spectator key. Keys go in sign-in forms, never URL query strings or QR codes. Share only the attendee code with participants. Cookies last 12 hours; changing any secret invalidates existing access cookies after restart.
7. Rehearse with two physical devices on the actual workshop Wi-Fi. Confirm joining, a short round, projector, reconnect, and retained scores after an intentional restart **between rounds**. Before the actual event, switch to a fresh state filename on the same volume so rehearsal profiles do not affect rankings. Do not delete the old score file.
8. Disable automatic deployments during play. Once attendees have joined, use **Close new-player registration** in the host controls. Existing identities can still return, subject to capacity. After the event, download a private backup and stop the service; cancel/downgrade the monthly subscription if no longer needed.

Official references: [Express/GitHub deployment](https://docs.railway.com/guides/express), [volume constraints and backups](https://docs.railway.com/volumes/reference), [public networking and WebSockets](https://docs.railway.com/networking/public-networking/specs-and-limits).

## Budget

Railway Hobby costs a $5 monthly minimum including $5 of usage. Current rates include $10/GB-month RAM, $20/vCPU-month CPU, $0.05/GB outbound traffic, and $0.15/GB-month volume storage. This is a subscription, not a one-hour purchase. [Official pricing](https://docs.railway.com/pricing/plans).

The updated 40-client compressed Battlefield rehearsal received 266.6 MB in 92.1 seconds. Holding that exact traffic rate for 30–60 minutes would produce approximately 5.2–10.4 GB of egress, or **$0.26–$0.52**, plus initial assets and compute/storage. This extrapolation is not a Railway measurement or guaranteed bill. One short workshop should plausibly remain within the included $5 usage and below the $10 target, assuming no substantial other account usage or prolonged uptime.

Set a **$5 Compute usage alert** and, if acceptable, a **$10 Compute hard limit**, accounting for other workspace workloads. Railway's current minimum hard limit is $10; the previous $5 hard-limit instruction was incorrect. A hard ceiling of exactly $5 is not available through this control. Reaching it stops workloads and can interrupt the workshop. The provider limit is the billing safeguard; app rate limits do not cap Internet download/DDoS costs. [Cost controls](https://docs.railway.com/pricing/cost-control).

## Data, recovery, and privacy

The browser runs the Three.js scene, controls, audio, tutorials and UI. Vite packages those assets. Browser local storage holds the reconnect token, name/outfit, graphics/audio choices and tutorial progress. Access is stored separately in a signed HttpOnly, Secure, SameSite cookie in production. Browser storage is not the score authority.

Express serves the client; `ws` carries real-time inputs and snapshots. The Node game logic owns movement validation, round timing, private cards/orders and scoring. It writes identities, appearances, scores, participation/prize flags and registration-lock state to `STATE_FILE`. There is no separate database service. Ordinary writes coalesce over 250ms; scoring/phase changes and SIGTERM flush. Atomic replacement and a `.bak` of the previous valid state protect against partial writes. The backup is one rolling local copy; also use volume/offsite backups.

Malformed saved state stops startup rather than silently overwriting scores. Runtime save failure leaves the room running, displays a host warning, and makes `/health` return 503. Investigate disk permissions/space and restore a validated private backup if needed; never erase the failing file as a quick repair. Saved files contain reconnect credentials and must remain private.

A transient disconnect reserves a player's place for 30 seconds, with jittered retries. Refreshing the same browser origin retains identity. Clearing storage, using another browser, or changing domains loses that local identity. A server restart preserves saved scores but returns the live activity to the lobby; it does not resume cards, orders or the current round. Avoid restarts/deployments during play.

Production gates both assets and sockets. Unjoined sockets do not receive live room data. Read-only viewers are limited to four. Capacity is 40 connected/reserved participants, 300 stored non-demo profiles and 96 sockets, with four additional slots available to host credentials. Existing tokens cannot bypass the player cap. Close registration to prevent fresh identities after attendance is settled. Shared event codes deter uninvited traffic but are not individual identity verification; an attendee can share a code or impersonate names.

Existing 4KB payload limits, action/input budgets, heartbeat/backpressure limits, server-side validation, host authorization and private-card/order isolation remain. Purchases have per-actor quotas and resource requests have per-team limits. Host metrics show raw snapshot traffic, which differs from compressed billed egress. `/health` discloses availability only. These protections are not a guarantee against denial of service or all vulnerabilities.

## What to commit

Required runtime/build files: `index.html`, `package.json`, **`package-lock.json`**, all of `src/`, `shared/`, `server/`, and `public/`. Include all new source modules shown by `git status`; copying only modified tracked files omits critical new imports. `public/assets/*.png` and `public/audio/*.mp3` are used by the game and must stay.

Also commit `.gitignore`, `.env.example`, `tests/` and the Markdown guides/handoff/performance notes, including `ASSET_NOTES.md`. The tests are reusable regression/load tools, not disposable test output. Existing `.agents/` skill files and `skills-lock.json` are optional developer tooling; they can remain tracked, but Railway does not need them.

Exclude `.env`/other secret env files, `data/` (scores and reconnect credentials), `node_modules/`, `dist/`, screenshots, logs, coverage and temporary files. Railway installs dependencies and builds `dist` itself. Cleanup removed 30 review screenshots and kept the real artwork/audio and saved scores. Historical screenshot references in older handoff entries refer to removed review output. Artwork provenance was moved from `artifacts/datathon-asset-notes.md` to `ASSET_NOTES.md`.

From the repository root, review and commit:

```bash
git status --short
git add -A
git diff --cached --stat
git diff --cached --name-only
git commit -m "Prepare polished workshop activity for Railway hosting"
git push
```

`git add -A` includes the screenshot deletions and all new modules. Before committing, confirm the staged file list contains no private configuration or state. Nothing has been staged, committed or pushed by this cleanup pass. Deleting a tracked screenshot removes it from the new tree, not from old Git history.

## Local operation

The latest source and production build include the polish passes. The existing development server remains on port 3000 with the local testing key `local-workshop-host` and state `data/local-test.json`. Private `.env` and officer state have not been edited. Restart locally, between test rounds, with:

```bash
NODE_ENV=development PORT=3000 EVENT_CODE='' SPECTATOR_KEY='' HOST_KEY='local-workshop-host' STATE_FILE='data/local-test.json' npm run dev
```

`.env` is not automatically loaded by npm's dev/start commands. For an explicit local production rehearsal, build first and run `node --env-file=.env server/index.js` with distinct production secrets configured. Never expose the development key or ungated development mode publicly. On Railway, configure secrets in the service Variables tab instead of uploading `.env`.

## Fifty to sixty participants

No 50-player benchmark was run. Based on the successful 40-client rehearsals, 50 likely fits the raw resources of a modest single Node service. However, this application currently enforces 40 players and game roster limits; it will not admit 50 as shipped. Raising capacity needs a deliberate game-limit change and future validation. All-to-all player traffic could grow about 56%, rather than just 25%, when moving from 40 to 50.


The current limits are repeated in `server/game.js` (admission, late Battlefield roster additions, game/demo validation), `server/poker.js`, `shared/battlefield.js` and demo UI inputs. The 96-socket ceiling is separate and is not the main 60-player blocker. A capacity pass should centralize the player limit, adjust server/UI validation, check 25–30 Poker tables and 50–60-avatar rendering, and parameterize/repeat all game load rehearsals. It should not simply raise admission while leaving game limits at 40.

Planning estimate, not a promised delivery time: **10–20 minutes** for the coordinated limit edits, **30–60 minutes** for tests/layout review/local rehearsals, plus **15–30 minutes** for Railway deployment and actual-device/Wi-Fi checks. Allow roughly **1–2 hours** for a responsible capacity pass; layout, device or network issues could extend it. A 35–40-minute emergency window may fit a basic limit patch if everything passes immediately, but is not a safe plan for a full refactor. Arrange and validate 60-player headroom before the workshop, or retain the tested 40-player cap. Deploy/restart between rounds only: scores survive but the active game returns to the lobby.

At unchanged snapshot frequency, a rough all-to-all traffic model grows with player-count squared: 50 versus 40 is about 1.56×, 60 versus 40 about 2.25×. Applying that model to the recorded compressed 40-client Battlefield sample gives roughly 11.7 GB / $0.59 egress for 30 minutes at 60 players (about $1.17 for an hour), before assets/compute. Compression, game state and layout change the actual result; this is an estimate, not a 60-player benchmark or a bill guarantee.
