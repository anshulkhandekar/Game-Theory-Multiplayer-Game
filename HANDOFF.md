# Game Theory workshop — milestone handoff

Updated October 12, 2026. This document is the entry point for the next chat. Read README.md for operating instructions and DESIGN.md for design history; inspect the current code before changing it. The project is in `/Users/anshulkhandekar/Game Theory Activity`.

## Next review: optimization and hosting readiness (current brief)

The user reports that the activity works and expects it to do fine. **All four milestones are implemented.** The next task is a focused review of the existing code and hosting readiness; further changes should improve demonstrated reliability, performance or polish. Do not treat the historical milestone plans or restart checkpoints below as outstanding work. The live-delivery section immediately below is the current operational state. A listener check during this handoff update confirmed that only port 3000 is running in the game's 3000–3020 range.

### Current implementation at a glance

- **Lobby/entrance:** purple theme only; polished furniture, game-theory posters and playful miniatures; Crowd Rush practice straight ahead, Battlefield on player-left and Poker on player-right when facing the gym. Hovering arrows replace floor arrows, and side-corridor ends are closed. Skin locker uses Enter and saves an outfit without rejoining. Workshop info is available after the lobby tutorial, not on entrance or locker screens. Gold outfit button, Play pulse, subtle Discord glow and the supplied Datathon registration link are present. Reduced motion and low graphics remain available.
- **Crowd Rush:** five scored rounds and optional practice, authoritative movement/obstacles, shared vault payouts, scene-readiness and countdown controls. Purple pad landing works; gym floor resets exclude the bounce pad. Existing arena/movement changes remain intact.
- **Battlefield:** team matching precedes practice/tutorial/preparation/private orders/countdown/combat/results. Teams stay fixed across rounds. Private orders and wallets are owner/team scoped. Disconnected members' unspent resources become evenly distributed troops during the final five seconds; connected players' choices are untouched. Units face opponents and advance while firing. Combat starts with a low war horn.
- **Kuhn Poker:** standard two-player J/Q/K, ante one, bet one, no raises; five rounds, two hands per opponent with alternating first seat, rotating opponents, five-second seating countdown, twelve-second decisions and four-second reveals. Odd attendance always adds a rotating non-prize bot; no standby officer is required. Players explore during briefing, then remain seated during play/results. Private cards remain hidden until a showdown; folding keeps the other card secret. Tutorials, practice and simplified chip-result panels are implemented.
- **Broadcast:** audience projector has no director UI or clickable tutorials. Admin controls Automatic / Player / Team-base, previous/next target and manual point focus. Right-click the **admin scene**, not the projector, when point focus is enabled; reset returns to automatic. Shared camera state is host-authorized and ephemeral. Automatic shots cover arenas, casino pairs, Battlefield bases/aircraft/fronts; final orders/countdown focus on bases. Matchups/results scroll, and Poker chip gains/losses float in green/red. The host observer audio crash and spectator “Join first” resets are fixed.
- **Scoring/persistence:** each activity's cumulative raw results become 0–100 rank points, summed equally to at most 300. Raw earnings remain separate; an untied last place can receive zero rank points despite positive earnings. Ties share points. Practice, demo and excluded accounts do not earn tournament points. Offline saved entrants still affect rankings, so use a fresh score file for the actual workshop. Browser storage holds profiles/tokens/preferences; authoritative saved scores and identities live in the server JSON file. Restart preserves those saved values but returns the live round to the lobby.

### Review entry points and evidence

Read the current source, then `HOSTING_GUIDE.md`, `PERFORMANCE_REPORT.md`, `POKER_HOST_GUIDE.md` and README.md. DESIGN.md and older handoff sections explain history but can contain superseded behavior. The latest baseline is **132 passing tests**, a successful production build with an existing large-bundle warning, a fresh 40-client five-round Poker rehearsal, and earlier Crowd Rush/Battlefield load/flood rehearsals. These are protocol and single-browser evidence, **not forty-device or campus-network certification**. This handoff-only update did not rerun them or change gameplay.

| Area | Starting files | Questions worth answering |
| --- | --- | --- |
| Server lifecycle, traffic and persistence | `server/index.js`, `server/game.js`, `server/traffic.js`, `server/admission.js` | Are snapshots/serialization, compression work, connection limits, atomic saves and shutdown/recovery bounded and appropriate for 30–40 players? |
| Game integrity and disconnects | `server/battlefield.js`, `server/poker.js`, `shared/tournament.js`, relevant tests | Are payouts exactly once, private data scoped, stale actions rejected and absent-player fallback fair? Are edge cases demonstrated rather than assumed? |
| Client performance | `src/main.js`, `src/scene.js`, `src/static-batch.js`, scene/world/audio modules | Which allocations, draw calls, geometry/textures, DOM updates or audio voices are actually hot? Check disposal across repeated scene changes. Measure before changing. |
| Broadcast | `shared/broadcast.js`, `src/broadcast-ui.js`, `src/broadcast-audience.js` | Do long matchup lists, camera changes, pause/reconnect and manual reset behave consistently? Do audience and admin snapshots stay separate? |
| Hosting | `HOSTING_GUIDE.md`, package scripts, server entry point | Which single-service deployment best meets the event budget, persistent score storage, WebSockets, backups, spending limits and monitoring requirements? |

Review priorities: first identify correctness/security/recovery risks that could interrupt the workshop; second quantify client/server/network bottlenecks; third verify the least-complex hosting arrangement against current official provider documentation. Distinguish a confirmed bug, a measured optimization, an untested concern and optional polish. For each finding, provide file/line evidence, likely impact, a concrete verification method and the smallest useful fix. A legitimate result is that no important changes are needed. Avoid broad rewrites, speculative abstractions, new services/databases or decorative additions without a demonstrated benefit.

The current hosting candidate is one persistent Node service with one replica and a mounted score file, as described in HOSTING_GUIDE.md. A separate database is not required for that arrangement. The user's budget is ideally free and no more than about **$5 for a 30-minute event with 30–40 players**. Verify subscription minimums, actual billable egress, hard-spend-limit behavior, provider interruptions and persistent-volume/restart behavior. Hosting has **not** been deployed to a cloud provider. Application limits are not a guarantee against public denial of service or unexpected bills.

### Preserve while reviewing

Keep the live room and saved state intact. The ignored `.env` contains the authorized replacement key; do not print it, commit it or rotate it during a review. Do not reset scores, change weighting, game rules/timing, tutorials or participant flows as part of speculative optimization. The working tree contains substantial uncommitted and untracked implementation work: do not reset or discard it. Use disposable state/ports for any load rehearsal, never `data/officer-test.json`; close temporary listeners afterward and leave the user's port 3000 service running. If measured fixes are proposed, present findings first and make implementation a separate, narrowly scoped pass. Public deployment, billing/account setup and subscriptions remain separate user decisions.

### Suggested prompt for Astra or another reasoning model

> Read HANDOFF.md, the current source, HOSTING_GUIDE.md and PERFORMANCE_REPORT.md. The four-milestone activity is implemented and working; review it for a single 30–40-player workshop lasting about 30 minutes, ideally within $5 of hosting cost. Start with an evidence-based review without changing code. Prioritize confirmed correctness/privacy/reconnect risks, measured client/server/network bottlenecks, and the simplest reliable hosting/persistence plan. Give file/line evidence, expected impact and verification steps for each finding. Verify current provider limits/prices with official sources. Separate necessary fixes from optional polish and speculative refactors; do not invent work to fill the review. Preserve the live server, private key and saved scores; use disposable state for any rehearsal. End with a short deployment/runbook recommendation and at most five prioritized changes, or explain why the current design is sufficient. Wait for implementation direction after reporting findings.

## Final polish delivery — live on port 3000 (current)

The user explicitly authorized replacing the unavailable host key. A new key is stored in the **ignored, mode-0600 `.env` file**, together with NODE_ENV=production, PORT=3000 and STATE_FILE=data/officer-test.json. Do not copy its contents into tracked documentation or publish it. The key was given to the user in chat. Start/restart with `node --env-file=.env server/index.js`; plain `npm start` does not automatically load this local file.

The completed build is running on **port 3000**. Live HTML and hashed assets match `dist`; `/health`, the new host authentication and authenticated traffic metrics passed smoke checks. All **six saved identities, appearances and scores were verified unchanged** against `/tmp/final-live-profile-baseline.json`. No synthetic/test players joined the saved room. Only port 3000 listens in the 3000–3020 game range. The admin browser was authenticated and left open for the user. Screenshot: artifacts/live-admin-ready.jpg.

The 132 tests and 40-player five-round rehearsal from the previous pass remain valid; no gameplay code changed in this restart turn. All requested implementation work and the previously outstanding local delivery are now complete. Hosting/cloud deployment remains a future task, with guidance in HOSTING_GUIDE.md. The optional real-device checks below remain useful, not prerequisites for this local delivery.

Scoring explanation for the user: raw game outcomes determine cumulative placing within each activity. That placing becomes 0–100 rank points; three games contribute equally, for a maximum total of 300. An untied last place receives 0 rank points even if its raw vault earnings are positive. With 20 participants, first=100, second=94.7, tenth=52.6, twentieth=0. Ties share rank points. Practice does not count. Saved participants with event history remain in the ranks even when offline, so use a fresh server score file for the real event rather than mixing rehearsal identities with workshop players. Existing officer test data was intentionally preserved.

## October 12: final major polish — restart checkpoint (previous)

