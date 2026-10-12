# October 11, 2026 — pre-Poker performance pass

## What was measured

Disposable localhost production builds on macOS arm64, Node 22.20.0, with 40 real WebSocket clients. Browser samples used one 1280×720 Codex in-app browser rendering the shared scene; this is not a test of 40 laptops or campus Wi-Fi. Saved officer identities, scores and the live room were excluded from all load tests.

| Rehearsal | Result |
| --- | --- |
| Crowd Rush, five scored arenas, 40 clients | Passed; 51.0ms mean snapshot interval, 89.2ms maximum; all stages returned 40 valid results |
| Crowd Rush consistency | Host authorization, reconnect recovery, exactly-once payout, pause clock and authoritative obstacle respawns passed |
| Battlefield, practice + five scored rounds, 40 clients, 14 teams / 21 fronts | Passed; purchases, private-order isolation, results and equal teammate scoring |
| Battlefield with compression, same sequence and 20Hz input per client | Passed; 54.9ms p95, 59.8ms p99, 125.3ms maximum snapshot interval over 92.3 seconds |
| Compressed rehearsal TCP receive traffic | 294.3MB across the test clients, approximately 25.5Mbps aggregate; compression negotiated on all 40 clients |
| Input/action/malformed floods alongside 40 moving clients | Normal clients had no errors/disconnects; abusive sockets closed with 4008; malformed/action errors capped at four replies per burst |
| Oversized message / paused reader | 4KB payload cap closed with 1009; paused readers disconnected by backpressure (4009) or missed-heartbeat/close timeout (1006) |
| Compressed flood repeat | 55.8ms p95, 75.4ms p99, 181.8ms maximum normal-client snapshot interval |

The compressed Battlefield server recorded 3.2ms mean / 34.5ms maximum measured simulation-plus-broadcast tick work and 16.9ms p99 event-loop delay in that session. Its final sampled RSS was 127MiB; an earlier sample during the workload was 159MiB. Tick timing excludes asynchronous compression execution; CPU, memory, event-loop and wire figures complement it. The separate Crowd Rush/flood session recorded a 105.5ms worst tick during its longer mixed workload, despite the low average. The longer final flood/paused-reader soak, with accumulated test identities, also recorded a 111.2ms worst tick. These are samples, not a hard real-time guarantee.

Single-browser warmed samples: Crowd Rush round 1 p95 frame interval 18.2ms, round 3 18.3ms; 40-actor Battlefield round 2 p95 18.5ms with 8.5ms mean JS/render work. Four-actor demos were approximately 2ms work per frame. These short samples exclude initial asset loading and do not establish minimum-device requirements. Normal and low graphics remain available. Browser console checks found no errors in the inspected flows.

## Changes that protect the workshop

- Build the public snapshot once per 50ms tick. Reuse common Battlefield data while deriving each owner's team-only orders, wallets, messages and input acknowledgement. Privacy tests cover reuse; clients do not share private data.
- Separate movement and action budgets: 40 movement messages/second with a 60-message burst; 15 actions/second with a 30-action burst; aggregate 80/second with a 100-message burst. The client normally sends movement at 20Hz. Close sustained floods; cap error responses rather than amplify them.
- Skip state broadcasts above 256KiB queued data; disconnect readers that remain backed up for five seconds. Keep the existing heartbeat and 4KiB payload cap.
- Compress repetitive JSON above 1KiB using level 1, four concurrent compression jobs, and no retained per-socket compression context. Compared with raw snapshot-byte counters, the measured compressed rehearsal reduced traffic by about 90%.
- Coalesce join/disconnect persistence bursts over 250ms; flush phase/scoring transitions and SIGTERM. No score schema changes.
- Batch static scenery by paint. Unit formations, effects and audio voices stay bounded. Reuse muzzle temporary vectors and retain shared branding textures when rebuilding Crowd Rush stages.
- Fix the load test's obsolete spaced usernames and avoid storing every full snapshot in its message history.

## Repeating the checks

Use a disposable state file and test host key on a temporary server. Never run these scripts against the workshop room. With that server running, set `TEST_URL` and `HOST_KEY`, then run `node tests/load.js`, `node tests/battlefield-load.mjs`, and `node tests/traffic-load.mjs` sequentially. `npm test` checks the rules, presentation helpers, traffic budgets and snapshot privacy. `npm run build` produces the client; the existing bundle-size warning remains.

Optional `PERF_FILE=/tmp/workshop-perf.json` on the server writes cumulative tick/event-loop/process metrics every five seconds. Optional `?perf=1` adds a hidden `#render-performance` output containing two-second render samples; it adds no normal-player UI. Server byte counters are raw JSON lengths; the Battlefield rehearsal's TCP byte count measures actual compressed transport.

## Hosting implications

A proper host can improve server uplink and tunnel overhead. A domain name itself does not improve simulation or device rendering. Shared Wi-Fi still has shared airtime and can introduce congestion or different signal quality. Before the workshop, rehearse on the intended host with several officer laptops, check mute/low graphics and loading, then scale attendance. Cross-game normalization and Poker integration remain milestone 4 decisions.

Final delivery checks: production on port 3000 served the latest hashed client, authenticated the unchanged host key, negotiated compression and retained all five saved profiles/scores. Browser result-layout measurement at 1280×720: wallet bottom 184px, results top 192px/bottom 625px, strategy prompt bottom 610px; content height equals panel height, so all three cards and the prompt fit. Test tabs and port-3015 preview were closed.
