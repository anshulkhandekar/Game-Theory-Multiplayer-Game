// Main lounge coordinates only; no practice entrances or routes are changed.
export const ADVISORS = [
  {
    id: "pip",
    name: "Pip",
    game: "Crowd Rush",
    role: "Small bear. Big brain.",
    x: -5,
    z: -6.5,
    color: "#c3abec",
    tips: [
      [
        "Basics",
        "Follow the crowd? Maybe not.",
        "Each reward pool is split among the players who choose it. A smaller pool with fewer people can pay you more than a crowded gold rush.",
      ],
      [
        "Basics",
        "Count yourself, too.",
        "If a pool has 60 points and two other players choose it, joining them makes three shares. Your reward would be 20, not 30.",
      ],
      [
        "Strategy",
        "Make the whole trip count.",
        "Compare the reward you expect with the time and difficulty of reaching it. A reliable route can beat a bigger prize you never reach.",
      ],
      [
        "Strategy",
        "Watch where everyone goes.",
        "Player choices are clues, not promises. Look for an overlooked route, but remember that others may notice the same opening.",
      ],
      [
        "Advanced",
        "Think one move ahead.",
        "Imagine everyone switches to your tempting empty pool. Would it still be attractive? A good choice accounts for how others respond to the same information.",
      ],
      [
        "Advanced",
        "Stay a little unpredictable.",
        "Always choosing the same route makes you easy to anticipate. Vary your choices when several routes offer similar expected rewards.",
      ],
    ],
  },
  {
    id: "atlas",
    name: "Atlas",
    game: "Battlefield",
    role: "Built different. Plans better.",
    x: 0,
    z: -6.5,
    color: "#a5d8ba",
    tips: [
      [
        "Basics",
        "Win fronts, not the size contest.",
        "The stronger army wins each front. Coordinate with your teammates so your shared resources earn territory across the three fronts. A giant army on one front can still lose the round.",
      ],
      [
        "Basics",
        "Bigger is not automatically better.",
        "In rounds 1 and 2, a troop costs 1, a turret 5 and a tank 10. Each resource buys one strength, so one tank has the same base strength as ten troops.",
      ],
      [
        "Strategy",
        "Put a price on the supply front.",
        "From round 2, the marked supply front pays more territory. Both teams see that reward, so expect competition there. Sometimes the other fronts are cheaper wins.",
      ],
      [
        "Strategy",
        "Counter what you can see.",
        "From round 3, troops counter turrets, turrets counter tanks, and tanks counter troops. The bonus depends on the enemy mix; a counter is useful, but it does not guarantee a win.",
      ],
      [
        "Advanced",
        "Strong walls have a tradeoff.",
        "From round 4, a fortification costs 5 for 6 strength, with at most two per front. It cannot counter or be countered by the three original units. In round 5, artillery can gain a bonus against it.",
      ],
      [
        "Advanced",
        "Leave room for the last move.",
        "Preparation is visible, but final orders are private. Discuss who covers each front, then reconsider what your opponents are likely to change. Round 5 adds artillery and raises the team budget from 60 to 90.",
      ],
    ],
  },
  {
    id: "ace",
    name: "Ace",
    game: "Poker Showdown",
    role: "Sharp suit. Sharper reads.",
    x: 5,
    z: -6.5,
    color: "#ebcd94",
    tips: [
      [
        "Basics",
        "Know what you are betting on.",
        "Poker is about decisions with incomplete information. You know your own card, but your opponent’s actions are clues about theirs. These are Kuhn poker preview tips; the workshop rules arrive with game three.",
      ],
      [
        "Basics",
        "Three cards, plenty of mind games.",
        "Classic Kuhn poker uses J, Q and K, with K highest. Each player gets one card. A bet can mean confidence in a strong card, or a bluff with a weak one.",
      ],
      [
        "Strategy",
        "Do not pay for every story.",
        "Calling every bet makes bluffing unprofitable, but lets strong cards earn too much. Folding every time makes you easy to bluff. Balance the two.",
      ],
      [
        "Strategy",
        "A bluff needs a reason.",
        "A weak card sometimes wins by making a better card fold. Ask how often your opponent needs to fold for your bluff to pay off, rather than bluffing just for the thrill.",
      ],
      [
        "Advanced",
        "Protect your strong bets.",
        "If you bet only with strong cards, opponents can fold confidently. Mixing some bluffs into the same action keeps your bets harder to read.",
      ],
      [
        "Advanced",
        "Adapt without chasing.",
        "Use repeated patterns as evidence, but do not treat one lucky hand as proof. Choose a strategy that earns points over many hands, rather than trying to win back the last loss.",
      ],
    ],
  },
];
export function nearbyAdvisor(player) {
  if (
    !player ||
    !Number.isFinite(player.x) ||
    !Number.isFinite(player.z) ||
    player.y > 2
  )
    return null;
  return (
    ADVISORS.find(
      (a) => Math.hypot(player.x - a.x * 1.35, player.z - a.z * 1.35) < 2.65,
    ) || null
  );
}