The latest implementation is built into `dist` and verified, but **port 3000 is not currently listening**. Its previous process was already absent when promotion was attempted; no replacement host key was generated. The original key could not be recovered from a running process, no app terminal is attached, and no retained runtime settings or `.env` were found. `data/officer-test.json` was never used for synthetic traffic or modified by this pass. **Next step: recover the original HOST_KEY from the user's earlier launch settings or ask them to restart with it, then start the production server with STATE_FILE=data/officer-test.json. Do not silently substitute a new host key.** Perform authenticated smoke/asset/profile checks after starting. All disposable inspection tabs and the port-3019 rehearsal server are closed. No game server is currently left running.

User asked for stages in one pass, but explicitly requested a resumable stopping point around 2–3% usage remaining. Work stopped near that threshold after implementation, build, browser checks and protocol rehearsal. Hosting guidance is complete in HOSTING_GUIDE.md; no cloud deployment or purchase was authorized/performed.

### Completed changes

1. Entrance/locker: purple only (saved orange ignored and selector removed); Workshop info unavailable during entrance, locker and incomplete lobby tutorial; only available in lobby after tutorial. Intro left block moved toward edge/down to match Datathon. Gold randomized-outfit button with colored dice, inviting play-button glow pulse, restrained Discord glow, reduced-motion handling. Locker removes the banner image and splash, retaining a bold Skin locker heading and outfit controls.
2. Scoring/feedback: existing rank-based normalization retained. With two scored players, lower cumulative raw earnings rank earns 0 tournament points even if raw vault earnings are positive. Ties share rank points. Lobby now labels Rank points and shows raw vault earnings alongside the per-game rank breakdown. “Join first” traced to unconditional movement resets from spectator tabs: player-only sends now require an actor. Projector jump/pad cues explicitly excluded.
3. Disconnects: in the final five seconds of Battlefield private orders, disconnected (not connected, not kicked or lobby-removed) players' unspent resources are automatically bought as troops, evenly across their three fronts. No opponent order/strength data enters that choice. Connected players remain untouched; purchases are exactly-once through existing wallet/transaction flow, and teammate messages explain fallback. Early host Fight now triggers fallback at freeze. Odd Poker always uses a bot, not an officer, with the existing rotating schedule; five real players each meet the bot once across five rounds. Fewer than five real players necessarily repeat opponents. Existing prize exclusions remain optional and ordinary officers can play as normal untagged players.
4. Broadcast: server-shared, authenticated host-only projector director. Automatic / Player / Team-base buttons, previous/next target arrows, point-focus checkbox and reset. **Right-click the ADMIN scene** with point focus enabled: host sends a validated world point and projector zooms there. This follows the user's final instruction that all controls belong on admin; projector exposes no director/menu controls. Director changes are ephemeral, never persisted as score data. Both camera position and aim are smoothed; player follow uses interpolated avatar positions. Automatic casino cycles overview and pairs; first Crowd Rush arena slowly circles, later parkour uses overview; Battlefield cycles overview, bases and aircraft/ambient robots, goes to fronts during combat and bases during final/countdown/results. Reduced motion freezes orbit. Public cards/orders remain private. Matching only says Teams Being Formed; projector never renders player tutorial controls. Audience matchup panels show results/net gains and scroll automatically; Battlefield standings remain. Floating green/red chip gains fade above Poker participants after a hand. Troops turn toward the actual opposing base/front and march while firing; muzzle transforms use their current facing.
5. Host Poker freeze: actual root cause was casino audio reading an absent host listener before authentication/pilot assignment, stopping the animation loop. Observer audio now tolerates a missing player; regression test added.
6. Hosting/limits: 96 concurrent WebSocket cap, 40 connected non-demo player admission cap, 300 stored non-demo profile cap; existing identities can reconnect when full. Same-host browser Origin validation (native no-Origin clients still allowed); existing flood, payload, compression/backpressure safeguards retained. `/health` returns only aggregate counts. Authenticated host snapshots include sockets, raw uncompressed snapshot Mbps and mean tick time, shown in director. Provider billed compressed egress is distinct from this raw counter. No claim of DDoS immunity: provider hard spending limits and edge protection remain necessary for public hosting. HOSTING_GUIDE.md explains $5 Railway Hobby/volume deployment, current Vercel WebSockets support but different state model, Render Free limitations, authoritative server JSON vs browser profile storage, backups and traffic monitoring.

### Verification and remaining work

**132 tests passed**, production build passed (existing large-bundle warning), and a fresh **40-player five-round Poker rehearsal passed** privacy, unique opponents, chip conservation and final lobby scoring with new admission limits. Browser checks covered entrance menu restrictions/gold button, authenticated admin broadcast controls, target cycling, manual point-focus propagation to the projector (public snapshot confirmed validated focus), reset, clean casino audience display, actual Battlefield automatic ambient/hangar view during the tutorial with no lesson UI, and refreshed host observer recovery without new application errors. `/health` and authenticated traffic metrics verified on disposable preview. Screenshot: artifacts/projector-audience-final.jpg. The current build assets are index-BVKPXDch.css and index-Bqg8A-Vn.js.

Required remaining delivery: start port 3000 using original host key and saved officer state, verify live assets/auth/profiles, and report running URL. Optional next real-device pass: side-front facing/advancing visuals during combat, long rolling result lists, full 30–40-device render/network behavior. These are not certified by the single-browser/protocol rehearsals. Do not repeat already-passing tests unless code changes justify it. Check current usage before resuming; user wants to wait for the five-hour reset if usage remains at the threshold.

## October 12: workshop refinement pass — previous

The requested refinement pass is live on **port 3000**. The original host key authenticates, and all six saved identities, appearances and scores were verified unchanged after a graceful server restart. Backup: `/tmp/workshop-refinement-officer-backup.json`. Temporary preview/rehearsal server and inspection tabs are closed. Refresh existing tabs.

Lobby: removed the floor arrows from both practice branches. Two extruded hovering arrows at the hall junction point to Battlefield (+x / player-left when facing the gym) and Poker (−x / player-right), with readable practice labels. Hovering respects reduced motion. Shared corridor end walls close the exposed void while keeping the side-room entrances walkable. Added a modeled skin locker at x12,z6 with a downward arrow, proximity button and Enter shortcut. It reuses the character editor; Save outfit & return changes the connected identity’s appearance without rejoining, resetting scores or changing its token. Cancel preserves the current appearance; starting a game closes an open locker. Server rejects outfit changes outside the main lobby and persists successful changes.

Entrance: a transparent isolated Datathon mark with an upright CSS rotation and scale pulse links to `https://tamudatathon.com/#event-information`. It sits on the right, moves into normal document flow on smaller screens, and respects reduced motion. Asset: `public/assets/tamu-datathon-mark.png`; imagegen source/prompt notes are in `artifacts/datathon-asset-notes.md`.

Audio: original synthesized quiet piano/bass lounge arrangement for Poker, proximity-based slot/reel and jackpot sounds in both casino rooms, a short clean shuffle when cards are dealt, and a low sustained war horn when Battlefield combat begins. Music does not change decisions. Saved global mute still applies; scheduled casino voices stop on mute. Projector audio is enabled after a user gesture using its explicit sound button, and includes Battlefield sounds and Poker countdown/deal cues.

Projector: bottom-left **Broadcast camera & sound** offers overview, player follow in all games, Battlefield team base focus, casino orbit and zoom. Selections affect that projector tab only; no private cards/orders are added to its snapshot. Public standings and table progress remain visible. Orbit respects reduced motion.

Poker: host seating/start controls now lock everyone at their table for a **five-second countdown** before dealing cards or starting decision clocks. Pause/resume preserves the countdown. Twelve-second decisions remain; reveals now last **four seconds**. Worst-case play is 85 seconds per scored round / 7m05s for five, excluding untimed transitions/pauses. The smaller panel emphasizes your private card, the last opponent action, two concise decisions and the timer. It replaces decisions with a clear hand gain/loss outcome during reveals. The round summary shows the two hand gains/losses and identifies who folded, rather than showing a full action transcript. Seated player name sprites no longer overlap the headline. Demo summaries explicitly say scores do not affect workshop standings.

Verification: **125 tests passed**, production build passed with the existing bundle-size warning, and a new disposable **40-client rehearsal passed all five rounds**, unique opponents, owner-only card privacy, conserved chips and final lobby scoring. Browser checks covered the locker save/persist flow, hovering direction signs, actual walking through the Poker practice doorway, closed corridor end, five-second seating countdown, simplified play panel/result transition, casino orbit/audio unlock and Battlefield base/player camera controls. No new application errors were logged in the inspected final build. Screenshots: `artifacts/poker-simplified-play.jpg`, `artifacts/poker-start-countdown.jpg`, `artifacts/datathon-entrance-link.jpg`.

## October 12: casino and lobby polish revision — previous

The user’s review fixes are now built and running on **port 3000**. The existing host key and all six saved profiles, appearances and raw scores were verified unchanged. The temporary 3019 inspection server is stopped; only 3000 listens in the game’s port range. State backup: `/tmp/casino-polish-officer-state-backup.json`. Refresh existing tabs.

Lobby: the bookshelf has an open front with visible books; sofa pillows sit against the backrests; the cup has an actual hollow ceramic profile, rim, coffee, handle and saucer. Removed the overlapping old cup. Both practice branches use the same shared wall definition for rendering/collision, with full-height walls ending before the side-room entrances and lintels above them. Game 3’s route is physically walkable and visibly open. Floor arrows are flat ShapeGeometry decals.

Casino: reusable slot cabinets animate their reel textures and lever joints, roulette rotates, and decorative guests include younger pandas, grandpa with cane and glasses, grandma with bun/pearls/purse, varied coats and moods. Guards have broad dark suits, lapels, ties, sunglasses and earpieces, with subtle head scans. Reduced motion freezes these loops. All remain decorative. Static batches normalize indexed/unindexed geometries so rounded furniture does not produce merge errors.

