# Running Battlefield at the workshop

Open http://localhost:3000/?view=host and authenticate with the existing officer host key. Keep the server and the existing tunnel running. Players use the same game URL and pandas they used for Crowd Rush. Refresh tabs after an app update.

## Normal workshop sequence

1. Finish Crowd Rush and return everyone to the lobby. Start **Battlefield matching**. Players have 30 seconds to choose up to two friends or leave their choices random. You can select **Form teams now** to finish early. Matching is best effort; the displayed team sizes reflect actual attendance. Confirmed teams stay fixed throughout Battlefield.
2. Teams load into the Oasis map for an unscored practice. Give them a moment to look around their barracks, terminals and three marked fronts. This exploration stage has no allocation timer. Units cannot be purchased yet.
3. Select **Start animated tutorial**. Players click through three illustrated steps and select **Finish briefing · Ready**. The host sees `ready / connected participants`; disconnected or lobby-waiting players do not block the count. Finished players can keep exploring.
4. Select **Start preparation** once everyone is ready. If a player is stuck or unavailable, **Start without waiting** explicitly overrides the ready check. Purchases open and the 45-second timer begins.
5. The server automatically runs **45 seconds visible preparation → 15 seconds private final orders → five-second frozen countdown → ten seconds of combat → results**. No host clicks are needed during that sequence. The countdown is a warning to watch the fight, not extra buying time. Last valid purchases stand without a Lock click.
6. Review results and the discussion prompt. Practice adds no points. Select **Load scored round 1**, allow exploration, show its briefing and start preparation again.
7. Repeat for rounds 2–5. Each has a shorter briefing highlighting the new rule. Results stay on screen until you advance; there is no automatic jump into the next round.
8. After scored round 5, select **Return to lobby**. Lobby **Total Points** shows Crowd Rush earnings plus Battlefield territory. Individual event scores remain stored separately. This is a raw sum; cross-activity normalization and Poker are not implemented.

**Pause simulation** freezes timers, movement and purchases, including the fight countdown. **Resume** continues the remaining time. **Begin private orders** ends preparation early. **Fight now** ends private changes and begins the five-second countdown. These manual shortcuts are useful for demonstration, but normal workshop timers advance automatically.

The host controls are on the right. The normal player screen has a compact wallet/timer, collapsed team chat/resources, and Lock/Unlock. The purchase panel appears only at a nearby own-team terminal and closes when the player walks away. Players stay in their marked home territory during exploration, preparation and the frozen countdown. Barriers drop when combat starts, so players can walk closer to any battle during combat and results. Loading the next round returns them to their own bases and restores the barriers. An outer perimeter keeps the decorative background separate. Players do not collide with each other.

## Exact round progression

| Round / map | Team resources | Units / prices | New rule | Territory for winning a front |
|---|---:|---|---|---|
| 1 · Oasis | 60 | Troop 1; turret 5; tank 10 | Each resource buys one base strength. | 1 on all three fronts |
| 2 · Wildflower plains | 60 | Same | The supply front is more valuable. No unit counters yet. | Supply 2; fields 1 |
| 3 · Mountain valley | 60 | Same | Troops counter turrets; turrets counter tanks; tanks counter troops. | 1 on all fronts |
| 4 · Redrock canyon | 60 | Same, plus fortification 5 | Each fort adds 6 strength; maximum two per team front. Ordinary unit counters stay active. | 1 on all fronts |
| 5 · Volcanic highlands | 90 | Same, plus artillery 8 | Artillery adds 8 base strength and a bonus against forts. Other mechanics stay active. | Supply 3; fields 2 |

Resources split into personal whole-number wallets, with equal total resources for every team. Two-person teams receive 30 each in rounds 1–4; triples receive 20 each. Round 5 shares are 45 and 30 respectively. Each player can spend on any own-team front. Wallets and units reset each volley; earned territory carries forward.

