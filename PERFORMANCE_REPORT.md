# October 13 — hosting hardening verification

All 140 unit tests and the production process integration test pass. Integration covers HTTP/WebSocket gates, signed access cookies, host/player/spectator separation, four-viewer cap, no pre-join live stream, saved identity/score recovery across process restart and corrupt-file preservation. npm audit reports zero known dependency vulnerabilities. Production build succeeds; the existing large-bundle warning remains (about 778 KB JS, 226 KB gzip).

Disposable localhost 40-client rehearsals using the new snapshot decoder:

| Check | Result |
| --- | --- |
| Battlefield practice + five rounds | Passed; p95 snapshot interval 52.97ms, p99 56.42ms, max 137.75ms; 92.07 seconds |
| Compressed Battlefield TCP receive | 266,560,719 bytes across clients; an observed run, not a controlled wire comparison |
| Poker five rounds | Passed owner-only privacy, game integrity and scoring checks |
| Crowd Rush five arenas | Passed; mean snapshot interval 50.82ms, max 74.33ms, reconnect and exactly-once checks |
| Flood alongside 40 moving clients | No normal-client errors/disconnects; p95 52.99ms, max 72.96ms |
| Abusive / oversized / slow reader | Closed with 4008 / 1009 / 1006 respectively |

A synthetic serialization comparison averaged 100 snapshots including the initial roster: 40 profiles/40 connected reduced raw bytes from 20,820 to 9,579 (54%); 300 profiles/40 connected reduced 148,137 to 10,445 (93%). Metadata is sent on change, while only connected actors receive motion entries. These are raw serialization measurements, not compressed provider egress or full-game speedup claims. Final small changes cached actor extraction once per tick and persisted registration locking; unit and process integration were rerun afterward.

These are local protocol checks and a browser smoke test, not a 30–60-minute cloud soak or a classroom full of physical devices. No 50-player test was run. The current 40-player cap remains. Existing live port 3000, private configuration, built assets and saved officer room were excluded. Test output and build were kept in /tmp; deployment guidance is in HOSTING_GUIDE.md.

# October 12 — workshop refinement validation

125 automated tests and the production build passed. A fresh disposable 40-client Poker rehearsal completed all five two-hand rounds with the new five-second seating countdown and four-second reveals, verifying unique opponents, owner-only card privacy, conserved chips and final lobby scoring. The saved officer room was excluded from synthetic traffic. Browser checks covered the simplified player UI, projector orbit/base/player camera selection and sound unlock, skin-locker persistence and closed practice corridors; no new application errors were logged in the inspected final build. No new forty-laptop rendering benchmark was performed in this pass. Existing measured samples below remain the rendering evidence.

# October 12 — casino polish follow-up

The revision passed 121 tests and the production build. A warmed 30-avatar casino sample in one 1280×720 browser measured 17.8ms p95 frame interval and 6.64ms mean JS/render work, with 1,385 render calls and approximately 460,120 triangles. This is a single-browser sample, not a forty-laptop performance certification. Rounded and indexed geometry now batch together without merge errors; slot reels use animated texture offsets rather than rebuilding geometry. Reduced motion freezes ambient animation. Browser checks covered the illustrated tutorial, furniture, actual walking through the Poker practice entrance, and casino exploration.

The revised build is on port 3000, with the original host key and all six saved profiles/scores verified unchanged. The disposable inspection port is closed. Earlier load rehearsals below remain the protocol evidence; none were run against the saved officer room.

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

October 12 visual follow-up: bounded main-lobby exhibition (three animated rigs, one greeter, batched decorative bulbs) adds no dynamic lights or particle arrays. Warmed one-player browser sample: p95 frame interval 18.3ms, mean work 2.0ms, 152 draw calls. The 99-test suite and build pass; platform motion and wardrobe persistence have targeted checks. The network stack is unchanged; the earlier 40-client figures above were not rerun or relabeled as October 12 measurements.