Poker tutorial: three illustrated pages explain private cards/ranking, check/bet/call/fold, and chip outcomes in complete sentences. Players can work through a King hand or compare a Jack bluff being folded to versus called. Footer controls fit at 1280×720; onboarding now names all three practice routes. Host authentication remains visible after refreshing during Poker; refreshed demo pilots reset input acknowledgements so movement works again.

Verification: **121 tests passed**, production build passed (existing large-bundle warning), and browser inspection covered repaired props, walking through the Game 3 branch, practice, all tutorial examples/navigation, refreshed host authentication, and 30-player casino exploration. No new application console errors in the inspected build. One warmed 30-avatar sample: 17.8ms p95 frame interval, 6.64ms mean JS/render work; not a certification of forty laptops. Screenshots: `artifacts/lobby-furniture-repaired.jpg`, `artifacts/poker-corridor-repaired.jpg`, `artifacts/poker-tutorial-revised.jpg`, `artifacts/casino-guests-revised.jpg`. Rules/scoring remain as described below.

## October 12: milestone 4 promoted to port 3000 — previous

At the user's request, the completed production client was built into `dist`, the old port-3000 process was gracefully stopped, and the new server started on **port 3000** with the **same existing officer host key and `data/officer-test.json`**. The port-3019 preview was stopped; port 3020 was already stopped. Listener checks show only port 3000 among the game's 3000–3020 range.

Read-only smoke verification confirmed the served HTML/assets match the new build, the retained host key authenticates, and all **six saved identities, appearances and raw scores are unchanged**. No test players joined the officer room. State backup is `/tmp/kuhn-officer-state-before-promotion.json`. Refresh player, host and projector tabs. POKER_HOST_GUIDE.md now describes the live port-3000 operation. Older preview-only delivery notes below are historical.

## October 12: milestone 4 first implementation — previous

Kuhn Poker is implemented in the isolated preview on **port 3019**, with disposable `/tmp/kuhn-poker-preview-delivery.json` and preview host key `poker-preview`. The existing **port 3000 officer room, saved state and runtime key have not been replaced/restarted**. The production client build is `/tmp/kuhn-poker-dist`, served by the optional `CLIENT_DIST` environment variable. Review the first pass before coordinating promotion to the live room.

See **POKER_HOST_GUIDE.md** for the host sequence, exact rules, officer seats, demo, scoring and timing. Five scored rounds use standard two-player J/Q/K Kuhn, one-chip ante/bet, no raises, **two hands per opponent** (alternating first action), 12-second decisions and two-second reveals. Approximately 76 seconds maximum play per round; five rounds leave transition time within the intended 6–8 minutes. Host controls untimed tutorial/exploration → seating/locked play → results → next tutorial with new opponents. Small rosters repeat only after their unique pairings are exhausted. No elimination.

Casino: walnut/green felt/brass, warm chandeliers, velvet wall panels, slot reels, animated excited/frustrated pandas, roulette/dealer vignettes, bar and watchful guards. Decorations do not affect outcomes. Host demo supports 2–40 attendees, odd bot seat, pilot switching, close camera/player preview and roofless overview. The lobby has an independently replayable, untimed right-side Poker practice lounge, mirroring the left-side Blotto room. Existing advisers remain inactive.

Lobby Game selector enters Battlefield through matching, or Poker through briefing; Crowd Rush retains its controls. Officer assignment in the lobby persists, excludes officers from the first two games and prizes, and allows one odd Poker seat; unavailable officers fall back to a non-prize bot. Fresh late arrivals wait in the lobby; reconnect retains the private card/seat. Public views contain no unrevealed cards. Host-removed players cannot act or earn. Game snapshots/persistence use exactly-once round payouts and no saved demo/bot identities.

Equal-weight tournament points now derive from each activity's competition rank, with 100 per game/300 total. Raw scores remain intact; new participation flags include zero-net outcomes. Ties share points; officers/demo/kicked identities are excluded. Lobby standings include the three-event breakdown. This supersedes older raw-sum instructions below.

Lobby polish adds allocation simplex, hidden-information-set and mixed-strategy-indifference prints around the other walls, plus stitched rug, cushions, bookshelf/books, mug/saucer details and furniture feet. Bookshelves have shared collision. Jumping onto the practice pad now launches correctly; gym-floor respawns remain outside the pad and both side lounges are safe.

Verification: **117 tests pass**, production build passes (existing large-bundle warning), and a disposable 40-client rehearsal passes all five two-hand rounds, unique opponents, owner-only cards, chip conservation and final lobby scoring. Browser checks cover tutorial/readiness, close/overview cameras, persistent host details, projector, practice access/action resolution and clean application console. Artifacts: artifacts/kuhn-casino-overview.jpg, artifacts/kuhn-tutorial.jpg and artifacts/lobby-milestone4.jpg. A warmed 30-panda casino sample had 18.2ms p95 frame interval and 4.8ms mean render work; this is one browser, not forty laptops. More detail is recorded in PERFORMANCE_REPORT.md. The synthetic 40-client room uses port 3020 and disposable state only; stop it after verification. The user-facing port-3019 preview remains for first-pass review. Existing pre-milestone sections below are historical wherever superseded.

## October 12: final handoff before milestone 4 — previous

**Pip, Atlas and Ace are removed from the live lobby.** Their models, plinths, labels, proximity prompts, advice panels and E/click handlers are no longer created or connected. The user prefers to preserve the mystery between games and have players learn through the existing tutorials. Do not reintroduce strategy NPCs unless explicitly requested.

The NPC implementation is retained **inactive and unbundled** in src/lobby-advisors.js, src/lobby-advisors.css and shared/lobby-advisors.js for possible later reuse. It has no live imports from the application. The toy tank constants are now independent in shared/lobby-showcase.js; its sound is handled by the existing environmental audio rather than the removed advice panel.

**Keep the miniature game teasers:** the vault pandas bob and quarrel with cute speech bubbles; the toy tank scans and fires a gentle proximity bump with its three-second per-player cooldown; the actual J/Q/K cards flutter and glimmer. The simplified entrance teaser, supplied Jane Street logo, lobby furnishings/lighting, both practice areas and all Crowd Rush/Battlefield tutorials and gameplay remain intact. No typing panda is present either.

Verification: **104 tests pass** and production build passes with the existing bundle warning. Browser inspection of the live projector lobby confirmed the trio and its plinths are absent while the miniature exhibits remain. The served JavaScript contains the mini-panda dialogue and excludes the advice UI/tips. Client-only deployment on **port 3000** required no server restart; smoke checks authenticated the existing host key and verified all **six saved profiles, appearances and scores** unchanged. A fresh screenshot is artifacts/lobby-final-before-milestone4.png. Older trio/advice screenshots below are historical and do not represent the current lobby.

This is the final change before milestone 4. Start the new chat with: **“Read HANDOFF.md and the current milestone documents. Let’s settle the Poker rules and implement milestone 4, preserving Crowd Rush, the lobby and Battlefield.”** Poker gameplay is still unimplemented; rules, tutorial flow, matching and cumulative scoring/normalization must be settled before dependent implementation. Keep the existing officer state in data/officer-test.json and preserve the runtime host key; do not run load tests against this room.

## October 12: advice panda trio and playful exhibits — previous (trio now inactive)

The seated typing panda has been removed, including its obsolete module. Three lobby NPCs now reuse the friendly player-bear style: **Pip** (left, short, glasses/beanie/notebook) advises Crowd Rush; **Atlas** (middle, broad shoulders, angular bear chin, patrol uniform) advises Battlefield; **Ace** (right, cap/shades, lapels, gold chain and chip) advises Poker. Their main-lounge positions are local x −5 / 0 / 5, z −6.5; the lobby’s 1.35 horizontal scale is shared with proximity checks. They are decorative NPC rigs, not participants or new physics colliders.

Walk within 2.65 world units and press **E**, click the panda, or click the nearby advice prompt. Each has six pages progressing from basics to strategy and advanced ideas. Escape, Close, walking away or opening Menu dismisses advice; opening advice closes Menu/emotes. The temporary panel hides the standings and onboarding tip to avoid overlap. Crowd tips explain shared payouts and anticipating others; Battlefield tips match the actual costs, counters, supply rewards, fortifications and private orders. Ace’s tips are explicitly **Kuhn Poker preview** advice, not settled milestone-4 rules. Game-three gameplay remains unimplemented.

The entrance teaser now contains only the three-games/one-total-score headline, the game names and the highest-score prize line; its panda emoji and extra slogan are gone. The exact supplied Jane Street logo remains intact.

The miniature vault pandas have eye patches, bobbing/quarreling motion and four alternating speech bubbles. The tank scans left/right and aims/fires a small glowing shot when players approach its display. A gentle outward hop is simulated identically by server and client prediction, scoped to the negative-z main lounge with a **three-second per-player cooldown**. There is no client firing request, damage, scoring change or interaction with the practice routes. Shot timers are excluded from saves and cleared outside the lobby. Poker cards flutter with a moving glint. Reduced motion freezes the cosmetic motion and glint/shot travel; the tank’s gameplay cooldown/bump remains. Low graphics hides the glint and bulb garland. Effects use fixed rigs/sprites and one reusable shot; no growing particle lists, new dynamic lights or server NPC entities.