More effective strength wins. Ties split the front's territory; empty versus empty awards nothing. All members receive the same team territory, regardless of their personal spending. Counters add up to 50% of the countering unit's own base strength, proportional to the enemy army strength it counters. Two turrets against only one tank therefore have 15 effective strength versus 10. Against a mixed army, the bonus is smaller. Artillery's bonus is proportional to the enemy effective base-strength share in fortifications; no fortifications means no artillery bonus.

Players may recall their own purchases for a full refund during visible or private preparation. They can request another teammate's unspent resources during visible preparation; the donor must approve. Transfers close when private orders begin. An absent teammate's wallet can be managed by a connected teammate at that teammate's own-team terminal. Locks must be released before changing that wallet's purchases.

## Solo testing

In the lobby host desk, expand **Battlefield solo demo**, choose 2–40 participants and the team-size preference, then select **Start solo demo**. No real player is needed. Demo pandas and scores are disposable and do not persist.

- **Preview player screen** hides the host desk and standings. You still pilot the selected panda. **Show demo controls** restores the desk.
- Select **Start animated tutorial**, switch to player preview, click through the actual briefing and finish it. Restore the desk to start preparation. The readiness count includes ready bots and your selected pilot.
- Demo planning timers start held. Select **Enable round timer** to test the automatic 45/15/5-second sequence, or use **Begin private orders** and **Fight now** for a faster test. The five-second countdown always runs unless paused.
- **Preview round → Load selected round** resets wallets/purchases with the same roster and returns to exploration. Use it to inspect each map and its briefing.
- **Walk as** switches your pilot; **Visit … terminal** places it near one of its own screens. Press E to buy. WASD moves, arrows look, Space jumps, Escape closes the purchase panel. The bottom-center binocular hotbar uses **1** to equip/put away. Move the mouse to look through the zoomed first-person lenses; if mouse capture is unavailable, drag on the world. Escape also puts them away. Tutorials/countdowns automatically put them away.
- **Map overview** and **Low graphics** are optional demo inspection tools. Entering player preview restores the close camera. Background aircraft/tracers and formation density are reduced on low graphics; reduced-motion preferences stop nonessential motion. Jet formations fly on both sides of the map, helicopters circle the perimeter, and the cloud-textured sky and more articulated panda titans fill out the scene.
- Existing sound controls mute combat, explosions, construction cues and distant ambience together. Tank/artillery booms, sharper turret bursts, infantry shots, a short synthesized panda yelp, aircraft engines, rotor noise, mechanical titan sounds and distant impacts use bounded voices with compression. Weapon flashes and barrel recoil accompany combat. Classroom listening and volume balance still need your assessment.

## Lobby practice

The widened hallway clearly labels **Game 1 · Crowd Rush practice** straight ahead and **Game 2 · Blotto** to the left when facing parkour. Follow the gold floor arrows into the enclosed, lit room for Colonel Blotto practice. Enter the room and press E. Place the 1, 2 and 3 cards once each across three fronts; the bot commits its own shuffled cards before you choose. Reveal to compare fronts and play again. Every player has an independent bot match, with no workshop points or shared capacity limit. Other player pandas become translucent on entering the practice hallway; Battlefield pandas remain opaque.

Players can open **Menu → Workshop info · 3 games** to see the overall goal, the practice directions and the planned Game 3 Poker/bunker practice. That third practice is not implemented yet. Onboarding tips hide while information/practice panels are open.

Results now show one card per front in supply/field order: whom your team beat/lost to/tied with, both effective strengths, the gap and territory earned, followed by a strategy question. Practice cards say what they **would earn**.

## If something goes wrong

After a host-page refresh, authenticate again; the active round remains on the server. Rejoining players keep their confirmed team and wallet. Use the contextual **Player controls** for lobby/disconnect/kick management. Returning a player to the lobby excludes their ready check and leaves their wallet available to teammates. Do not start a real participant reset or change the state file while the workshop is running.

Validation covers automated rules, shared movement, readiness/privacy/countdown handling and a 40-client protocol rehearsal. It does not certify 40 simultaneously rendered laptops, campus Wi-Fi latency or subjective audiovisual quality. Leave time for a short multi-device rehearsal.
