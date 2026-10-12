import { BATTLE_ROUNDS } from "../shared/battlefield.js";
const tankIcon = `<svg viewBox="0 0 100 65" aria-hidden="true"><rect x="8" y="36" width="75" height="23" rx="10" fill="#243b44"/><path d="M16 36L23 24H67L78 38Z" fill="#9bbb90"/><rect x="31" y="15" width="30" height="18" rx="6" fill="#c2d0a7"/><path d="M55 20H94" stroke="#c2d0a7" stroke-width="7"/><g fill="#708579"><circle cx="22" cy="47" r="6"/><circle cx="39" cy="47" r="6"/><circle cx="56" cy="47" r="6"/><circle cx="73" cy="47" r="6"/></g></svg>`;
const turretIcon = `<svg viewBox="0 0 100 65" aria-hidden="true"><rect x="23" y="46" width="51" height="13" rx="5" fill="#293b48"/><path d="M34 45L38 28H60L64 45Z" fill="#d5a79a"/><rect x="30" y="15" width="38" height="16" rx="5" fill="#e5b7a0"/><path d="M60 19H93M60 27H93" stroke="#e5b7a0" stroke-width="6"/></svg>`;
export function lessonScene(kind = "battle") {
  if (kind === "terminal")
    return `<div class="lesson-animation lesson-print" aria-label="A tank assembles and moves from the barracks to a front"><span class="lesson-barracks">Barracks</span><i class="lesson-laser"></i><span class="lesson-unit">${tankIcon}</span><span class="lesson-destination">Your front</span></div>`;
  if (kind === "private")
    return `<div class="lesson-animation lesson-private"><span>Visible preparation<br><b>45 seconds</b></span><i>→</i><span>Private changes<br><b>15 seconds</b></span><i>→</i><span>Orders frozen<br><b>5… 4… 3… 2… 1</b></span></div>`;
  const counter = kind === "counter";
  return `<div class="lesson-animation lesson-battle"><div class="lesson-army friendly"><i>${counter ? turretIcon : tankIcon}</i><small>${counter ? "2 turrets · counter bonus" : "1 tank + 5 troops"}</small><b>15 strength</b></div><div class="lesson-impact">VS<span class="lesson-shot"></span></div><div class="lesson-army enemy"><i>${counter ? tankIcon : turretIcon}</i><small>${counter ? "1 tank" : "2 turrets"}</small><b>10 strength</b></div><strong class="lesson-win">15 beats 10 · You win this front</strong></div>`;
}
export function battlefieldLessons(b, team, people, escape, id) {
  const config = BATTLE_ROUNDS[b.round - 1];
  const roster = team
    ? team.members
        .map((pid) =>
          escape(people.find((p) => p.id === pid)?.name || "Absent bear"),
        )
        .join(", ")
    : "Teams keep the same roster throughout Battlefield.";
  if (b.round === 1)
    return [
      {
        title: "Win fronts with a shared plan",
        art: "battle",
        text: "Your goal is to win territory by putting your limited resources where they make the biggest difference. On each front, a stronger army overpowers the enemy. An overwhelming win on one front can still leave your other two fronts undefended.",
        note: `${team ? escape(team.name) + ": " + roster + ". " : ""}Your team has ${config.budget} resources, and your own wallet starts with ${b.wallets[id] ?? "a personal share"}. You can help on any of your three fronts. Equal strength splits the territory, and when both armies are empty, neither team earns territory.`,
      },
      {
        title: "Buy at your barracks",
        art: "terminal",
        text: "Walk to a screen and press E, or click it. Choose a unit and quantity, check the price, then confirm. Units print automatically and move to their front.",
        note: "A troop costs 1 resource and adds 1 strength. A turret costs 5 and adds 5, while a tank costs 10 and adds 10. For now, every resource buys the same strength. If you change your plan, you can recall your own units for a full refund before the countdown.",
      },
      {
        title: "Watch your opponents, then commit",
        art: "private",
        text: "Watch enemy deployments during preparation. Last-minute changes become private for 15 seconds. The five-second countdown freezes all purchases, then every front fights together.",
        note: "Use team chat to coordinate or ask a teammate for unspent resources during visible preparation. Transfers close when private orders begin. Each round gives you a fresh wallet, while earned territory carries forward. Walking or jumping never changes your army’s strength, and practice does not award workshop points.",
      },
    ];
  const detail = {
    2: "The supply front is now worth 2 territory, compared with 1 for each field. Your units still cost the same and have the same strength. That extra reward gives both opponents a reason to compete harder for supply. How much of your budget should you risk there?",
    3: "Your choice of unit now matters: troops counter turrets, turrets counter tanks, and tanks counter troops. A counter can add up to 50% extra strength, depending on how much of the enemy army it counters. For example, two turrets beat one tank with 15 effective strength against 10. Prices stay the same, and every front is worth 1 territory again.",
    4: "You can now reinforce a front with fortifications. Each costs 5 resources but adds 6 strength, and your team can build up to two on each front. Ordinary units cannot counter a fortification, although forts don’t earn their own counter bonus. The troop, turret and tank counters still apply.",
    5: "For the final round, your team gets 90 resources and access to artillery. An artillery unit costs 8 and adds 8 base strength, with up to 50% extra against enemy fortifications. All your earlier units and counters remain available. The stakes also rise: supply awards 3 territory and each field awards 2.",
  };
  return [
    {
      title: `Round ${b.round} · What changes`,
      art: b.round === 3 ? "counter" : "terminal",
      text: detail[b.round],
      note: `Same team: ${roster}. Your fresh wallet: ${b.wallets[id] ?? "your personal share"}. Team budget: ${config.budget}.`,
    },
    {
      title: "The same timing, a new decision",
      art: "private",
      text: "You have 45 seconds to prepare in public, followed by 15 seconds to change your orders privately. Once the five-second countdown begins, your purchases freeze and all fronts fight together. Watch your opponents and coordinate with your team before committing.",
      note:
        config.prompt +
        " You can still recall units before the countdown for a full refund. Your territory carries forward, but each round resets units and wallets.",
    },
  ];
}

export const resultUnitIcon = tankIcon;