Verification: **104 tests pass**, production build passes with the existing bundle warning. New tests cover proximity, tank scope/cooldown, prediction/authority agreement and unchanged scores/transient saves. Browser checks verified all three advisers, basic/advanced paging, E/click interactions, Escape/walk-away dismissal, simplified teaser and the authoritative tank rebound. No application console errors were observed (only unrelated extension warnings). A warmed one-player lobby sample showed 17.7ms p95 frame interval, ~2.5ms mean render work and 164 draw calls. This is a browser sample, not a new 40-device certification. Screenshots are in artifacts/lobby-advisor-trio.png and artifacts/lobby-advice-panel.png.

Port 3000 was stopped at delivery time; the updated production app was started there with the existing officer host key and data/officer-test.json. Smoke verification authenticated the retained key and compared all **six saved identities, appearances and scores**, unchanged. The isolated port-3015 preview and agent browser tab were closed afterward. Refresh existing tabs. Existing milestone-4 handoff instructions below still apply; settle Poker rules and cumulative scoring before implementing game three.

## October 12: supplied-logo and typing-panda follow-up — previous (typing panda superseded)

The Jane Street tee now uses the exact supplied transparent blue logo, stored at public/assets/jane-street-logo.png. Light fabric provides contrast; the canvas print preserves the logo aspect ratio and updates when the image loads. The shared wardrobe choice ID remains janestreet, so saved appearances still work.

The waving greeter is replaced by a bespoke seated 3D panda based on the supplied laptop illustration: rounded black/white body and head, eye patches, large paw pads/toes, curved arms and alternating paw taps. It has a modeled keyboard, trackpad, hinged display, interior code lines and club emblem on the laptop lid. Head nods and paw motion stop under reduced motion. Geometry is batched within static parts; the panda is decorative and never becomes a server participant or collider.

The mini Kuhn exhibition now has actual J/Q/K playing-card artwork: corner ranks and suits, mirrored court portraits, thin card edges and patterned backs. Faces are textures fixed to each fanned 3D card, so they no longer appear as blank slabs with floating labels. This remains a decorative preview; milestone-4 Poker gameplay is still unimplemented.

Verification: 99 existing tests and production build pass (existing bundle warning); browser checks show the supplied shirt logo and the seated panda/playing cards, with no console errors in inspected flows. A warmed lobby sample showed approximately 2.1ms frame work / 17.6ms p95 frame interval. No game/network rules were changed. The client build was updated on port 3000 without restarting the server, preserving the running host key and room state. Delivery checks verified exact supplied-logo bytes and all six current profiles/scores unchanged. Temporary preview/tabs were closed afterward. Earlier milestone-4 handoff instructions remain applicable.

## October 12: entrance, lobby and Crowd Rush finishing pass — previous

This is the final handoff before milestone 4. Crowd Rush side-wall instruction boards are 1.3 units inward from the walls, in front of the vertical ribs and stage trim, so text such as “Amber warns before a strike” is readable. Applies to all scored parkour arenas (rounds 2–5).

Round 2's diamond moving platform now matches round 5's sinusoidal motion: angular speed 4.2 radians/second and travel amplitude 1.45. Matching speed alone would not fix skipping. Its fixed approach / moving bridge / next landing heights are now 1.1 / 2.25 / 3.15. The 2.05-unit rise between those fixed neighbors exceeds the normal 1.521-unit jump apex, requiring the moving bridge. Bronze/gold, other rounds, movement controls and rewards are unchanged. The actual-input route tests still reach every vault.

Entrance wardrobe now includes Field helmet, Frog hat, Rubber duck, Panda patrol uniform with pockets, Space cadet and Noodle club shirts. Jane Street has a larger high-contrast two-line wordmark lifted clear of the curved shirt surface. Randomize outfit sits directly below the dropdowns and changes skin plus all four garment/accessory categories; dropdowns, caption and 3D preview stay synchronized. The outfit is saved on Play/Rejoin through the existing profile flow. All new choices pass shared server validation and saved-session recovery.

The left entrance teaser explains three games, one cumulative score and the highest-score prize; it lists Crowd Rush, Battlefield and Poker Showdown. Narrow screens get a compact inline version. The portrait/randomizer layout fits the Play button within a 720px laptop viewport. Existing club banner, sponsor carousel, Discord link, username flow and menu remain.

Main lobby only: a club-shirt panda greeter waves, a wall-supported shelf carries gently floating miniature vault/tank/cards exhibits, and warm ceiling bulbs frame the room. Exactly three exhibit rigs and one decorative bear; no new particle arrays, lights or gameplay collisions. Reduced motion freezes the rigs/greeter; low graphics hides the bulb garland. **Lobby parkour and Blotto practice areas, routes, physics and controls were not changed.** Poker cards here are decorative previews, not playable Poker.

Verification: **99 tests pass** and production build passes (existing bundle warning). New tests check matching platform motion, the unskippable height bridge, actual-input bypass attempts and randomized outfit validation. Existing tests cover all route reachability and every wardrobe choice's persistence. Browser checks cover army/Jane Street/cute outfits, randomization, refresh recovery, left teaser, laptop button fit, greeter/exhibition, reduced motion and round-5 wall text; checked console was clean. A warmed one-player lobby sample had 18.3ms p95 frame interval, approximately 2ms mean render work and 152 draw calls. This is a single browser sample, not a new 40-device certification; PERFORMANCE_REPORT.md retains prior network measurements.

The final build is served on port 3000 with the existing host key, saved identities and scores preserved. Production smoke checks verified the current client build, authenticated the unchanged host key and compared all five saved profiles/scores successfully. Temporary preview and test tabs are closed after verification. Refresh existing tabs. Start the next chat with: **“Read HANDOFF.md and the current milestone documents. Let’s settle the Poker rules and implement milestone 4, preserving Crowd Rush, the lobby and Battlefield.”** Poker rules, teaching flow, matching and cross-game scoring/normalization still need agreement before dependent implementation.

## October 11: final pre-Poker clean pass — previous

Crowd Rush, lobby and Battlefield have received the requested clean pass. All five Battlefield maps now have distinct distant infrastructure (oasis ruins/aqueduct, plains relay farm, alpine research stations, canyon processing yards, volcanic fortress satellites), plus service tunnels on the empty side. Static props and barracks parts are batched by paint; no new armies, lights or unbounded effects were introduced. Distant rifle bursts and descending artillery-shell sounds join the bounded positional audio.

Two-team demos have a straight central Supply connection and symmetric bent left/right Field connections that terminate at their actual matching patches. Army staging uses the same shared patch geometry. Larger-team scheduling and game rules are unchanged. The HUD separates team name, wallet icon/personal remaining resources and the team's summed unspent wallets. Purchases, refunds and bot spending update both amounts. Results/countdown have reserved space below the taller wallet; compact result cards retain all comparisons and the strategy question.

Lobby Blotto corridor floors now tile around the main hall, parkour gym and room instead of overlapping coplanar surfaces. Crowd Rush's five arenas have themed stage rigs, light ladders, decorative beams and spectator balconies outside the routes. A physical black/red broadcast timer shows server-authoritative loading/countdown/active/practice/pause/results states; it updates only when the displayed second or phase changes. Vaults, platforms, movement and payouts remain unchanged.

Server performance protections: one shared public snapshot per tick with owner-specific private fields; independent movement/action budgets; capped error replies and sustained-flood closure; 256KiB backpressure threshold; bounded no-context WebSocket compression; coalesced join/leave saves with immediate phase/scoring flush. Shared club textures survive Crowd Rush rebuilds. See PERFORMANCE_REPORT.md for measured results and repeatable disposable-room checks.

Verification: **96 tests pass** and production build passes (existing bundle-size warning). Forty-client Crowd Rush checks passed all five arenas, reconnect/authorization/exactly-once payout and obstacle respawns. Forty-client Battlefield checks passed practice and five scored rounds; the compressed repeat included 20Hz movement, 55ms p95 snapshots and approximately 25.5Mbps aggregate wire traffic. Floods/oversized messages/paused readers were bounded without normal-client errors or disconnects; the final longer soak had a 182ms maximum delivery gap despite its 56ms p95. Browser checks cover stage timers, 40-actor Battlefield rendering, four-actor paired lanes, personal/team wallet updates, countdown/result spacing and map switching. Single-browser figures do not certify 40 rendered laptops or campus Wi-Fi.

The verified build is deployed on port 3000 with the existing officer host key and data/officer-test.json preserved. The production smoke check authenticated that key, served the latest hashed client and confirmed all five saved profiles/scores unchanged. Temporary preview servers and agent-created test tabs are closed after checks. Refresh existing tabs. **Next work is milestone 4: Poker**, with Crowd Rush/lobby/Battlefield behavior preserved; final visual/audio acceptance and actual-host rehearsal remain human checks.

## October 11: officer-feedback polish — previous

The latest requested polish is implemented. Lobby hallway widened; Game 1 parkour stays straight ahead and Game 2 Blotto is actually on the left when facing parkour (+x). Physical floor arrows point along that route, and the Blotto room has matched shared solid walls, ceiling, lights, window panels and club-purple trim. Each player still plays a local independent bot match. Menu Workshop info explains all three planned games and highest total score, with Game 3 bunker/Poker practice explicitly pending. Onboarding tips hide during info/practice panels. Workshop leaderboard modal now agrees with combined lobby Total Points.

Battlefield has a one-slot binocular hotbar (1; mouse look; 1/Escape to exit) with a zoomed first-person camera, lens mask, pointer capture and drag fallback. It automatically closes for tutorials/countdowns and terminal checkout. Wallet/status/results/countdown occupy separate UI lanes; countdown uses a dedicated cue element. Results are three ordered cards showing own-team win/loss/tie/empty, both strengths, gap, earned territory, and an allocation strategy question. Practice labels show hypothetical earnings. Briefings use connected explanatory prose while preserving animations and exact rules.

