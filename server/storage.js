import fs from "node:fs";
import path from "node:path";

export function validateState(saved) {
  if (!saved || !Array.isArray(saved.players) || saved.players.length > 300)
    throw Error("Invalid saved player list");
  if (
    saved.registrationOpen !== undefined &&
    typeof saved.registrationOpen !== "boolean"
  )
    throw Error("Invalid registration setting");
  if (saved.roundHistory !== undefined && (!Array.isArray(saved.roundHistory) || saved.roundHistory.some(r=>
    !r || !["crowd","battlefield","poker"].includes(r.kind) || !Number.isSafeInteger(r.play) || !Number.isSafeInteger(r.round) || !Number.isFinite(r.endedAt) || !Array.isArray(r.players)))) throw Error("Invalid saved round history");
  if(saved.lobbyChatEnabled!==undefined && typeof saved.lobbyChatEnabled!=="boolean")throw Error("Invalid lobby chat setting");
  const ids = new Set(),
    tokens = new Set();
  for (const p of saved.players) {
    if (
      !p ||
      typeof p.id !== "string" ||
      typeof p.token !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(p.id) ||
      !/^[a-f0-9-]{36}$/i.test(p.token) ||
      ids.has(p.id) ||
      tokens.has(p.token) ||
      typeof p.name !== "string" ||
      !p.appearance ||
      typeof p.appearance !== "object" ||
      Array.isArray(p.appearance)
    )
      throw Error("Invalid saved identity");
    for (const key of ["earnings", "battlefieldScore", "pokerScore"])
      if (p[key] !== undefined && !Number.isFinite(p[key]))
        throw Error("Invalid saved score");
    ids.add(p.id);
    tokens.add(p.token);
  }
  if (
    saved.scoredRound !== undefined &&
    (!Number.isSafeInteger(saved.scoredRound) || saved.scoredRound < 0)
  )
    throw Error("Invalid saved round");
  return saved;
}

export class StateStore {
  constructor(file) {
    this.file = file;
    this.error = null;
    try {
      if (fs.statSync(file).size > 5 * 1024 * 1024)
        throw Error("Score file exceeds size limit");
      this.lastGood = fs.readFileSync(file, "utf8");
      this.saved = validateState(JSON.parse(this.lastGood));
    } catch (error) {
      if (error.code !== "ENOENT")
        throw new Error(
          `Cannot load score file ${file}. Preserve it and restore a verified backup.`,
          { cause: error },
        );
    }
  }
  atomic(file, text) {
    fs.writeFileSync(file + ".tmp", text, { mode: 0o600, flush: true });
    fs.chmodSync(file + ".tmp", 0o600);
    fs.renameSync(file + ".tmp", file);
  }
  flush(state) {
    try {
      const text = JSON.stringify(validateState(state));
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      if (this.lastGood && this.lastGood !== text)
        this.atomic(this.file + ".bak", this.lastGood);
      this.atomic(this.file, text);
      this.lastGood = text;
      this.error = null;
      return true;
    } catch (error) {
      if (!this.error)
        console.error(
          "Score persistence failed; live scores remain in memory:",
          error.message,
        );
      this.error =
        "Scores are not being saved. Keep this server running and ask the operator to check storage.";
      return false;
    }
  }
}
