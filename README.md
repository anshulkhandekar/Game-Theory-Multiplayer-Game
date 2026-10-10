# Game Theory — Crowd Rush

Five-round Crowd Rush MVP for Tuesday, October 13, 2026. Three.js procedural bears and arena, Vite client, Node/Express/WebSocket authoritative server. No deployment has been performed.

## Run

Requires Node 22.12+ and npm. From this directory:

```sh
npm install
export HOST_KEY='choose-a-long-random-secret'
export PORT=3000
export STATE_FILE=data/state.json
npm run dev
```

Player: http://localhost:3000/ · Host: http://localhost:3000/?view=host · Public projector: http://localhost:3000/?view=projector

Enter HOST_KEY only in the host sign-in form. It is never bundled in the client or broadcast. If omitted, the server generates and prints a temporary key. `.env.example` describes configuration; `.env` is **not automatically loaded**. Do not reuse the development test key for an event.

For another person on the same LAN, share `http://YOUR-LAN-IP:3000/`; allow port 3000 through your firewall. Campus Wi-Fi may isolate devices; use a network that permits peer connections. Use the same origin consistently: identity is stored per browser origin. A separate browser/profile, or localhost versus 127.0.0.1, creates independent local test players. Two ordinary tabs on the same origin intentionally share one player and the newer connection takes over.

Production build:

```sh
npm run build
npm start
```

The start command serves `dist/` and uses the same environment variables. For internet hosting, put HTTPS/WSS in front of the server. This milestone is a single-process room, without account login, room codes, or horizontal scaling.

## Host sequence

1. Let everyone join and customize a bear. WASD moves relative to the camera; arrow keys look in the lobby/rounds 2–5; Space jumps. Help reopens rules.
2. **Load practice** prepares the arena and shows three animated instruction steps. Players choose Continue after the scene is ready. The roster shows loading/reading/continued status. **Start countdown** becomes available when all connected participants have continued; practice then lasts 20 seconds.
3. After practice results, Ready. Players press “I'm ready”; host sees their readiness.
4. **Load scored round** prepares the scene without advancing a timer. Wait for participants to continue, then choose **Start countdown**. Default scored duration: 35 seconds in round 1.
5. Results show reward / occupants and each payout. Host selects Next round → Start to progress through rounds 2–5 (players can ready up first), Lobby to return everyone, or Ready to repeat the current round.

Pause/Resume freezes both movement and phase deadlines. Results can end a round early. Apply settings changes scored duration (5–180 seconds) and bronze/gold/diamond pools (0–10,000) between rounds. Default pools: 120 / 240 / 360. Current occupancy and hypothetical per-bear payout are public during play. Host can start without all players ready, intentionally allowing an officer to keep the room moving.

## Verification

```sh
npm test
npm run build
# Use a separate fresh-state server for repeatable load tests:
PORT=3001 HOST_KEY=load-test STATE_FILE=/tmp/bear-load-fresh.json npm start
# In another terminal:
TEST_URL=ws://127.0.0.1:3001 HOST_KEY=load-test npm run load
```

Use a new STATE_FILE for each isolated load run. The load script creates 40 players, authenticates an additional host observer, sends movement at 20 Hz, runs a scored round, checks nonzero split payouts, rejects a player host command, reconnects an existing session and checks score/idempotence, then exercises falls and finite state in rounds 2–5 and pause/resume in round 4. It changes game state; do not run against a live workshop.

Actual verification is recorded in DESIGN.md. The focused tests check scoring/lifecycle/reconnect, solid collision, spike timing, five-round progression and traversal of every elevated route. The isolated 40-client run covers all five rounds, flat-round split payouts, reconnect/authorization/exactly-once, round-4 pause, and finite positions/respawns. This is localhost protocol simulation, **not** 40 rendered laptops or campus-network certification.

## Officer test with ngrok

Stop the running dev server first (Ctrl+C in its terminal), then serve the built app. Use a new secret instead of the local `workshop-test` key:

```sh
npm run build
HOST_KEY='your-new-long-secret' npm start
```

With ngrok already installed and authenticated, in a second terminal:

```sh
ngrok http 3000
```

Share the printed HTTPS URL with officers; open the same URL plus `/?view=host` for host controls. The browser automatically uses WSS on that origin, and both HTTP and WebSocket traffic share port 3000. Use the production build for this test to avoid development-server hostname/HMR issues. Keep the laptop awake and both processes running. No ngrok tunnel has been started or tested by this project yet. Identities belong to the browser origin: a different public domain gets a separate local session.

Try one practice and all five scored rounds. Ask officers whether starting/stopping feels responsive, jumping/facing looks natural, they can identify their bear, vault payouts make sense, and anything jitters over the tunnel. Press **Sound off** to enable optional cues. **Low graphics** disables shadows and particles; the quality preference survives refresh. Scores shown remain raw Crowd Rush earnings.

## Five-round playthrough

WASD moves relative to horizontal camera yaw; A/D strafes. Left/right arrows turn the view; up/down arrows tilt it. Space jumps; release before the next jump. Looking upward does not make W fly upward. Round 1 retains the overhead view; the lobby and rounds 2–5 use a close third-person camera.

Vaults are walk-in chambers. Enter through the lit doorway: the floor brightens, the chamber sign confirms Inside, and your HUD shows the current potential payout. Leave the threshold to change vaults. Occupancy is confirmed by the server, including floor height; standing underneath an elevated chamber or on its roof earns nothing. Everyone inside at the deadline shares the announced pool.

| Round                | Default seconds | Challenge                                                   |
| -------------------- | --------------- | ----------------------------------------------------------- |
| 1: Three chambers    | 35              | Flat tutorial                                               |
| 2: Platform routes   | 45              | Assisted small ledges, one wider gap, moving landing        |
| 3: Three-way gallery | 50              | Three directions, varied rises and larger resting landings  |
| 4: Punch works       | 60              | Taller routes, two wall punchers per route                  |
| 5: High vaults       | 70              | Highest routes, three punchers each, full-floor spike traps |

After each scored result, choose **Next round**, collect ready checks, then **Load scored round**. Players continue through the loading instructions; the host starts the eight-second countdown separately. Round 5 ends with Crowd Rush complete and persistent standings. Host **Arena → Apply settings** can jump directly to any round for testing; choosing an arena sets its duration preset, which you can override. Advancing resets to the next duration preset. Practice lasts 20 seconds, awards no earnings, and does not enable Next round.

Amber warns as hazards wind up; red indicates a strike. Round 4 wall punchers launch bears sideways; round 5 combines them with floor spikes. Wait for retraction or jump clear. Falls and floor spikes return you to your start without a redundant notification. Pause freezes movement, platforms, hazards and timers together. Solid platform sides/undersides and chamber walls/roofs prevent walking through geometry. Bear-to-bear collisions remain disabled. Posters, books, lamps and other small trim are decorative. Low graphics disables shadows/particles and reduces rendering resolution.

For an officer test: run practice, then all five scored rounds with Next round. Check entry/exit confirmation, vault splits, jumps, moving-platform carry, spike warnings, camera clipping, refresh/reconnect and persistent standings. Default scored time totals 4m20s; discussions, practice, ready checks and transitions add time. Difficulty and workshop pacing still need a real group rehearsal. Battlefield/poker and new sound/animation polish remain separate work.

## Saved players and reset

Names, bear appearance and session tokens are saved in browser localStorage. The server also saves player identity, appearance and earnings to STATE_FILE (default data/state.json). HOST_KEY is only the host password; changing it does not reset players.

To start a fresh room while preserving the previous room, stop the server and start it with a new file:

```sh
HOST_KEY='your-secret' STATE_FILE=data/new-workshop.json npm run dev
```