October 12 advice-NPC follow-up: three decorative avatar rigs replace the laptop panda. Tips are local UI; no additional server participants or RPCs. Miniature animations use two head rigs, four prebuilt bubbles, one turret, one reusable shot and three existing card groups. The proximity bump is shared deterministic movement with a three-second per-player cooldown, excluded from saved profiles and scored worlds. Warmed one-player browser sample: p95 17.7ms, mean render work 2.5ms, 164 draw calls, 25,472 triangles. 104 tests/build pass; targeted tests verify cooldown, prediction/reconciliation and unchanged scores. Six production profiles and the retained host authentication were verified. Previous 40-client network measurements remain the applicable rehearsal; they were not rerun for this visual pass.

## October 12: milestone 4 first implementation

Final verification: **117 tests pass** and production build passes, retaining the existing >500kB bundle warning (final client JS approximately 739kB uncompressed). A disposable port-3020 rehearsal with **40 real WebSocket clients, 20 simultaneous tables**, passed all five **two-hand** rounds, rotating unique opponents, host/public vs owner card privacy, exactly-once round payouts, chip conservation and normalized final-lobby scoring. That test server was stopped. This Poker protocol test did not repeat campus/WAN measurements or certify forty rendered devices.

Browser checks on the isolated port-3019 preview covered the three animated tutorial pages, ready/roam stage, automatic seating, contextual Check/Bet and Call/Fold, pause, close table camera, two-hand progression, roofless overview, demo player preview controls, persistent expanded host details, projector public table/standings panel, and actual-input walking through the right-hand corridor into independent lobby practice. A practice bet/fold resolved with no tournament score. No application console errors appeared in the inspected flows. Previous Crowd Rush/Battlefield behavior is covered by the retained suite; no synthetic clients joined the officer room.

A warmed **30-panda casino overview** at the laptop test viewport sampled 120 frames: **18.2ms p95 frame interval, 21.3ms maximum, 4.83ms mean JS/render work**, 976 draw calls and 272,958 triangles. Scenery is batched by material, with fixed decorative NPC rigs, shared card/screen art and two interior point lights; normal/low graphics and reduced motion remain available. These figures are one browser/sample, not a guarantee for all laptop GPUs. Human room-detail acceptance, sound balance and full workshop timing remain rehearsal tasks.

Two hands alternate first action. Twelve seconds × three maximum decisions × two hands + two two-second reveals bounds active play to approximately **76 seconds per round**, **6m20s across five rounds**, before host-controlled tutorials, exploration, pauses and discussion. Keep transitions concise for the user's 6–8-minute Poker target.

Review artifacts: artifacts/kuhn-casino-overview.jpg, artifacts/kuhn-tutorial.jpg and artifacts/lobby-milestone4.jpg. The final preview is http://localhost:3019/?view=host, dummy preview key `poker-preview`, state `/tmp/kuhn-poker-preview-delivery.json`, client `/tmp/kuhn-poker-dist`. **Port 3000, the live host key, tunnel, saved officer profiles and raw scores were not replaced/restarted.** Production promotion remains coordinated work after first-pass review.

October 12 production promotion: the user requested consolidation onto port 3000. The new `dist` build/server now run there with the retained host key and officer state. Read-only checks verified exact client build, successful host authentication, and unchanged six saved identities/appearances/raw scores. The port-3019 preview was stopped; port 3020 was already stopped. Only port 3000 listens in the game's 3000–3020 range. No synthetic clients joined the production room.


## October 13 workshop polish regression

148 unit tests, production process integration and production build passed. Fresh disposable 40-client rehearsals passed for Crowd Rush (five arena progression/exactly-once scoring), Battlefield (practice and five rounds, 14 teams/21 fronts) and Poker (five rounds/20 tables, owner privacy, conserved chips, unique opponents). Crowd Rush mean snapshot interval: 51.0ms, maximum: 81.3ms. Battlefield p95: 55.9ms, p99: 65.5ms, maximum: 150.9ms. These are localhost protocol measurements, not a forty-device rendering/network certification.

New detailed round history is persisted and only sent to host sockets when its length changes or a host reconnects. It does not expand every player's 20Hz snapshot. Practice adds no recurring geometry allocations; seating is validated server-side and uses existing avatar/table assets plus a pair of static Blotto chairs. Short decision/placement/result CSS animations respect reduced motion. Broadcast camera selection uses the existing bounded roster/front/deployment data; it adds no network polling. Existing bundle-size warning remains.
