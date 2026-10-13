const panda = `<svg class="lesson-panda" viewBox="0 0 120 112" aria-hidden="true"><ellipse cx="60" cy="99" rx="35" ry="9" fill="#132c25" opacity=".3"/><ellipse cx="60" cy="83" rx="29" ry="25" fill="#e9e3cf"/><path d="M33 77L51 70H69L88 77L84 106H36Z" fill="#334b42"/><path d="M58 76L53 89L60 99L67 89L62 76Z" fill="#a65754"/><circle cx="30" cy="28" r="14" fill="#202e32"/><circle cx="90" cy="28" r="14" fill="#202e32"/><ellipse cx="60" cy="48" rx="39" ry="34" fill="#f1ecdd"/><ellipse cx="44" cy="47" rx="10" ry="13" transform="rotate(24 44 47)" fill="#202e32"/><ellipse cx="76" cy="47" rx="10" ry="13" transform="rotate(-24 76 47)" fill="#202e32"/><circle cx="45" cy="46" r="3" fill="#fff"/><circle cx="75" cy="46" r="3" fill="#fff"/><ellipse cx="60" cy="61" rx="6" ry="4" fill="#202e32"/><path d="M53 69Q60 74 67 69" fill="none" stroke="#202e32" stroke-width="2"/></svg>`;
export const lessonTitles = [
  "Receive your card",
  "Make a decision",
  "Understand the result",
];
export function pokerLesson(page, example, card) {
  const chip = (n) => `<i class="teaching-chip">${n}</i>`;
  const table = (own, other, pot, caption) =>
    `<div class="teaching-table"><div class="teaching-seat you">${panda}${card(own, "You")}<span>Your card</span></div><div class="teaching-pot">${chip(pot)}<strong>${pot} chips in the pot</strong><small>${caption}</small></div><div class="teaching-seat rival">${panda}${card(other, "Opponent")}<span>${other ? "Opponent’s card" : "Opponent’s hidden card"}</span></div></div>`;
  if (page === 0)
    return {
      title: "Win chips against one opponent",
      text: `<p>You and another player each receive <b>one card</b> from a deck containing a Jack, Queen and King. You can see your card, but you cannot see theirs. The unused card stays hidden.</p><p>Before you act, each of you puts <b>one chip</b> into the middle. This opening payment is called an <b>ante</b>, and the chips in the middle are called the <b>pot</b>.</p><p>Your goal is to win the pot. If you both reveal your cards at the end, <b>the higher card wins</b>.</p>`,
      art: `<div class="teaching-ranks">${["J", "Q", "K"].map((r, i) => `<div>${card(r)}<span>${["Jack", "Queen", "King"][i]}</span></div>`).join("<i>&lt;</i>")}</div>${table("Q", null, 2, "One chip from each player")}<p class="teaching-caption">You know you have a Queen. Your opponent could have a Jack or a King.</p>`,
      note: "You never need to form a five-card poker hand. Only the rank of your one card matters.",
      button: "Learn which buttons to use",
    };
  if (page === 1) {
    const stage = example.stage || "choose";
    const done = stage === "win" || stage === "fold";
    const status = {
      choose: "You have a King and act first. Try either button below.",
      response:
        "You checked, and your opponent bet one chip. Now you can call or fold.",
      win:
        example.path === "bet-call"
          ? "Your opponent called your bet, so you both reveal cards. Your King beats their Queen and you gain 2 chips overall."
          : "You matched their bet by calling. Your King beats their Queen when you reveal, so you gain 2 chips overall.",
      fold: "You folded, so your opponent wins without showing their card. You lose your 1-chip ante.",
    }[stage];
    const controls =
      stage === "choose"
        ? ["check", "bet"]
        : stage === "response"
          ? ["call", "fold"]
          : ["again"];
    return {
      title: "Choose what to do when it is your turn",
      text: `<p>With no bet to match, choose <b>Check</b> to keep playing without adding a chip, or <b>Bet</b> to put one more chip in the pot.</p><p>If your opponent bets, choose <b>Call</b> to add one chip and compare cards, or <b>Fold</b> to give up the hand. Folding loses the chip you already paid as your ante.</p><p>If you both check, compare cards immediately. A called bet also ends with a card comparison. <b>You cannot raise the bet.</b></p>`,
      art: `<span class="teaching-example-label">Try a hand here · No workshop points</span>${table("K", stage === "win" ? "Q" : null, stage === "choose" ? 2 : stage === "win" ? 4 : 3, stage === "win" ? "You each paid 2 chips" : stage === "choose" ? "No one has bet yet" : "Your opponent has bet")}<div class="teaching-actions">${controls.map((a) => `<button data-example="${a}">${{ check: "Check", bet: "Bet 1 chip", call: "Call 1 chip", fold: "Fold", again: "Try the other choice" }[a]}</button>`).join("")}</div><p class="teaching-caption" aria-live="polite">${status}</p>`,
      note: "During the real game, only the two actions available to you will appear. Their buttons explain what each choice does.",
      button: "Learn how bluffing can win",
    };
  }
  const called = example.called;
  return {
    title: "A bet can make your opponent fold",
    text: `<p>A <b>bluff</b> means betting with a weak card to persuade your opponent to fold. Here you have a Jack and bet one extra chip. They cannot see it, so they may believe you have a King.</p><p>If they fold, you collect three chips after paying two. That leaves you <b>one chip ahead</b>. Your opponent loses their ante.</p><p>If they call, both cards are revealed. The player with the lower card <b>loses two chips</b>: their ante and their extra bet. A bluff can win without the higher card, but it risks a larger loss when called.</p>`,
    art: `${table("J", called ? "Q" : null, called ? 4 : 3, called ? "The opponent called your bet" : "The opponent folded to your bet")}<div class="teaching-outcome ${called ? "loss" : "win"}">${called ? "Your Jack loses to a Queen. You lose 2 chips." : "Your opponent folded. You gain 1 chip."}</div><button class="teaching-alternative" data-example="${called ? "hide" : "reveal"}">${called ? "Show the fold outcome" : "What if they call instead?"}</button><p class="teaching-caption">${called ? "You lose the ante and the extra chip you bet." : "The pot includes the chips you paid; your profit is smaller than the pot."}</p>`,
    note: "After this tutorial, explore until the host starts. Each of five rounds has two hands, with players alternating who goes first. Your chip gains and losses add up.",
    button: "Finish tutorial and explore",
  };
}