Home barriers hold until the frozen countdown finishes, then drop for reveal/results. Shared authoritative/predicted movement allows roaming within an outer map perimeter; next round teleports home and restores barriers. Units still resolve from resource orders, independent of movement. Sky has procedural cloud texture. Shared aircraft trajectories cover both sides with two jet squadrons and circling helicopters. Robot pandas have rounded faces, ears/eye patches, articulated armored arms/legs, and falling poses; bounded flash/dust bursts appear nearby and in empty map gaps. Instanced unit muzzle flashes and barrel/rifle recoil accompany fighting.

A separate bounded six-voice combat/ambient audio manager synthesizes differentiated tank/artillery, turret, troop, brief panda-yelp, jet/rotor/titan/impact sounds. It uses shared flyover trajectories and weapon cadence, positional fading, compression, master mute, pause/visibility cleanup and no persistent loops. No external scream recording or new asset dependency was added.

Verification: 90 tests pass including perspective-correct results, fleet bounds, and barrier combat/reset lifecycle; production build passes with existing size warning. Browser checks cover the physical lobby route/room, info/practice panel readability, 1/mouse/Escape binocular controls, readiness, deployment, separated countdown, post-combat roaming (43.4 units from home), next-round reset and ordered results. A 40-actor round-5 browser demo also verified fort/artillery purchases, overview, combat and result rendering. Browser console was clean in checked flows. Visual/audio acceptance and multi-laptop performance remain workshop rehearsal tasks. Production is updated on port 3000 with the existing host key/state; temporary preview is closed after verification. See BATTLEFIELD_HOST_GUIDE.md for current operation.

## October 11: Battlefield immersion, briefings and lobby practice — previous

This revision supersedes earlier runtime/UI descriptions. The agreed rules remain unchanged: round 2 adds supply value, round 3 adds unit counters, round 4 forts, round 5 artillery and 90 resources. See BATTLEFIELD_HOST_GUIDE.md for exact rules and the host runbook.

Teams now load into untimed exploration. Host starts the animated briefing, players finish and become ready, then host begins allocation (or explicitly overrides readiness). Connected-only readiness counts are displayed. The server automatically advances 45 seconds visible preparation → 15 seconds private changes → five seconds frozen countdown → ten seconds combat → results. The host loads each next round and starts its briefing. Countdown orders stay private and all purchase/transfer edits are closed; pause freezes it. Demo pilots are excluded from bot auto-readiness so their actual tutorial can be tested; switching pilots refreshes readiness during exploration/briefing.

Player HUD is compact with collapsed team chat/resources. Demo Player screen toggle hides the host desk and standings. Terminal artwork is physically anchored; own screens have bobbing markers. Checkout closes when the player walks away. Host authentication remains accessible when refreshing into a Battlefield result screen.

Map ground has deterministic tiled canvas sand/grass/rock textures. A distant monumental hangar carries the existing club banner with worn trim and panda flags. Ships/helicopters fly over and articulated robotic panda titans fire distant tracers. Scenery parts are merged by paint within moving rigs, effects are bounded, low graphics reduces aircraft/robots, and reduced motion stops nonessential movement. Combat uses quiet bounded gunfire/explosion/construction cues under the existing master mute. Base spacing expanded; visible radius-28 home boundaries are enforced by shared authoritative/predicted movement, including jumps. Players remain opaque and do not collide with each other in Battlefield.

Lobby's left practice branch now has per-player Colonel Blotto vs bot: allocate 1/2/3 cards to three fronts, reveal, result, replay. It is local, independent and unscored. The bot commits before allocation. Other bears become translucent as soon as the local player enters the practice hallway; Crowd Rush transparency remains intact. Lobby Total Points uses the raw sum of Crowd Rush earnings and Battlefield territory; event scores still persist separately, without normalization or Poker.

Validation: 87 tests pass, production build passes (existing bundle-size warning), 40-client rehearsal passes practice and five scored rounds, browser verifies all five briefings/readiness, player preview, terminal proximity/auto-close, host refresh authentication, and a complete reachable lobby Blotto match. No browser console errors observed. This does not certify 40 rendered laptops, campus latency or subjective audiovisual balance.

Updated production runs only on port 3000 with the existing officer host key and data/officer-test.json preserved. Disposable preview on 3015 is stopped after verification. Refresh all tabs before testing. Use BATTLEFIELD_HOST_GUIDE.md; historical runtime notes below describe earlier sessions.

## October 11: barracks controls and solo demo revision — previous

This revision supersedes the earlier front-ownership/allowance model. Each player has a personal wallet and may deploy to all three team fronts. Team budgets remain equal (60 in rounds 1–4, 90 in round 5), split into whole personal shares. Teammates use three independent 3D barracks terminals: choose unit and quantity, review price, confirm purchase, or recall their own units for a full refund. Orders aggregate by team/front; receipts are idempotent and scoped to a volley. Purchases require proximity to an own-team terminal. Absent wallets may be managed by teammates. Resource requests transfer only unspent wallet resources during public preparation.

Default team formation now prefers teams of 2–3 for workshop counts: 20 becomes four triples/four pairs; 21 becomes five triples/three pairs; 22 becomes six triples/two pairs; 29 becomes nine triples/one pair; 30 becomes ten triples. Matching shows projected sizes and explicitly says friend preferences are best effort. Confirmed rosters remain fixed across practice and five rounds. Two-team small-group mode retains three paired fronts; seven participants can have a team of four. Every team has the same resource total.

Open-front canvas barracks have crates, flagpoles, construction pads/scanners, three glowing click/E terminals and outlined defensive patches. Authored panda infantry, mobile turrets, tanks and round-5 artillery use merged meshes and GPU instancing; infantry have walking leg motion, vehicles roll along deployment routes, printing reveals models vertically, and simultaneous combat uses bounded shell/impact effects. Visual formations are capped; exact unit counts remain visible in labels and authoritative scoring. Added physical barracks walls shared by authoritative movement/prediction. Existing Crowd Rush/lobby mechanics remain intact.

Authenticated host **Battlefield solo demo** supports 2–40 simulated participants and Automatic/prefer-2 team sizing with a preview. It needs no real players. The host pilots a demo panda, can switch bears, visit terminals, select any round, choose close/overview camera, toggle low graphics and enable/hold timers. Demo starts untimed; bots allocate their own wallets during public preparation. Synthetic identities and scores are excluded from persistence and removed on return to lobby. Real player records and scores are preserved.

Verification: 82 focused tests pass, production build passes, updated 40-client protocol rehearsal passed practice plus five rounds with purchases, private-order checks and equal teammate scoring. Browser checks covered 16/40 actor demos, terminal opening via E, quantity/cost updates, two-tank purchase, single-tank refund, artillery purchase, round selection, private phase, overview and animated reveal with no console errors. This is not 40 rendered laptops or WAN certification; human visual/balance acceptance remains pending.

At the user’s request, the updated production build is now running on port 3000. The previous officer server and isolated port 3015 preview were stopped; port 3016 was already stopped. The existing officer host key and data/officer-test.json state were preserved. Host controls: http://localhost:3000/?view=host. Refresh existing tabs to load the Battlefield barracks and solo demo. Historical runtime notes below describe earlier sessions.

## October 11: Battlefield first playable iteration

Milestone 3 now has an isolated-verified first iteration: 30-second post-Crowd-Rush friend matching, balanced teams, unscored practice and five scored Battlefield rounds, three-step instructions, public preparation/private final orders, team chat, validated resource requests/transfers, counters, fortifications, procedural landscapes and simultaneous animated resolution. See the settled-rules section at the end of MILESTONE_3.md. Earlier statements that Battlefield is unimplemented are superseded by this section; visual acceptance and balancing remain iterative.

Verification: 77 focused tests pass (including all previous Crowd Rush checks), production build passes, a 40-player WebSocket rehearsal completed practice plus five rounds with 14 teams/21 simultaneous fronts, and isolated browser checks covered host entry, friend selection, instruction steps, deployments, private-order visibility, tank reveal, late joining and lobby return. These checks do not certify 40 rendered browsers, campus/WAN latency, subjective visual quality, or workshop timing. No Poker work or tournament normalization was added.

The live officer server on port 3000, its dist directory, host key, saved participants and ngrok tunnel were untouched. Development and builds ran in /tmp/battlefield-m3 with disposable states on ports 3015/3016. Verified source was copied into this workspace; the live server continues serving its previous build until an intentionally coordinated rebuild/restart. Temporary test servers and clients were stopped.

## Current direction and milestone split

Crowd Rush and entrance/customization/recovery/audio now form the officer-test MVP. Officer testing produced feedback that was implemented, and the user confirmed the movement/audio fixes work well. Subsequent onboarding, readiness, staging-dome and arena-clearance polish is implemented and verified. Full 20–40-device performance and workshop timing remain unverified.

1. **Milestone 1: Crowd Rush foundation and five-round MVP — implemented and officer-feedback fixes accepted; latest polish ready for testing.**
2. **Milestone 2: entrance, onboarding, wardrobe, browser recovery and audio — implemented and officer-feedback fixes accepted; latest polish ready for testing.**
3. **Milestone 3: Battlefield implemented, with officer-feedback and final performance polish.** See [MILESTONE_3.md](MILESTONE_3.md) and [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md).
4. **Milestone 4: Poker Showdown and full-workshop integration — next.** Poker is not implemented yet; settle its rules and cross-game scoring before dependent work.

Preserve officer-test identities, scores, host key and tunnel. The October 11 onboarding polish below includes game/UI changes and a production rebuild. Do not interpret historical “next” instructions below as current scope.

