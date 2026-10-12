# Milestone 3 — Battlefield

## Current polish: feedback fixes

Added clear enclosed lobby practice routes, three-game workshop info, binocular hotbar with mouse look, a separate fight countdown cue, perspective-correct three-front result cards, clearer tutorial prose, combat-only free roaming with next-round boundary reset, cloud sky texture, jet squadrons on both sides, more detailed articulated panda titans, explosions, unit recoil/muzzle flashes and differentiated bounded positional battle/ambient sound. Rules, resource economy and team formation remain unchanged. Current verification: 90 tests plus build and browser checks. See BATTLEFIELD_HOST_GUIDE.md and the newest HANDOFF.md section for current controls and runtime.

## Immersive maps and host-led briefings

Implemented the agreed polish: textured terrain, a distant club hangar/banner/panda flags, animated background aircraft and robotic pandas, anchored terminal screen artwork and markers, checkout auto-close, more base spacing and enforced home territories, bounded combat audio, clean demo Player screen toggle and animated pre-round briefings. Host controls exploration → tutorial/readiness → timed 45/15/5-second sequence → combat/results. Later briefings teach the actual supply/counter/fort/artillery progression. Independent local Colonel Blotto bot practice is accessible from the lobby's left hallway branch; lobby Total Points sums the two raw event scores. See BATTLEFIELD_HOST_GUIDE.md for operation and exact rules. Current verification: 87 tests, production build, 40-client rehearsal and browser checks. Production updated on port 3000 with original key/state preserved; temporary preview stopped. Workshop rendered-device capacity and sound balance remain human rehearsal tasks.

## Personal wallets and barracks terminals

The user requested a Clash-of-Clans/Roblox-style deployment experience. This supersedes the front-owner model in the historical planning sections below. All players can buy on every front from their own personal wallet using three independent 3D screens under a detailed barracks tent. A checkout shows unit, quantity, exact cost and remaining balance before confirmation. Units assemble at a scanner pad, then march/roll to that front’s outlined patch. Recall refunds only that wallet’s purchases; no teammate can recall another connected player’s units. Ledger totals determine combat, independent of visual travel or player movement.

Equal team totals remain 60 resources (rounds 1–4) and 90 (round 5), split into whole personal shares. Two-person teams get 30/45 each; triples get 20/30 each. For small four-person teams, any indivisible remainder is distributed as one extra resource to selected members. Wallet requests/acceptances conserve unspent resources; transfers end before private orders. Purchases/refunds require an own-team terminal within seven world units and reject invalid counts, unavailable units, overspending, wrong-team wallets, stale volley requests, locks and duplicate receipts.

Default team counts are even and prefer sizes 2–3. 20/21/22 participants produce 8 teams; 29/30 produce 10 teams. Matching previews sizes, prioritizes mutual requests without guaranteeing friend groups, and confirms the final roster before practice. Rosters never change on round transitions. Bases retain reciprocal three-front scheduling, with expanded spacing to fit barracks and defenders. Small two-team rehearsals use three paired fronts.

Units: troop cost/base strength 1; turret 5; tank 10. Round 3 counters remain troop → turret → tank → troop, with the proportional bonus from the settled first-iteration rules. Round 4 fortifications remain cost 5/strength 6, capped at two per team front. Round 5 adds artillery cost/base strength 8, receiving up to 50% extra strength according to the opposing base-strength share in fortifications. Other units receive no counter bonus against artillery. Supply/field territory values, practice, no elimination and separate per-activity scores remain unchanged.

Solo demo: authenticated hosts select 2–40 simulated participants and Automatic/prefer-2 team sizing. The preview lists actual sizes before start. Bots purchase during public preparation; the selected panda is controlled by the host. Controls include switch bear, visit own terminal, preview round 1–5, close/overview camera, low graphics, timer hold/enable, pause and manual final/fight. The default demo timer is held while simulation/construction continue. Loading a demo round resets purchases/wallets and preserves teams. Synthetic identities/scores never persist or alter real Crowd Rush/Battlefield standings.