To choose a new name/appearance in the same room, clear this site's browser storage and reload (or use a separate browser profile). This creates a new player; the previous player's server record and earnings remain. Keep the same STATE_FILE to recover existing players and scores. Durations and reward settings currently reset to defaults on server restart.

The current UI is neutral Game Theory / Crowd Rush, without maroon colors; supplied club artwork appears as physical room decor. Earlier screenshots and design notes record previous iterations.

## Lobby and movement polish

The lobby is 35% wider, with matching furniture collision and a wider spawn spread. Bears remain solid here but do not block one another; rounds keep other bears translucent. Keyboard look only: WASD / arrows / Space. Chat is lobby-only (160 characters, 1.5-second send interval, escaped text); use the Emotes button or E for Wave, Scuba and Dance. Emotes are synchronized, last three seconds, and yield to walking. Round chat is disabled; a collapsible, scrollable event feed reports server-confirmed falls, punches, spike hits and vault entries. The room keeps the latest 80 social entries in memory; they are not persisted.

Air momentum now survives releasing movement keys, with lighter steering and braking than on the ground. Jump velocity is 7.8. Round 2 keeps small-step assistance and adds a larger gap; rounds 3–5 alternate rise sizes and have larger rest landings. Highest vault elevations increase to 6 / 8.1 / 10.2 units across rounds 3 / 4 / 5. Moving-platform rates increase per round (2.2 / 2.9 / 3.5 / 4.2 rad/s). Round 5 spikes fill their entire landing: warning is safe, extension causes a particle pop and respawn; gloves apply a sideways bounce instead.

The instruction board uses fixed perspective lettering and gentle bobbing (disabled for reduced-motion preference). Arena walls use large hints instead of small lobby posters. The lobby heading settles into a smaller caption after arrival. Startup and state-file handling remain unchanged.

## Final Crowd Rush polish

Round 3–5 now offer an optional purple Sky chamber above spawn, reached using automatic jump pads and aerial WASD steering. Its configurable default pool is **480**; other pools remain 120/240/360. Sky is absent from rounds 1–2. Sky heights are 11 / 14 / 17 units, with narrower pads in round 5. The circular lobby connects through a hall to a dedicated practice gym with ten ascending landings, moving/flipping/shrinking platforms, a puncher, full-floor spikes, and a launch pad. Falling onto the gym floor returns the bear to the lobby center.

Moving-platform angular speeds are now 2.2 / 2.9 / 3.5 / 4.2 radians/second in rounds 2–5. Puncher cycles begin at 4.4 seconds in round 4 and 3.1 seconds in round 5, with small route offsets. Spikes retain their five-second warning/strike cycle. Character facing persists while idle; wave/scuba poses blend in/out and point outside the torso. Supplied club artwork is mounted on walls; hint boards pose questions rather than announcing the next round.

Names and lobby chat use server-side local profanity/slur checks, Unicode normalization and basic leetspeak/spaced-letter detection, alongside escaped rendering and existing rate limits. This is a bounded English filter, not comprehensive moderation across all languages or evasions. Rejected names leave the join form available for correction. Existing stored inappropriate names become “Bear” on restart. The broader login/customization redesign remains deferred; the instructional loading flow is described below.

## Final balancing pass

Midair input accelerates at 24 units/s² and opposing input brakes at 48 units/s² until forward motion reverses; release still brakes at only 0.5 units/s². Ground movement is unchanged. Wave frequency increased; Scuba keeps the nose paw in front and sweeps the other arm forward from side to side.

Round-three Diamond now has two moving landings versus Gold’s one. Sky routes use four / five / six launch pads in rounds 3 / 4 / 5, heights 11 / 14 / 17, and narrower pads in round 5. Rounds 4–5 add timed flipping and shrinking Sky landings. Flip cycles last 3.2 seconds: flat face, quarter-turn, narrow vertical edge, then return; transitional poses are not walkable and use conservative box bounds for side collision. Shrink cycles last two seconds, with a brief bob warning, reduction to 38% width/depth, then expansion. Player standing on a moving landing is carried by the shared simulation.