These percentages describe the user's four-part roadmap, not measured engineering effort. Workshop: Tuesday, October 13, 2026; approximately 20–40 laptop participants in one room; whole activity target 25–30 minutes. All players participate in the same host-controlled activity. Preserve individual tournament standings across activities, but cross-event normalization is undecided.


## Start here for milestone 4

Read this handoff, MILESTONE_3.md, PERFORMANCE_REPORT.md and the current code. Preserve the accepted Crowd Rush, lobby, Battlefield, identity/recovery, wardrobe, tutorials, audio, host/projector tools and scores. Do not run synthetic clients or rebuild over an active officer room: use a disposable preview and coordinate the final local restart while preserving the host key/state.

Suggested next-chat prompt: “Read HANDOFF.md and the current milestone documents. We’re ready for milestone 4: Poker. Preserve Crowd Rush, the lobby and Battlefield. Confirm the Poker rules, teaching flow, matching and tournament scoring, then implement the final game and its lobby practice.”

## What exists

- Three.js procedural 3D bears with panda/polar/brown/black/red variants, accent accessories, hats/headphones, glasses and shirts. Vite client; Node.js/Express HTTP server with `ws` authoritative real-time multiplayer. Plain JavaScript, no React or Colyseus. Colyseus was discussed but is unnecessary for visual quality and not adopted.
- Stable browser session identity separate from display name; reconnect preserves appearance and raw earnings. Browser identity is per origin; two tabs at the same origin intentionally share a player and the newer connection takes over.
- Host authentication through a separate sign-in form; public projector view receives no host credential. Server owns phases, movement, occupancy, simulation clock and scoring. Clients send inputs/requests; local prediction/correction improves response.
- Persistent scores and player records in STATE_FILE; host key is authentication, not the reset mechanism. Restart returns the room to lobby. Use a fresh state file to reset server records; local browser identity/customization storage is separate.
- WASD camera-relative movement, Space jump, arrow-key camera rotation/tilt. No mouse-look. Round 1 overhead; lobby and rounds 2–5 close third person. Momentum persists in the air, with responsive but softened opposite-key reversal; small adjacent steps have automatic hops. Character keeps its last facing direction after movement stops.
- Cozy circular lobby, tunnel to a dedicated practice parkour gym, wall game-theory artwork, supplied panda logo on a signpost and club banners. Gym includes escalating jumps, moving/flipping/shrinking platforms, bounce pads, punchers and spikes; falls return to the center.
- Lobby chat with server validation, profanity filtering, rate limits and safe rendering. Chat is disabled during Crowd Rush. Live round event feed shows vault entries and hazard/fall events. Wave/scuba/dance/Griddy emotes; E opens a four-quarter wheel, 1–4 selects, Escape closes; movement cancels. Text-field typing does not trigger gameplay shortcuts.
- Players never collide with one another. Other players become transparent during rounds; lobby players remain solid visually. No stacking or combat.
- Optional sound toggle, low graphics mode, reduced-motion support, persistent quality preference.

## Crowd Rush rules and progression

At the deadline, each occupied vault divides its announced reward pool equally among its server-confirmed occupants. Outside all zones earns zero; empty vaults award nothing. Practice does not affect scores. Results explain each payout and persistent standings show raw Crowd Rush earnings, not normalized tournament points. Each round scores exactly once.

Default pools: Bronze 120, Gold 240, Diamond 360, Sky 480 (Sky appears in rounds 3–5). Host can configure pools and scored durations between rounds.

| Round | Default duration | Current route design |
| --- | --- | --- |
| 1 | 35 seconds | Flat tutorial, three walk-in vault chambers |
| 2 | 45 seconds | Forward-facing routes, assisted ledges, wider jump and moving landing |
| 3 | 50 seconds | Triangular layout, elevation, two Diamond movers versus one Gold mover; Sky at height 11 |
| 4 | 60 seconds | Taller routes and additional wall punchers; Sky at height 14, flipping/shrinking landings |
| 5 | 70 seconds | Highest routes, faster movers/punchers, full-platform spike traps; Sky at height 17 |

Vaults are physical chambers with clear entrance boundaries, lit floors and HUD confirmation. Hazards use wind-up warnings; punchers launch players, full-floor spikes pop/disintegrate them and respawn them. Moving platforms carry players; flip/shrink collision dimensions follow the shared simulation. Pause freezes movement, platforms, hazards and timers together. Decorative props do not collide.

Recent fixes: platform landing occurs before lateral penetration; rotated Diamond vault-floor visuals now match their rotated collision footprint. Lobby camera no longer shortens/tilts around tunnel obstructions; geometry may obscure the view, as requested. Arena camera obstruction handling remains.

## Current instructional loading flow

This instructional flow exists alongside the completed website entrance.

- Initial lobby entry prepares the scene automatically, then runs a first-visit interactive tutorial: two movement/input categories, open/close Menu, then a confirmed emote. Completion persists per browser origin.
- New rounds show three sequential animated rule cards; Continue/Next leads to Enter staging area after scene preparation. Continued players can move inside the yellow dome while waiting. The dome opens when the eight-second countdown completes.
- Host chooses **Load practice** or **Load scored round**. The server remains in loading with no automatic timeout/countdown.
- Host roster distinguishes loading scene, scene ready/reading, and continued. The host's **Start countdown** action enables after every connected eligible player has continued. **Start without waiting** overrides this: scene-ready readers join the countdown, unfinished scenes wait in the lobby.
- The top-center arena label reads `Crowd Rush | Round N`, without the phase suffix. Countdown remains eight seconds despite the shorter button label: 8–4 white, 3 red, 2 yellow, 1 green. Only one countdown is displayed. Round timer is white; last ten seconds transition red and pulse.
- Disconnects do not block loading. Reconnect during loading clears readiness. Joining during loading participates; joining after countdown begins waits for the next round. Readiness acknowledgements are scoped to the round number.
- Practice lasts 20 seconds. After results, gather ready checks, load a scored round, then start countdown. Next round advances progression; Return to lobby returns everyone.

## Completed entrance milestone and current constraints

The entrance has the club banner and randomized strategy splash, two palettes, rotating bear locker with drag interaction, four customization dropdowns, sponsor carousel and Discord invite. Recent sections below document the implementation and verification. Google OAuth was explicitly dropped; retain browser storage identity and server-persisted scores. Latest wardrobe includes shirts and more accessories.

Preserve the accepted cozy styling, personal jump/impact sounds, distance-faded overlapping emote audio, waiting-lobby recovery, authenticated host controls and projector feed. No framework migration is planned. Read `.agents/skills/frontend-design/SKILL.md` when designing the next activity UI.

## Historical milestone-3 planning (superseded by current implementation)

Read [MILESTONE_3.md](MILESTONE_3.md) before implementation. It proposes a scoped activity-two build, explicit learning questions and acceptance tests. It does not authorize changing settled rules or deploying over the live officer room. Opponent/front scheduling, friend-request policy and cross-activity scoring remain decisions to resolve.

## Future activity requirements

**Battlefield:** teams preferably three with adjacent sizes supported; friend requests and balanced remaining assignments. Each team contests three fronts against three opponents. Players control their own fronts and can request/transfer deployment resources. Equal total team budgets regardless of size. Higher committed strength wins; ties split points. Budgets reset each volley, territory points accumulate. Begin with three clear unit options; new distinct mechanics require explicit balancing. Visible preparation, short private final-order phase, simultaneous animated resolution. No elimination; all teammates receive the same event score.

**Poker:** standard two-player Kuhn poker, three-card deck, one private card each, one-chip ante and bet, no raises. Contextual check/bet/call/fold explanations. Alternate positions, rotate opponents, stable scored rules. Private cards sent only to owners. Officer can fill an odd seat as a non-prize participant.

## Files and architecture map

- `src/main.js`: player join/customization, UI, host controls, loading instructions, event/chat UI, input and WebSocket transport.
- `src/scene.js`: bear geometry/animation, camera, renderer, client prediction/interpolation and scene readiness.
- `src/environment.js`: lobby/arena/gym visuals, anchored text/artwork, platforms/hazards and asset loading.
- `src/style.css`: neutral UI, loading instruction animations, emote wheel, countdown/urgency feedback.
- `src/audio.js`: local action/environment audio and distance-faded remote emote streams.
- `shared/wardrobe.js` / `src/wardrobe.js`: allowed appearance choices, random defaults and visual garments.
- `shared/world.js`: stage definitions, dimensions, routes, timed platforms/hazards; shared by server and renderer.
- `shared/movement.js`: shared movement/collision simulation.
- `server/game.js`: authoritative lifecycle, movement, readiness, occupancy, scores, reconnect/persistence model.
- `server/index.js`: HTTP/Vite or production static serving, WebSocket validation, host auth and persistence.
- `server/moderation.js`: name/chat normalization and filtering.
- `tests/`: focused lifecycle/scoring/loading/reconnect/auth/movement/parkour/social checks; `load.js` runs 40 simulated clients.
- `README.md`: exact operation, LAN/ngrok guidance and current feature details. `DESIGN.md`: confirmed/provisional/deferred requirements and verification history.

## Run and test

Requires Node 22.12+ and npm. `.env` is not automatically loaded; export environment variables in the shell.

```sh
npm install
export HOST_KEY='choose-a-long-random-secret'
export PORT=3000
export STATE_FILE=data/state.json
npm run dev
```

