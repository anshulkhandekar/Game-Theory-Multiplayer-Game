// Deliberately bounded local moderation, applied before broadcasting or saving names.
// Token matching avoids false positives in ordinary words such as “class”.
const blocked =
  /^(?:fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|motherfuck\w*|nigg(?:er|a)\w*|fagg?ot\w*|kike|retard(?:ed)?|whore\w*|porn\w*|dick|cock)$/i;
export function appropriateText(text) {
  const normalized = text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "")
    .replace(
      /[аɑαеεіıιӏοоρрсϲѕхχу]/g,
      (c) =>
        ({
          а: "a",
          ɑ: "a",
          α: "a",
          е: "e",
          ε: "e",
          і: "i",
          ı: "i",
          ι: "i",
          ӏ: "l",
          ο: "o",
          о: "o",
          ρ: "p",
          р: "p",
          с: "c",
          ϲ: "c",
          ѕ: "s",
          х: "x",
          χ: "x",
          у: "y",
        })[c],
    )
    .replace(
      /[013457@$!]/g,
      (c) =>
        ({
          0: "o",
          1: "i",
          3: "e",
          4: "a",
          5: "s",
          7: "t",
          "@": "a",
          $: "s",
          "!": "i",
        })[c],
    );
  // High-specificity slurs are also rejected inside decorated usernames and across separators.
  // Treat doubled lower-case l as an i disguise here, without rewriting ordinary words.
  const compact = normalized.replace(/[^a-z|]/g, "");
  const severe = /n[i l|]{1,2}g{2,}[ea]+r?s?|f[a]+g{1,3}[o]+t/i;
  if (severe.test(compact)) throw Error("Please use appropriate language.");
  const tokens = normalized.match(/[a-z]+/g) || [];
  const joinedLetters = normalized.replace(
    /(?:\b[a-z][ ._-]+){2,}[a-z]\b/g,
    (s) => s.replace(/[^a-z]/g, ""),
  );
  if (
    tokens.some(
      (t) =>
        blocked.test(t) || blocked.test(t.replace(/([a-z])\1{2,}/g, "$1$1")),
    ) ||
    (joinedLetters.match(/[a-z]+/g) || []).some((t) => blocked.test(t))
  )
    throw Error("Please use appropriate language.");
  return text;
}