Landing is resolved before lateral penetration so descending bears can land on vault-floor corners. Logo artwork in the lobby now uses a framed two-post sign. Practice gym coordinates are in world units beyond the circular lounge; its course reaches a seven-unit top landing. No player collisions or lobby stacking were added. The loading/countdown flow is described below.

## Loading, countdown and final feedback

The initial lobby and each new round show a blurred, animated three-step instruction card with Continue. Buttons enable after room artwork loads, two frames render and shaders compile. The server stores scene-ready and continued flags separately; no loading timeout starts play automatically. The host’s separate countdown action requires every connected eligible player to continue. A disconnected player does not block; reconnecting during loading clears that player’s readiness, and players joining during loading can participate. Joining after countdown begins waits until the next round. Loading acknowledgements include the round number, so old acknowledgements cannot unlock a new round. Continue waits for scene readiness.

The pre-round countdown appears once, from 8 to 1: 8–4 white, 3 red, 2 yellow, 1 green. The gameplay clock returns to the top-center HUD; its last ten seconds fade red and pulse, with reduced-motion support. E opens the emote wheel; 1/2/3 select Wave/Scuba/Dance and E/Escape close it. Inputs, textareas and editable text suppress the shortcut.

Lobby cameras retain the normal camera distance even behind tunnel/wall geometry; occlusion is allowed instead of automatic camera shortening or boundary correction. Visible rotated vault floors now match their rotated authoritative colliders, including Diamond’s previously mismatched corner. Midair reverse braking is eased from 60 to 48, retaining 24 normal air acceleration and 0.5 release drag.

## Browser-session recovery

Google sign-in is not required. Keep the same URL and browser profile: the browser saves a private random player token plus name/appearance, and STATE_FILE saves the player record and earned scores. Refresh/reopen shows the saved entrance profile and Rejoin lobby. During countdown, active practice/scoring, or results, rejoining moves the player to a separate waiting lobby, excludes them from the current payout, and shows round status/time. They can move/chat/emote there; the next host-loaded round admits connected waiting players through the normal loading/Continue gate. Joining while a round is still loading can participate in that loading round.

A temporary socket disconnect within the same page automatically reconnects with its temporary page ID, retaining current-round eligibility if that round is still ongoing. The server freezes disconnected players; they earn zero if still disconnected at the deadline. No catch-up payout is awarded. A second tab takes over the existing player instead of duplicating their score; it follows the fresh-page lobby path. Private browsing, clearing site storage, another browser/device, or changing the URL origin creates a different identity. Keep STATE_FILE on durable storage when hosting. Page IDs are private, temporary, and omitted from public snapshots and saved state.

## Sound and menu

Audio is enabled by default after the first click/key interaction. Menu → Mute audio saves the preference. Quiet synthesized cues cover hovering/clicking controls, personal jumps, ready confirmation, countdown/start, vault entry and results. Lobby emotes use the supplied audio clips locally: Wave, Scuba, Dance and Griddy (E, then 1–4). Emotes repeat until movement/jumping cancels; sound/animation fades out and stops on disconnect or round loading. Other players' jumps/emotes and decorative entrance bears are silent for your client.

Menu remains available during entry, lobby and rounds, with theme, sound, graphics, reduced-motion, Rules and a controls reminder. Host Gather ready checks highlights Confirm ready; server confirmation turns it green and displays Ready confirmed.

Audio polish: button sounds are limited to primary actions and menu controls; hover sounds only on Play/Continue. Wave repeats after a short pause. Griddy moves the bear slowly forward in the lobby until manual movement/jumping cancels. Hazard/platform sounds attenuate with distance and elevation; only the nearest two platform mechanisms contribute ambience. Scored/practice rounds tick once per second during their last ten seconds, with no heartbeat layer.