Player `/`, host `/?view=host`, projector `/?view=projector`. Production: `npm run build`, then `npm start` with the same environment. Both HTTP and WebSocket use one port. Use HTTPS/WSS for internet hosting. LAN testing uses the laptop's LAN IP; campus Wi-Fi may isolate devices. The user is actively sharing a port3000 ngrok URL for officer testing; do not restart or replace it during parallel development. ngrok instructions are in README.

```sh
npm test
npm run build
# Isolated server, never against a live workshop:
PORT=3001 HOST_KEY=load-test STATE_FILE=/tmp/bear-load-fresh.json npm start
# Another terminal:
TEST_URL=ws://127.0.0.1:3001 HOST_KEY=load-test npm run load
```

Use a new state-file path per load run. Local preview from the previous chat was port 3014 with disposable state `/tmp/crowd-reactive-preview.json`; do not depend on that process surviving. Do not stop a user's existing server on port 3000 without checking it.

## Verification and limitations

Before the final wording-only change: 45 focused tests passed, production build passed, and two independent browser-origin sessions verified instructions, readiness gating, host practice/scored flow, E-wheel and chat typing isolation. The 40-client localhost protocol run exercised all five rounds, scoring splits, host authorization, reconnect, exactly-once scoring, pause/resume and finite movement/respawns. Average snapshot interval was 51 ms, maximum 124 ms in that run. It simulated loading acknowledgements; it did not render 40 browsers or certify campus/WAN performance. The final wording-only change also passed a fresh production build and browser checks: a single Continue button, “Continue when you’re ready.” status, and “Start countdown” host label. Gameplay tests were not repeated for labels alone.

Known limits: single-process/single-room service; no account system, room codes, distributed scaling or deployment. Production bundle has a >500 kB chunk warning. English profanity filtering is bounded and not comprehensive. Asset readiness errors resolve artwork loading but shader-preparation failure shows a refresh message. Officer testing still needs to assess difficulty, readability, network jitter and whole-workshop pacing. Raw scores are not yet normalized across games.

Repository status at handoff: project files are untracked; no commits/PRs have been created. Preserve existing files and user assets; do not discard them as incidental untracked content.

## Entrance visual first pass (October 9, follow-up)

Implemented ADSC / Game Theory entrance with randomly selected purple/peach palette (user choice persists), saved username, five skins including red panda, drag-rotation preview using actual game geometry, hats/accent/round glasses, supplied sponsor strip and Discord invite. All page loads show the entrance; transient socket reconnects after Play still automatically restore the browser session. Server join validates ASCII alphanumeric usernames and updates returning player appearance/name.

This is an explicitly labeled unauthenticated workshop preview. Google OAuth is NOT implemented/configured; user has no OAuth project/domain yet. Required next: TAMU-only verified Google identity, durable account-linked profiles/scores and secure cookies; page reload returns to a separately simulated waiting lobby during active rounds, while transient network reconnect resumes the current round; waiting-lobby timer and disconnected indicator. Current shared-world model does not yet support separate waiting lobby and arena concurrently. Sponsor image is a static supplied strip; rotation/carousel transition remain polish. Sponsors are Southwest, LPL Financial (image spelling), xAI, Verizon. Discord: https://discord.com/invite/wJF2T7Gb8. User approved red panda and both palettes. Existing 45 tests and production build passed for first pass; browser inspected initial entrance and palette/red-panda controls.

## Entrance second polish

Actual supplied club banner now heads the entrance, with an animated frame and a randomized tilted game-theory/workshop splash per page load. Theme selection is inside a top-right Menu. Character glow is a soft stage pseudo-element with transparent canvas, avoiding a rectangular cutoff. Hover rotates the preview; drag overrides hover until pointer re-entry; focused left/right arrows also rotate. Sponsors are four CSS-cropped windows into the supplied strip, with a sliding center/previous/next deck and faded neighbors, automatic cycling, hover/focus pause and pause control. Reduced-motion disables automatic rotation/bobbing, uses manual sponsor advance and removes transitions. Discord link includes a vector Discord mark. Button/select/menu hover and press feedback added. No OAuth or recovery changes in this polish. Production build passed; browser verified menu/theme, sponsor deck/crops and Discord placement.

## Entrance third polish

Menu now uses a hamburger icon. Workshop splash is larger and higher at the banner corner; visible rotation instructions removed. Locker spins automatically, snaps front on pointer entry, supports manual drag, and resumes its saved spin angle when the pointer leaves (automatic motion respects reduced-motion). Sponsor neighbors have extra rounding, blur, and edge fading. Entrance background now reveals the actual shared lobby: the previous overhead view was blocked by its roof, which is hidden only during entrance preview. Eight decorative bears move/jump there; they never enter networking, roster, collision or scores and disappear after joining. Actual connected lobby players remain rendered too. Build passed and browser verified real lobby background, automatic spin and front reset. OAuth/account recovery remains deferred until user's visual feedback.

## Entrance fourth polish

Entrance uses viewport-aware compact sizing, no overlay scrolling, bottom-right vertical sponsor deck without a pause button, and corrected sponsor crops. Splash pool now includes recognizable game-theory/ADSC references and sits to the right of the banner corner at a stronger angle. Removed username helper text; input rejects non-alphanumeric characters and the same bounded profanity filter as the server, clears the field, and flashes/shakes red with accessible status. Decorative cast now mixes walking/jumping, wave, dance and scuba poses; it hides whenever any real connected player exists, and always after joining. Real players render normally behind the entrance in lobby phase. Other game phases still use the shared current world; separate waiting-lobby recovery remains pending. Build and browser checks covered 1280x720 no-scroll layout, emoji/profanity rejection, corrected sponsor crops and splash placement.

## Entrance preliminary final proportions

Bottom-right sponsors restored to horizontal deck, preview camera distance 4.7 → 4.0 makes the character approximately 18% larger without changing gameplay avatars. Removed preview/OAuth status line; Game Theory subtitle has extra spacing below banner. Splash centered near banner bottom-right with a 43-degree slant and fixed-width positioning to reduce message-length overlap. Production build and 1280x720 browser visual check passed. User is considering skipping Google authentication: existing localStorage random session token/profile and server STATE_FILE already support same-browser identity, saved appearance and earned scores. OAuth is only required for verified TAMU identity/cross-browser or cross-device recovery. Reload-to-waiting-lobby isolation and reconnect semantics still need the planned server work regardless of authentication choice. No account/authentication changes made in this pass.

Splash alignment follow-up: pool now favors recognizable poker/strategy phrases (“All in!”, “Poker face!”, “Call my bluff!”, “Know when to fold!”, “Tit for tat!”), with some game-theory references. Angle reduced to 35 degrees and positioned closer to banner bottom-right; any lower overlap falls toward Theory. Build and browser visual check passed.

## Recovery implemented; Google authentication dropped

User chose browser storage instead of Google sign-in. Join messages now include an ephemeral per-page UUID and resume flag. Matching page ID on reconnect preserves round eligibility; fresh-page recovery during countdown/active/practice/results uses waitingLobby, keeps identity/appearance/earned scores, excludes the current payout, and simulates movement in the actual lobby while arena play continues. Per-player snapshots use lobby scene/phase with activity status/time; renderer separates waiting and arena avatars. Lobby chat/emotes/readiness supported for waiting players. Next begin clears waitingLobby and loads connected players through existing gates. Fresh joins during loading still participate, consistent with prior behavior. Second tabs take over the same identity via the existing socket replacement. Server persists scores/profile; page IDs never enter public snapshots or disk. Audio/menu changes remain next: proposed mute, existing low graphics, reduced motion and controls reminder; user wants audio enabled by default in sound milestone.

Verification: all 49 tests pass (four focused recovery tests added), production build passed; isolated real WebSocket protocol verified same-page resume, fresh-page waiting, preserved identity, lobby movement and next-round admission; browser at port 3017 verified saved entry after reload and waiting-lobby round timer. Isolated recovery server port 3017 uses /tmp/adsc-recovery-preview.json. Older port 3016 server must restart to load changed server code; its client can hot-update independently.

## Historical implementation notes

The following milestone entries record earlier implementations and verification. Later October 11 sections supersede them wherever behavior differs.

## Sound and emote milestone

