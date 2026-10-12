# Game Theory workshop — milestone handoff

Updated October 11, 2026. This document is the entry point for the next chat. Read README.md for operating instructions and DESIGN.md for design history; inspect the current code before changing it. The project is in `/Users/anshulkhandekar/Game Theory Activity`.

## October 11: final pre-Poker clean pass — current

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