Rendering uses authored procedural models, merged geometry and instancing, bounded formations/effects, shared wall collision, server-clock construction/deployment and reduced-motion behavior. Formation labels show exact counts. Private orders and construction events go only to teammates; enemies retain their last public visual preview until reveal. Any opponent data cached by the renderer comes only from previously public snapshots.

Latest validation: 82 tests, production build, a 40-client purchase/scoring rehearsal through practice and five scored rounds, plus browser checks of 16/40 actor demos and purchase/refund/artillery flows. Workshop-scale rendered-device performance and subjective visual polish remain unverified. Poker and production deployment stay outside this revision.


Drafted October 9, updated October 11, 2026. This is the next-chat planning brief, not implemented functionality. Read HANDOFF.md and inspect current code before beginning. Officer feedback fixes have been implemented and the user confirmed movement/audio improvements. Latest onboarding/dome polish is implemented; 69 tests and production build pass. Full workshop-scale testing remains unverified.

## Recommendation and gate

Use the next chat to settle Battlefield's rules, scoring examples, screen flow and teaching prompts. Keep milestone three focused on activity two; Poker remains milestone four. Avoid another broad cosmetic pass until officer feedback identifies a need.

Review any new feedback from the approximately six-player rehearsal: join/ready/start flow, loading override, disconnect/reload recovery, host removal, movement after several minutes, sound fatigue, readability and outfit rendering. Known movement/audio blockers were addressed; fix any newly reported reproducible blockers first. Track smaller observations separately so preferences do not repeatedly expand the MVP.

If officers are still testing, keep the currently shared port3000/ngrok room untouched. No restart, build replacement, participant reset or tunnel change for next-activity development. Use an isolated checkout and separate runtime/state if development overlaps testing; do not accidentally serve its build through the live server's dist directory. Never reuse live STATE_FILE for test clients. Close test clients and stop temporary servers afterward.

## Intended learning experience

Battlefield should make allocation decisions visible and understandable: how much scarce strength to place on each front, which opponent behavior to expect, and how to coordinate within a team. Results should explain the tradeoff, not merely celebrate a winner.

Keep the shared bear identity, outfits, lobby and host/projector workflow. Bears can represent players around a planning table or battlefield; precise movement and parkour skill should not determine the allocation result.

## Existing requirements to preserve

- Prefer teams of three, with adjacent team sizes supported; friend requests and balanced remaining assignments.
- Each team controls three fronts against opponents. Players own fronts and can request/transfer deployment resources.
- Equal total team budgets regardless of team size. Budgets reset each volley; territory points accumulate.
- Greater committed strength wins; ties split points. No elimination. All teammates receive the same event score.
- Three clear unit options initially. Special mechanics require explicit balancing before adding them.
- Visible preparation, a short private final-order phase, then simultaneous animated resolution.

The current documents do not fully specify opponent scheduling or edge cases. Do not silently replace these requirements with a different game.

## Proposed smallest complete version

1. Host introduces allocation rules with one worked example, then forms teams and shows assignments. Players can see their own team/front responsibilities.
2. One unscored practice volley teaches allocation and locking orders. Team view shows remaining budget and valid allocations; server rejects overspending and unauthorized transfers.
3. Three scored volleys use the same published rules. Players prepare, finalize privately, and see all fronts resolve together. Timers are host-controlled; a missing click cannot permanently block the room.
4. Results show committed strength, opposing strength, tie/win/loss, territory awarded and the exact team total. A short host-led question connects decisions to the learning objective.
5. Return everyone to the existing lobby with identity, outfit, Crowd Rush earnings and separate Battlefield results preserved.

Initial units can use transparent cost/strength pairs, such as 1/1, 2/2 and 3/3, without surprise abilities. This is a proposal for a readable baseline, not a settled balance decision. State explicitly if the units are interchangeable in strength-per-cost rather than implying hidden strategic differences.

Proposed front scoring: win = 1 territory point, tie = 0.5 each, loss = 0. Clarify whether an empty-versus-empty front awards nothing before implementation. Use a small fixed budget that supports meaningful choices, chosen together with the opponent schedule.

