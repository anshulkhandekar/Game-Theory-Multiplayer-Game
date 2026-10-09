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
