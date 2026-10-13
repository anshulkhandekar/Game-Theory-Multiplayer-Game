# Kuhn Poker workshop guide

The completed build is running at http://localhost:3000/?view=host with the existing officer host key and `data/officer-test.json`. All six saved identities, appearances and scores were preserved. Temporary game servers are stopped; refresh existing player/host/projector tabs to load the new client.

## Host sequence

1. Return to the lobby after Battlefield round 5. Select **Kuhn Poker** in the Game selector, then **Load selected game**. You can also start Poker directly from the lobby for rehearsal; completing the other games is not enforced.
2. Connected prize participants enter the casino. Each reads three animated tutorial pages. They can explore and jump before seating, including after **Finish tutorial · Ready**. The host sees readiness. Rules remain identical through all five rounds; the tutorials repeat for review.
3. Select **Seat players & start round**. Players teleport to two opposite seats and movement/jumping stops on the server and client. A close camera frames the table and opponent; legal decision buttons explain their costs.
4. Each matchup contains **two hands**, with first action alternating. Decisions allow **12 seconds**, followed by a four-second hand reveal. A hand has at most three decisions, so the slowest two-hand round lasts approximately **80 seconds** of hands plus a **five-second seating countdown**. All tables play simultaneously. Five fully timed rounds take at most about 7m05s, excluding host pauses, exploration, tutorials and debriefs. Keep those transitions brief to meet the intended 6–8 minutes; untimed exploration remains host-controlled.
5. Review net chips and the short strategy question. Players stay seated during results. **Load next round & tutorial** unlocks exploration and rotates opponents. Everyone meets a new opponent until all unique pairings are exhausted; smaller rosters necessarily repeat opponents.
6. After round 5, **Return to lobby** shows the three-event tournament total and event breakdown.

Pause freezes decisions, reveals, bots and movement. Resume retains the remaining time. **Start without waiting** overrides tutorial readiness. No manual control can skip team matching and enter Battlefield rounds: Battlefield still uses its own matching, practice and briefing lifecycle.

## Officers and odd attendance

During Poker, **Player controls** retains Lobby/Disconnect/Kick/Allow back, and **Show leaderboard** broadcasts standings without scoring. The projector shows public table progress and tournament standings, never secret cards.

In the lobby, expand **Officer seats · excluded from prizes**, and check the officer's connected character. This persists with their profile. Officers are hidden from participant rendering and prize standings, excluded from Crowd Rush/Battlefield participation, and recruited only when Poker needs an odd seat. Open the officer character in a separate browser profile from any prize participant: same-origin tabs share identity.

An odd roster takes one connected officer, otherwise a non-prize panda bot. If the chosen officer disconnects before seating, a bot replaces that seat. A disconnect during a hand uses the ordinary decision timeout; reconnect restores the same private card and table. New participants after Poker starts wait in the lobby until a new Poker session. Host-removed/kicked players cannot act or score; their old seat times out. Bot and demo identities/scores never persist.

## Rules and timeout decisions

Three-card deck: Jack, Queen, King. One private card per player; the third is unused. Both ante one chip. Check or bet one when no bet is outstanding; call or fold facing a bet. No raises. Both checking or a called bet leads to showdown; the higher rank wins. Net payoff is ±1 chip, or ±2 for a called bet. Nobody runs out of chips or is eliminated.

Timeout: **check when no bet is outstanding; fold when facing a bet**. This conservative fallback never commits an extra chip automatically and is explicitly taught. There is no truly neutral automatic action: a timeout can still lose an ante. Bots make decisions using their own card and the visible action history, never the opponent's secret card.

Only owners receive their private card. Called/check-check showdowns reveal both cards publicly; folds leave the non-owner card hidden. The projector and host observer do not see secret cards. Demo hosts see only the selected pilot's private card.

## Equal-weight tournament scoring

Raw Crowd Rush earnings, Battlefield territory and Poker net chips are retained separately. Each participating non-officer, non-demo, non-kicked player's activity rank converts to a maximum **100 tournament points per game**, for **300 total**. Each game leader earns 100; finishing first in Crowd Rush and Battlefield therefore gives 200 before Poker. Ties share points. Formula: `100 × (1 − players strictly above / (participants − 1))`; a lone participant receives 100. An event without participation receives zero. Rankings update during play and settle after the activity. Legacy positive raw scores count as participation; new scoring also records zero-net participation explicitly.

Lobby standings show Crowd / Field / Poker points beside each total. Officer assignment affects prize eligibility; it never deletes raw scores. Returning to the lobby or restarting the server preserves earned raw scores. An unfinished Poker round is aborted on restart, as with the existing activities.

## Solo demo and lobby practice

Expand **Kuhn Poker solo demo** and choose **2–40 participants**. Two gives one opponent; 20, 23, 24, 29 and 30 let you inspect attendance-dependent layouts. Odd counts receive an extra bot. **Casino overview** hides the roof and shows uniformly spaced seven-unit table centers; **Play as** switches the pilot. **Preview player screen** hides the host panel; **Show demo controls** restores it. Demo scores and pandas are disposable.

The lobby's Game Three practice is through the **right branch when facing the parkour hall**, opposite left-side Blotto. Press E or the practice button in its small casino lounge. Play untimed, individually against a panda dealer with contextual definitions, alternating first action and optional replay. There are no workshop points or capacity limits. Escape, Close or leaving the room dismisses practice.

## Validation

`npm test` covers all six deals and all five betting endings, pairing/layout sizes, readiness, seating/movement lock, pause, owner/public privacy, stale decisions, exactly-once scoring, recovery/removal, officer/bot fallback, normalization and the lobby pad/corridor regressions, alongside previous game tests. Build with `npm run build -- --outDir /tmp/kuhn-poker-dist --emptyOutDir` to avoid replacing the live client.

For a disposable 40-client test only: start an isolated server with its own `PORT`, `HOST_KEY`, `STATE_FILE`, and optionally `CLIENT_DIST`, then run `TEST_URL=ws://localhost:3020 HOST_KEY=poker-load node tests/poker-load.mjs`. Never run this against the officer room.

The casino uses batched static geometry, shared card art, fixed decorative NPC rigs, two bounded interior lights, reduced-motion support and low-graphics scenery reduction. Single-browser checks do not certify forty rendered laptops or campus Wi-Fi. Rehearse actual players, timing, sound and visual quality before the workshop.

## Refinement controls

Seat players & start countdown teleports everyone to their table, locks movement and gives five seconds before cards and twelve-second decisions appear. Start without waiting skips readiness only; it keeps the countdown. Pause freezes the countdown too. Hand results stay visible for four seconds, then the next hand starts. The simplified player panel emphasizes the last opponent action, the available choices and each hand’s chip gain/loss.

On `/?view=projector`, open **Broadcast camera & sound** in the bottom-left corner. Choose Follow a player for any game, Battlefield base for a team’s barracks, Circle the casino for a moving Poker view, or Room overview. Use the target selector and Zoom slider. These controls affect that projector tab only; private cards and orders remain private. Click Enable projector sound once to unlock browser audio. The casino uses original quiet lounge music, nearby slot/jackpot cues and card-dealing sounds; Battlefield combat begins with a low war horn. Saved mute preferences remain available in Menu.

In the main lobby, approach the skin locker and press Enter (or click its prompt). Save outfit & return updates the current identity without reconnecting or changing scores. Keep current outfit cancels. Skin changes are limited to the lobby.
