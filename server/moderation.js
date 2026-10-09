// Deliberately bounded local moderation, applied before broadcasting or saving names.
// Token matching avoids false positives in ordinary words such as “class”.
const blocked =
  /^(?:fuck\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|motherfuck\w*|nigg(?:er|a)\w*|fagg?ot\w*|kike|retard(?:ed)?|whore\w*|porn\w*|dick|cock)$/i;
export function appropriateText(text) {
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200b-\u200f]/g, "")
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
  const tokens = normalized.match(/[a-z]+/g) || [];
  const joinedLetters = normalized.replace(
    /(?:\b[a-z][ ._-]+){2,}[a-z]\b/g,
    (s) => s.replace(/[^a-z]/g, ""),
  );
  if (
    tokens.some((t) => blocked.test(t)) ||
    (joinedLetters.match(/[a-z]+/g) || []).some((t) => blocked.test(t))
  )
    throw Error("Please use appropriate language.");
  return text;
}
