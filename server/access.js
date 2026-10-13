import { createHmac, timingSafeEqual } from "node:crypto";

export function equalSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !b) return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createAccess({
  eventCode,
  hostKey,
  spectatorKey,
  production = false,
  now = Date.now,
}) {
  if (production && (!eventCode || !hostKey || !spectatorKey))
    throw Error(
      "Production requires EVENT_CODE, HOST_KEY and SPECTATOR_KEY. See HOSTING_GUIDE.md.",
    );
  if (
    eventCode &&
    (eventCode.length < 8 ||
      !hostKey ||
      !spectatorKey ||
      hostKey.length < 16 ||
      spectatorKey.length < 16 ||
      new Set([eventCode, hostKey, spectatorKey]).size !== 3)
  )
    throw Error(
      "Use distinct access secrets: EVENT_CODE at least 8 characters; HOST_KEY and SPECTATOR_KEY at least 16.",
    );
  const enabled = !!eventCode;
  const secret = [hostKey, eventCode, spectatorKey].join("|");
  const sign = (text) =>
    createHmac("sha256", secret).update(text).digest("hex");
  const fromCode = (code) =>
    equalSecret(code, hostKey)
      ? "host"
      : equalSecret(code, spectatorKey)
        ? "spectator"
        : equalSecret(code, eventCode)
          ? "player"
          : null;
  function issue(role) {
    const value = `${role}.${now() + 12 * 60 * 60 * 1000}`;
    return `${value}.${sign(value)}`;
  }
  function role(req) {
    if (!enabled) return "local";
    const native = fromCode(req.headers["x-workshop-code"]);
    if (native) return native;
    const cookie = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("workshop-access="))
      ?.slice(16);
    const match = /^(player|host|spectator)\.(\d+)\.([a-f0-9]{64})$/.exec(
      cookie || "",
    );
    if (
      !match ||
      Number(match[2]) <= now() ||
      !equalSecret(match[3], sign(`${match[1]}.${match[2]}`))
    )
      return null;
    return match[1];
  }
  const viewOf = (req) =>
    new URL(req.url, "http://local").searchParams.get("view");
  function gate(req, res, next) {
    const current = role(req),
      view = viewOf(req);
    if (
      !enabled ||
      (current &&
        (view !== "host" || current === "host") &&
        (view !== "projector" || current === "host" || current === "spectator"))
    )
      return next();
    const requestedView = ["host", "projector"].includes(view)
      ? view
      : "player";
    const label =
      requestedView === "host"
        ? "Host key"
        : requestedView === "projector"
          ? "Projector key"
          : "Workshop code";
    res.set("Cache-Control", "no-store");
    res.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    res
      .status(401)
      .type("html")
      .send(
        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enter the workshop</title><style>body{margin:0;background:#19152d;color:#fff;font:18px system-ui;display:grid;min-height:100vh;place-items:center}form{padding:2rem;max-width:25rem}input,button{display:block;box-sizing:border-box;width:100%;font:inherit;padding:.8rem;margin:1rem 0;border-radius:.6rem}button{background:#dcc26f;border:0}p{line-height:1.5}</style><form method="post" action="/access?view=${requestedView}"><h1>Game Theory</h1><p>Enter the ${label.toLowerCase()} supplied by the workshop host.</p><label>${label}<input name="code" type="password" required maxlength="256" autocomplete="off"></label><button>Enter workshop</button></form></html>`,
      );
  }
  function login(req, res) {
    res.set("Cache-Control", "no-store");
    try {
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        return res.sendStatus(403);
    } catch {
      return res.sendStatus(403);
    }
    const access = fromCode(req.body?.code);
    if (!access)
      return res
        .status(403)
        .type("text")
        .send("Incorrect code. Go back and try again.");
    const view = viewOf(req);
    if (
      (view === "host" && access !== "host") ||
      (view === "projector" && access === "player")
    )
      return res
        .status(403)
        .type("text")
        .send("Use the host or projector key for this view.");
    res.set(
      "Set-Cookie",
      `workshop-access=${issue(access)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${production ? "; Secure" : ""}`,
    );
    res.redirect(
      303,
      view === "host"
        ? "/?view=host"
        : view === "projector"
          ? "/?view=projector"
          : "/",
    );
  }
  return { enabled, role, issue, gate, login };
}