## Decisions for the next chat

- **Opponent/front schedule:** How do three fronts map to three opponents? With six testers there may be only two teams. Propose a two-team practice fallback with three paired fronts; approve the larger-group schedule separately, including odd team counts and unequal sizes.
- **Team formation:** Define mutual friend requests, request deadline, group-size limits and host override. An automatic balanced assignment is a fallback; it does not permanently replace the requested friend feature.
- **Resource transfer:** Decide whether transfers require the recipient's acceptance and which phase permits them. Show remaining team budget and locked orders clearly.
- **Final-order visibility:** Teammates can coordinate; opponents should not receive provisional allocations or private orders before reveal. Decide whether projector sees aggregate readiness only during planning.
- **Scoring:** Keep raw activity scores separate until tournament normalization is agreed. Do not add Battlefield territory directly to Crowd Rush earnings. A possible bounded per-activity points scheme should be reviewed for team-size fairness and poker variance later.
- **Disconnects:** Proposed policy: preserve the last valid submitted allocation; before final lock, allow a teammate/host to assume an absent player's front. Unsubmitted orders default to zero at deadline. No duplicate budget or late payout on reconnect. Explain these defaults in the UI.

Resolve these with the user before dependent implementation; proceed on independent architecture and worked examples where appropriate.

## Teaching prompts and projector

Provide a brief rule example before practice, then one optional debrief prompt per reveal:

- “Which front did you give up to strengthen another?”
- “What did you expect the opposing team to do?”
- “Did seeing the previous result change your next allocation?”

Crowd Rush can have a separate short debrief about reward sharing and changing choices when a vault gets crowded. Distinguish strategy from route difficulty; a high score alone does not demonstrate understanding or an equilibrium. Poker's later debrief can focus on private information, bluffing and expected payoff.

Projector during preparation: team/front names, phase, timer and readiness counts. During reveal: simultaneous front comparisons and team score explanations. Host retains player-state controls and pause/resume. Do not leak private pending orders through public snapshots, chat, spectator payloads or reconnect responses.

## Implementation boundaries

Introduce a dedicated server Battlefield module and focused shared rules/scoring helpers. Reuse identity, wardrobe, host authentication, transport and recovery patterns. Keep Crowd Rush's lifecycle intact; avoid a wholesale framework or renderer rewrite. Add only the activity switching needed for this milestone.

Server owns team membership, budgets, order permissions, deadlines, locks and once-only resolution. Clients request allocation changes and render server-confirmed state. Scores persist by activity; private planning data is delivered only to authorized team members. Any storage schema addition must read existing saved Crowd Rush records safely.

Defer new skins, more audio, combat physics, special unit abilities, OAuth/database migration, production deployment and final tournament scoring unless separately requested.

## Acceptance checks

- Budget validation, transfers, ownership and phase locks cannot be bypassed by crafted requests.
- Wins/ties/losses and defaults match worked examples; each volley resolves exactly once.
- Team size does not change total available budget or each teammate's event score.
- Opponent orders remain private until reveal, including public projector and reconnect snapshots.
- Unequal/odd groups follow the approved schedule; six-player rehearsal can run a full activity.
- Pause freezes deadlines; delayed/missing players cannot block forever; reconnect cannot duplicate orders, budget or score.
- Returning to lobby preserves outfit, identity and separate activity results.
- Existing Crowd Rush/recovery/wardrobe tests pass, production build passes, and no test identities remain in the officer room.
- Officers complete practice and scored volleys and can explain at least one allocation tradeoff. Human acceptance is distinct from automated test success.

## Workshop pacing proposal

Aim for approximately 8 minutes Crowd Rush, 9 minutes Battlefield, 7 minutes Poker and 3 minutes of shared transitions/debrief: 27 minutes total. This is a draft budget to rehearse, not verified timing. Shorten scored repetitions before removing the worked examples and debriefs.

## Suggested opening request for the next chat

