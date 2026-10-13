const terms = {
  Ante: "The 1 chip each player pays before a hand starts.",
  Pot: "All chips paid into this hand. The winner receives the pot.",
  Hand: "One deal and the decisions that follow it. A workshop round has two hands.",
  Check: "Pass without adding a chip. You stay in the hand.",
  Bet: "Add 1 chip. Your opponent must call or fold.",
  Call: "Match the bet with 1 chip. Then reveal and compare cards.",
  Fold: "Give up this hand. Your opponent wins the pot; you lose your ante.",
  Bluff: "Bet with a weak card to try to persuade your opponent to fold.",
  Showdown: "Reveal both cards. King beats Queen; Queen beats Jack.",
  "Net chips":
    "Chips received minus chips paid. Winning gains 1 chip, or 2 if a bet was called.",
};
export const pokerVocabulary = () =>
  `<details class="poker-vocabulary"><summary>Poker vocabulary</summary><dl>${Object.entries(
    terms,
  )
    .map(([term, meaning]) => `<dt>${term}</dt><dd>${meaning}</dd>`)
    .join("")}</dl></details>`;
