# Game Theory workshop — milestone handoff

Updated October 9, 2026. This document is the entry point for the next chat. Read README.md for operating instructions and DESIGN.md for design history; inspect the current code before changing it. The project is in `/Users/anshulkhandekar/Game Theory Activity`.

## Current direction and milestone split

The user considers Crowd Rush a good first-activity MVP and wants to move on:

1. **25%: Crowd Rush foundation and five-round MVP — accepted for now.** Officer/group rehearsal is still needed.
2. **Next 25%: initial website loading page, onboarding and character customization.** This is the next implementation task.
3. **Remaining 50%: Battlefield and Poker Showdown.** Neither is implemented yet.

These percentages describe the user's four-part roadmap, not measured engineering effort. Workshop: Tuesday, October 13, 2026; approximately 20–40 laptop participants in one room; whole activity target 25–30 minutes. All players participate in the same host-controlled activity. Preserve individual tournament standings across activities, but cross-event normalization is undecided.

## What exists

- Three.js procedural 3D bears, shared geometry across panda/polar/brown/black variants, colors and hats. Vite client; Node.js/Express HTTP server with `ws` authoritative real-time multiplayer. Plain JavaScript, no React or Colyseus. Colyseus was discussed but is unnecessary for visual quality and not adopted.
- Stable browser session identity separate from display name; reconnect preserves appearance and raw earnings. Browser identity is per origin; two tabs at the same origin intentionally share a player and the newer connection takes over.
- Host authentication through a separate sign-in form; public projector view receives no host credential. Server owns phases, movement, occupancy, simulation clock and scoring. Clients send inputs/requests; local prediction/correction improves response.
- Persistent scores and player records in STATE_FILE; host key is authentication, not the reset mechanism. Restart returns the room to lobby. Use a fresh state file to reset server records; local browser identity/customization storage is separate.
- WASD camera-relative movement, Space jump, arrow-key camera rotation/tilt. No mouse-look. Round 1 overhead; lobby and rounds 2–5 close third person. Momentum persists in the air, with responsive but softened opposite-key reversal; small adjacent steps have automatic hops. Character keeps its last facing direction after movement stops.
- Cozy circular lobby, tunnel to a dedicated practice parkour gym, wall game-theory artwork, supplied panda logo on a signpost and club banners. Gym includes escalating jumps, moving/flipping/shrinking platforms, bounce pads, punchers and spikes; falls return to the center.
- Lobby chat with server validation, profanity filtering, rate limits and safe rendering. Chat is disabled during Crowd Rush. Live round event feed shows vault entries and hazard/fall events. Wave/scuba/dance emotes; E opens a wheel, 1/2/3 selects, Escape closes. Text-field typing does not trigger gameplay shortcuts.
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

This exists already; it is distinct from the upcoming website entrance redesign.

- Initial lobby and each new round show a blurred background and animated, numbered 1/2/3 instructions.
- A single **Continue** button enables after artwork loads, two render frames and shader preparation. Status reads **Continue when you’re ready.** Skip was removed in the latest change.
- Host chooses **Load practice** or **Load scored round**. The server remains in loading with no automatic timeout/countdown.
- Host roster distinguishes loading scene, scene ready/reading, and continued. The host's **Start countdown** action enables after every connected eligible player has continued.
- The top-center arena label reads `Crowd Rush | Round N`, without the phase suffix. Countdown remains eight seconds despite the shorter button label: 8–4 white, 3 red, 2 yellow, 1 green. Only one countdown is displayed. Round timer is white; last ten seconds transition red and pulse.
- Disconnects do not block loading. Reconnect during loading clears readiness. Joining during loading participates; joining after countdown begins waits for the next round. Readiness acknowledgements are scoped to the round number.
- Practice lasts 20 seconds. After results, gather ready checks, load a scored round, then start countdown. Next round advances progression; Return to lobby returns everyone.

## Next milestone: website entrance and onboarding

The user wants a polished .io-style entrance page before joining the lobby, using the supplied Diep.io reference as layout inspiration rather than copying its advertisements, store/VIP controls or branding.

Requested direction from prior discussion:

- Animated scene/background teasing the activities, with dark overlay or blur and a clear foreground entry/customization interface.
- Identifiable display-name input and a polished bear customization preview; user can drag/rotate their character to inspect it.
- Keep existing variants, colors and hats, validation, stable identity and reconnect semantics.
- Explain controls/objectives concisely and provide an obvious action to enter the lobby after assets are ready. Coordinate with existing lobby instructions instead of duplicating onboarding unnecessarily.
- Smooth, responsive transitions into the rendered lobby. Keep host and projector flows separate and credential-safe.
- The exact entrance layout, artwork and onboarding sequence remain provisional: establish them using the current design skill and user's reference, then implement.

Reference assets already in the project: `public/assets/panda-logo.png`, `public/assets/club-banner.png`. Prior screenshot reference was attached in the old chat; its temporary source path may no longer exist. Do not make the entire UI an A&M/maroon theme: user rejected that. Banners/logos are localized room decoration. Preserve the clean slate/timber aesthetic and direct language. Avoid cliché copy such as “the arena is yours,” unnecessary colored borders, excessive rounding and generic templated cards. Read `.agents/skills/frontend-design/SKILL.md` for applicable design guidance.

Do not rebuild accepted round mechanics while working on onboarding. Preserve the loading readiness gate and authoritative server boundaries. No new rendering/network framework is required for this milestone.

## Future activity requirements

**Battlefield:** teams preferably three with adjacent sizes supported; friend requests and balanced remaining assignments. Each team contests three fronts against three opponents. Players control their own fronts and can request/transfer deployment resources. Equal total team budgets regardless of size. Higher committed strength wins; ties split points. Budgets reset each volley, territory points accumulate. Begin with three clear unit options; new distinct mechanics require explicit balancing. Visible preparation, short private final-order phase, simultaneous animated resolution. No elimination; all teammates receive the same event score.

**Poker:** standard two-player Kuhn poker, three-card deck, one private card each, one-chip ante and bet, no raises. Contextual check/bet/call/fold explanations. Alternate positions, rotate opponents, stable scored rules. Private cards sent only to owners. Officer can fill an odd seat as a non-prize participant.

## Files and architecture map

- `src/main.js`: player join/customization, UI, host controls, loading instructions, event/chat UI, input and WebSocket transport.
- `src/scene.js`: bear geometry/animation, camera, renderer, client prediction/interpolation and scene readiness.
- `src/environment.js`: lobby/arena/gym visuals, anchored text/artwork, platforms/hazards and asset loading.
- `src/style.css`: neutral UI, loading instruction animations, emote wheel, countdown/urgency feedback.
- `src/audio.js`: optional local sound cues.
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

Player `/`, host `/?view=host`, projector `/?view=projector`. Production: `npm run build`, then `npm start` with the same environment. Both HTTP and WebSocket use one port. Use HTTPS/WSS for internet hosting. LAN testing uses the laptop's LAN IP; campus Wi-Fi may isolate devices. ngrok instructions are in README; no tunnel or deployment has been performed.

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