“Read HANDOFF.md, MILESTONE_3.md and PERFORMANCE_REPORT.md. Preserve the live officer room and the accepted Crowd Rush, lobby and Battlefield. We’re ready to settle the Poker rules, teaching flow, matching and tournament scoring, then implement milestone four.”

## Settled first-iteration rules — October 11

The user confirmed visible preparation/private final orders, simple initial strength followed by later counters, and friend matching only when transitioning from solo Crowd Rush to Battlefield. Build the five-round structure together, then refine rounds in sequence through visual feedback.

- Host starts a 30-second team-matching window after Crowd Rush. Players select up to two friends or Random. Mutual requests take priority, with balanced random filling. Even team counts permit three reciprocal fronts without dummy opponents. Typical teams have 2–4 members; small rehearsals use two teams with three paired fronts. Four-team clusters use all three other bases; other even counts use a symmetric ring plus opposite-base front. Players with no front in a four-person team support through chat; front assignments rotate each scored round. Host can reassign owners during instructions.
- Unscored practice, then five scored rounds: Oasis, Wildflower plains, Mountain valley, Redrock canyon, Volcanic highlands. Three short instruction steps precede each round; host controls the start and can override unfinished readers.
- Each round has 45 seconds of public saved deployments and 15 seconds of private final orders. Teammates retain full visibility. Projector/host see public preparation, readiness and revealed results, never private final orders or team chat.
- Every team gets 60 resources per round, increasing to 90 in round 5. Each front starts with one third. Troops cost/provide 1; heavy units 5; tanks 10. Unit counts are whole numbers. Save is explicit; locked fronts cannot change until unlocked. Deadline uses the latest valid saved order regardless of lock; unsaved fronts deploy zero.
- Round 2 doubles the supply-front territory reward. Round 3 introduces the cycle: troops counter heavy, heavy counter tanks, tanks counter troops. Bonus = 0.5 × own unit strength × enemy army strength share of its countered type. Fortifications are excluded from both sides of counter calculations.
- Round 4 unlocks up to two fortifications per front: cost 5, strength 6. Round 5 combines counters/fortifications and awards 3 territory for supply and 2 on each other front. Every team has one front of each reward class.
- A recipient requests unspent resources from another front; its owner approves or declines. Only public preparation permits transfers. Locked fronts cannot transfer. Total resources are conserved. Private team chat supports seated teams throughout the activity.
- Greater effective strength wins; ties split the published territory reward; empty-versus-empty awards zero. No elimination. Losing two fronts collapses a base visually for that round. Every teammate receives the same activity score, including disconnected teammates. Battlefield territory persists separately from Crowd Rush earnings; tournament normalization stays deferred.
- Disconnected/host-removed owners retain saved orders; connected teammates can control their fronts. Reconnect restores the existing team and saved allocation. New players after matching watch until the next team formation; no budget is minted on reconnect. Host retains pause/resume, lobby/removal/kick/allow controls.

Implementation uses shared/battlefield.js, server/battlefield.js, src/battlefield-ui.js and src/battlefield-world.js with small integration changes. Terrain and units are procedural first-pass visuals, not a finished art pass. Decorative terrain has no combat physics. Human acceptance, actual 20–40 rendered devices, WAN performance, sound balance and whole-workshop pacing still need rehearsal. Poker remains milestone 4.

## Final pre-Poker polish — October 11

Implemented: distinct distant structures on all five maps, batched static scenery, separate paired-demo front paths, personal/team remaining-resource wallet, distant rifle/artillery audio, nonoverlapping lobby practice floors and themed Crowd Rush stage sets with physical round timer. Networking has shared public snapshots, owner-private fields, independent input/action budgets, bounded error replies/backpressure and low-level snapshot compression. Rules and team budgets remain as settled above.

Latest verification: 96 tests, production build, 40-client Crowd Rush all-five-arena rehearsal, 40-client Battlefield practice plus five rounds with 20Hz input, flood/slow-reader tests and browser visual checks. PERFORMANCE_REPORT.md records timings, bandwidth and actual-device/Wi-Fi limits. Milestone 4 is Poker; no Poker mechanics were added in this pass.