User-supplied MP3s copied to public/audio: wave (Obi-Wan), dance (Dance Till You're Dead), scuba, griddy (generic 9convert file assumed fourth sound). Audio defaults enabled with browser gesture unlock; mute preference saved. Synthesized quiet hover/click, own jump, ready confirmation, countdown/start, own vault entry and results cues. Only the local player's emote audio plays; uploaded clips repeat with short fades, movement/jump cancels, mute/scene change/disconnect also stops. Four synchronized lobby emotes now loop indefinitely rather than three seconds; Griddy adds eye-hand gesture, backward arm swing, alternating steps and bobbing near authoritative position. Server marks cancellation and clients blend pose out. Round loading stops emotes.

Persistent Menu on entrance (top-right) and gameplay (bottom-right expanding upward): theme, mute, graphics, reduced motion, Rules and controls reminder. Existing inline sound/graphics/Rules controls moved into it. Ready button highlighted gold, turns green with check after server confirmation and headline changes to Ready confirmed. Four emote shortcuts E then 1–4. No background music or sounds from remote jumping/demo bears.

Verification: production build and 50 tests pass, including infinite-emote/Griddy lifecycle test. Real WS check on isolated sound server accepted Griddy and confirmed movement cancellation. Browser checked mute/unmute, fourth emote button, Griddy pose, menu in entrance/lobby, host-triggered Ready and green confirmation. Supplied MP3 formats/durations verified using afinfo; subjective volume/music looping to be assessed by user. Sound preview runs port3018 with /tmp/adsc-sound-preview.json; older servers need restart for new server code. Multiple dev servers share the default Vite HMR port and may log an HMR-only websocket error; gameplay WS is separate and verified.

## Audio-fatigue and emote polish after rehearsal

UI sound hierarchy: only Play/Continue use primary filtered-noise click; settings/emote menu uses soft taps; remaining incidental buttons are silent. Hover only Play/Continue with 700ms cooldown and soft low tone. Wave clip plays fully with 2.2-second gap before repeating; other supplied clips retain looping fades. Final ten seconds use a single brief ticking cue per second (no heartbeat), stops on pause/results and waits for resumed values. Own punch/spike hits have dedicated synthesized impact sounds. Nearby moving/shrinking structures use filtered noise with gain driven by actual motion, quadratic 3D distance falloff (12-unit radius), directional stereo and nearest-two voice budget. Hazard action cues are distance-limited and globally throttled, silent on loading/pause/disconnect/mute; lobby gym included.

Wheel is a true four-quarter disk with equal selectable areas. Griddy now has actual shared authoritative/predicted lobby movement at 20% walking speed, follows last movement facing, respects collisions and cancels on manual input/jump. Arm cycle swings down/back then rises toward eyes, with alternating raised pivoting feet. No extra forward movement in arena/scoring. Browser verified wheel and Griddy runtime with no console errors. 52 tests and build pass including attenuation/elevation/voice cap and Griddy speed/boundaries. Only port3000 server running, restarted production build with same host key and data/officer-test.json. Sound texture/balance still requires subjective user listening.

## Officer rehearsal polish

Host/projector observer lobby camera hides roof and rafters. Both display read-only lobby chat / round event feed; host feed sits bottom-right away from standings. Host roster includes disconnected entries and readiness/loading/waiting/kicked status. Per-player Lobby, Disconnect, Kick and Allow back controls are host-authenticated. Lobby removes current eligibility but preserves scores/profile; disconnect closes socket and requires refresh to return; kick blocks that stored identity until host allows it, persists across restart, and hides it from standings. Browser-only identity means clearing storage can bypass a kick. Scores are retained, no destructive room reset added.

Normal countdown readiness gate retained. New Start without waiting starts the eight-second countdown: scene-loaded readers are marked continued; unfinished scenes move to isolated waiting lobby and cannot receive current-round payouts. Tests cover these cases and removal/readmission with score persistence.

Personal fall thunk, louder punch impacts/nearby punch mechanism, spike warning click, deep purple-pad launch tones with short echo. Jump cue is suppressed for pad launches. Remote emotes use independent full-clip loops (wave keeps its 2.2-second gap), overlapping voices, stereo pan and quadratic distance gain over 55 units; own emote remains separate. Remote audio stops on cancellation, mute, pause, disconnect or loading/world change. Other player jumps/falls/impacts remain silent. Shared landing collision clears horizontal momentum on first surface contact; deliberate movement accelerates again on ground. Griddy fixes arm position at shoulder, rotates upward/inward toward eyes and swings backward, retaining previous legs and authoritative slow movement.

55 tests and production build pass. Browser checked authenticated host roster/control states and projector lobby camera/chat. Server running production on port3000 with existing host key and data/officer-test.json. No test players created in this pass. Audio balance and WAN movement feel need officer listening/play tests; friction does not eliminate network latency.

## Shirts and cozy wardrobe

Shared wardrobe catalog/validator in shared/wardrobe.js powers entrance selects and server validation. Four categories: Accent (four scarves, none, bow tie, necktie), Hat (none/cap/crown/headphones/beanie), Glasses (none/round/money/monocle/shades/hearts), Shirts (none then ADSC, Google, Jane Street, Amazon, Nash equilibrium, Poker club, Strawberry milk). Brand tees use canvas wordmarks; ADSC dark-purple shirt has supplied panda-logo.png as small wearer-left chest print. Fitted torso shells, sleeve caps attached to shoulder groups; accessories and prints remain purely visual. Shirt graphics retain alpha transparency under round ghost rendering; per-avatar textures/materials disposed during locker changes and removal. Appearance changes rebuild remote avatars, so renewed outfits cannot leave stale models.

New unsaved entrants get a random valid full outfit (8,400 combinations), existing saved appearances preserved with no-shirt compatibility fallback. Four selects remain one row on desktop/two on small mobile. 57 tests pass, production build passes; added all-choice server validation/save/recovery and identical movement/collision/jump with dressed/bare avatars. Browser checked ADSC/headphones/bow tie/monocle and Google/beanie/necktie/money combinations front-facing. No test players joined. Production port3000 restarted using existing host key/state file; refresh tabs before testing.


## Historical rehearsal context

The October 9 jitter diagnosis and earlier audio-loop descriptions below are historical. Current behavior is described in the October 11 sections: acknowledged-input replay, buffered remote interpolation, finite emotes and the latest onboarding/dome polish. User confirmed the movement/audio fixes work well; automated checks do not establish arbitrary WAN performance or full workshop pacing.

## Officer feedback fixes — October 11 (current behavior)

This supersedes earlier infinite-emote and networking caveat notes. Officers reported excessive emote audio and severe jitter/sliding, particularly round five. Emotes now use shared finite durations (wave 2.4s, dance 6.27s, scuba 10.27s, Griddy 8s), expire on the server, and play uploaded audio once with a short fade and age offset; longer Griddy recording is bounded by the performance window. Re-selection is required to repeat. Movement/jump cancels. Allowed in lobby, readiness/instructions, active and practice; blocked while loading/counting down/results/paused. Griddy can advance slowly in live rounds; normal collisions apply.

Remote emotes now use HRTF positional panners with listener-relative horizontal/elevation coordinates, camera-relative direction, 24-unit quadratic falloff and substantially lower gain (.035 maximum vs previous .12/55 units). Own emote gain lowered .16 to .09. Menu has independent persisted other-player-emote mute, alongside master mute. Late entry/unmute resumes the remaining clip segment; completed one-shot channels cannot restart on every snapshot. All other players' movement/impact cues remain personal.

Movement now sends increasing input sequence numbers; server validates monotonic input and acknowledges the last sequence actually simulated. Owner-only snapshot prediction metadata includes ack and jump-held state; public observers/saved records omit these. Shared Predictor reconciles complete authoritative movement state and replays unacknowledged input durations, with a bounded pending history; transient frame preview remains responsive. Render state is smoothed separately from colliders. Remote players interpolate a 120ms snapshot buffer instead of repeatedly extrapolating/snapping. Disconnect clears prediction/snapshot history. Moving-platform rendering uses predicted simulation time for the local player; camera follows smoothed rendered body. Server held-input safety expiry increased 250ms to 1000ms; buffered-send guard avoids piling up stale movement. This improves brief delay tolerance, not unlimited outage recovery.

Ground braking increased 32→70; first landing absorbs horizontal momentum as before; airborne momentum is retained. Moving-platform carry remains exact in a focused check. Round-five regular route width 2.15→2.5; Sky pads 1.9→2.3; route heights, pools and hazard timing unchanged.

Verification: 64 tests pass and build passes. Added two simulated minutes of 150ms delayed snapshots with recurring 350ms delivery gaps/bursts, moving-platform delayed replay, pause/reset/jump reconciliation, private ack metadata, interpolation/teleports, ground stopping/carry and finite/live-round emote lifecycle. Browser isolated port3001 checked separate mute, round-five practice emote button and no console errors; real WS observer confirmed live practice and automatic wave completion. Isolated test players use /tmp/adsc-officer-feedback.json, not workshop records. The user subsequently confirmed these fixes work well. Full-capacity performance and workshop timing remain unverified. Do not claim tests prove arbitrary network latency is eliminated.

Runtime after verification: isolated port3001 stopped and both preview tabs closed; updated production server running on port3000 with existing host key and data/officer-test.json. Refresh all tabs before another ngrok test.

## October 11: interactive onboarding and staging polish

First lobby visit now auto-continues after scene preparation and starts a nonblocking three-step tutorial: use two of WASD/arrows/Space; open and close Menu; play a server-confirmed emote. Completion is saved per browser/origin as `bear-lobby-tutorial-v1`. Tour pauses outside lobby. Round preparation uses three separately displayed animated instruction cards before Enter staging area.

Prepared players can move/jump on a 12×12 spawn platform inside the staging dome during loading/countdown; authoritative and predicted physics enforce the same boundary. Gate disappears when countdown completes. Simulation/hazards remain frozen during staging. Ground vaults move six units outward; first platforms and Sky entry require a clear jump from spawn. All other players retain existing round transparency and no collisions.

Host Show leaderboard broadcasts standings without scoring or changing phase. Returning to lobby broadcasts standings automatically. Player standings modal closes after five seconds or Close. End round & show results retains the prior scoring action. Projector keeps standings/world/chat or event feed visible and omits blocking loading/results modals.

### Follow-up: tutorial placement, ready feedback, dome and perimeter

Tutorial SVG arrows bob toward their actual targets without restarting on snapshots. Menu coaching sits left of the options; an open menu layers above it on narrow displays. Emote coaching moves lower. Completion uses Tutorial completed and a fading green border; ready uses a green arrow until confirmed, then green Confirmed ready text/button, with no checkmark glyphs.

Staging now uses a translucent yellow hemisphere with edge tint, shared radius 6 and center z=1. Shared physics limits the player's entire height to its curved boundary, including jumps. The arena perimeter derives from ground vault positions plus ten-unit clearance; wall artwork and base floor expand with it. Rotated chamber/floor clearance and diagonal jumping against the dome have regression tests. 69 tests pass and production build succeeds; isolated browser checks confirmed tutorial, menu visibility, ready response and Round 5 staging with no console errors.
