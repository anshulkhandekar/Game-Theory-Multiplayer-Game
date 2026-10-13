export const WARDROBE = {
  bear: [
    ["panda", "Panda"],
    ["brown", "Brown bear"],
    ["polar", "Polar bear"],
    ["black", "Black bear"],
    ["red", "Red panda"],
  ],
  color: [
    ["mint", "Mint scarf"],
    ["pink", "Pink scarf"],
    ["blue", "Blue scarf"],
    ["yellow", "Yellow scarf"],
    ["none", "No accent"],
    ["bowtie", "Bow tie"],
    ["tie", "Necktie"],
  ],
  hat: [
    ["none", "None"],
    ["cap", "Cap"],
    ["crown", "Crown"],
    ["headphones", "Headphones"],
    ["beanie", "Beanie"],
    ["helmet", "Field helmet"],
    ["frog", "Frog hat"],
    ["duck", "Rubber duck"],
  ],
  glasses: [
    ["none", "None"],
    ["round", "Round"],
    ["money", "Money glasses"],
    ["monocle", "Monocle"],
    ["shades", "Black shades"],
    ["heart", "Heart glasses"],
  ],
  shirt: [
    ["none", "No shirt"],
    ["adsc", "ADSC"],
    ["google", "Google"],
    ["janestreet", "Jane Street"],
    ["amazon", "Amazon"],
    ["equilibrium", "Nash equilibrium"],
    ["poker", "Poker club"],
    ["sweet", "Strawberry milk"],
    ["army", "Panda patrol"],
    ["space", "Space cadet"],
    ["noodle", "Noodle club"],
  ],
};
export function normalizeAppearance(a = {}) {
  return Object.fromEntries(
    Object.entries(WARDROBE).map(([key, options]) => [
      key,
      options.some(([value]) => value === a[key])
        ? a[key]
        : {
            bear: "brown",
            color: "mint",
            hat: "none",
            glasses: "none",
            shirt: "none",
          }[key],
    ]),
  );
}
export function randomAppearance(random = Math.random) {
  return Object.fromEntries(
    Object.entries(WARDROBE).map(([key, options]) => [
      key,
      options[Math.floor(random() * options.length)][0],
    ]),
  );
}
