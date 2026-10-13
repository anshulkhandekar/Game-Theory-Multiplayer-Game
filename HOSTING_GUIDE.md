# Hosting the workshop

Checked October 12, 2026. These are deployment instructions, not a completed cloud deployment.

## Recommended arrangement

Use one persistent Node/Express service on Railway Hobby, one replica, and a small mounted volume. Deploy the entire app there: the browser client and the WebSocket server share the same domain, avoiding separate frontend/backend setup. Set a strong `HOST_KEY` privately in the provider's environment settings; never put it in Git or a QR link. Build with `npm ci && npm run build`, start with `npm start`, set `NODE_ENV=production`, and let Railway supply `PORT`. Mount a volume at `/data` and set `STATE_FILE=/data/state.json`. Do not deploy or restart during a live scored round.

Railway Hobby has a **$5/month minimum**, including $5 of usage. It is a subscription, not a one-time half-hour purchase: stop the service after the workshop and cancel/downgrade before a renewal if you don't intend to keep it. Container pricing currently includes $10/GB-month RAM, $20/vCPU-month CPU, $0.05/GB outbound traffic and $0.15/GB-month volume storage. [Official plan and usage prices](https://docs.railway.com/pricing/plans).

The prior compressed 40-client Battlefield rehearsal received 294.3 MB over 92.3 seconds across all test clients. Extrapolating that exact rate for a full 30 minutes gives about **5.7 GB**, or about **$0.29 in Railway egress**, plus compute/storage and initial assets. This is an estimate from a local rehearsal, not an exact future bill. Serving 30–40 players for one event should plausibly fit inside the $5 included usage if the service is not left running unnecessarily; provider prices, taxes and other account workloads can affect the total.

Set a Compute usage alert and a **hard limit of $5** before publishing the URL, considering any usage already on the account. The limit stops workloads once reached, so it can also interrupt an event. Railway exposes CPU, memory and network metrics; watch those alongside the game controls. [Official cost controls](https://docs.railway.com/pricing/cost-control). A hard cap is the billing protection; application rate limits alone cannot guarantee a particular bill.

## Other options

Render Free can host a Node WebSocket service, but its filesystem is ephemeral, there is no persistent disk on Free, and it can spin down after inactivity. Those tradeoffs make it less suitable for a scored one-off event unless you add durable storage and rehearse waking/recovery. [Free service limits](https://render.com/docs/free).

Vercel **now supports WebSockets**. However, connections close when a function reaches its duration limit, reconnects may reach another instance, and Vercel recommends external storage/pub-sub for persistent rooms. This app currently has one authoritative in-memory room with a local score file. Adapting it to that distributed model would be a larger change immediately before the event. [WebSocket state and connection behavior](https://vercel.com/docs/functions/websockets).

A laptop on the room's local network can also serve the app without cloud hosting charges, but campus client isolation/firewall rules may prevent other devices from reaching it. Test with multiple physical devices on the exact workshop Wi-Fi before relying on that option. GitHub can store the source; a static frontend deployment alone does not run this Node room server.

## What is saved

Browser storage holds each user's reconnect token, username/outfit, mute/graphics choices and lobby tutorial completion. **It is not the authoritative score database.** The Node process decides movement, outcomes and scores. It persists identities, appearances, raw scores, participation flags and prize exclusions to the JSON file named by `STATE_FILE`; the current local officer file is `data/officer-test.json`.

The server coalesces ordinary writes over 250 ms, writes an atomic replacement file, and flushes scoring/phase transitions and graceful SIGTERM. No database is required for one room and one replica if that file is on persistent disk. Download a backup after the event. A restart preserves saved identities/scores but resets the live room to the lobby; it does not restore an in-progress round, private cards or Battlefield orders. The JSON file contains reconnect credentials, so keep backups private and never commit it.

## Traffic and abuse boundaries

The app now limits concurrent WebSocket connections to 96, connected non-demo players to 40, and stored non-demo profiles to 300. Existing identities can reconnect even when new-player admission is full. Browser WebSocket origins must match the host; command-line clients without an Origin header remain possible, so this is a drive-by browser protection, not bot authentication.

Other existing defenses include 4 KB message limits, separate input/action token budgets, capped error replies, heartbeat checks, slow-reader disconnection, bounded compression concurrency, server-side input/transaction validation, host-key authorization, and owner-only private cards/orders. New broadcast commands require host authorization and validate camera coordinates. The app does not expose a score-reset or admin action to ordinary players.

The admin's Projector broadcast panel displays connection count, **raw uncompressed snapshot Mbps**, and mean tick work. Raw snapshot traffic is not the provider's compressed billed traffic: use the provider's network meter for the actual egress bill. `/health` exposes only availability and aggregate connection/player counts.

These boundaries reduce accidental/flood damage; they do not make a public anonymous URL immune to bot swarms, repeated downloads or denial of service. For the event, share the URL with attendees, use the provider's edge/WAF controls if available, keep a hard billing limit, and stop the service afterward. Avoid an overly restrictive per-IP rule because many campus users may share one public IP. Enable backups and avoid automatic deployments during play. Public deployment and provider configuration should be rehearsed separately before the workshop.
