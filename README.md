# Game Theory Workshop

A real-time multiplayer activity featuring Crowd Rush, Battlefield (Colonel Blotto), and Kuhn Poker, with a shared lobby, host controls, and projector view. The current participant limit is **40**.

## Architecture

- **Client:** JavaScript and Three.js render procedural 3D scenes; HTML/CSS provide the interface. Canvas-generated textures, PNG artwork, Web Audio, and MP3 clips supply visuals and sound.
- **Server:** Node.js, Express, and `ws` serve the client and synchronize gameplay over WebSockets. The server owns movement validation, timing, private game information, and scoring.
- **Storage:** A private JSON state file preserves player identities, scores, and round history. Browser storage retains reconnect tokens and preferences. A restart returns the activity to the lobby; it does not resume an active round.
- **Build:** Vite packages the client into `dist/`. `src/` contains client code, `server/` server code, `shared/` common rules/protocol helpers, and `public/` artwork/audio.

## Local development

Requires Node.js **22.12–22.x** and npm.

```sh
npm ci
HOST_KEY=local-dev-only npm run dev
```

Open:

- Player: `http://localhost:3000/`
- Host: `http://localhost:3000/?view=host`
- Projector: `http://localhost:3000/?view=projector`

Use `local-dev-only` in the host sign-in form. Without an `EVENT_CODE`, development skips attendee/projector access gates. Keep this mode local. `.env` is not automatically loaded by npm commands.

## Production and Railway

Deploy the repository root as **one Node service** from a private GitHub repository. No separate frontend or database service is required.

1. Set the build command to `npm ci && npm run build` and start command to `node server/index.js`.
2. Attach a persistent volume at `/data`; keep one service instance.
3. Configure the variables below. Let Railway supply `PORT`.
4. Set the healthcheck path to `/health`, disable Serverless/sleep for the event, and generate a public domain. HTTPS/WSS are handled by Railway.
5. Test joining, a round, reconnects, and saved scores on actual devices before the event. Disable GitHub autodeploys during play; deploy/restart only between rounds.

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `STATE_FILE` | `/data/workshop.json` |
| `EVENT_CODE` | Unique attendee code, at least 8 characters |
| `HOST_KEY` | Independent host secret, at least 16 characters |
| `SPECTATOR_KEY` | Independent projector secret, at least 16 characters |

Generate administrative secrets separately with `openssl rand -hex 24`. All three access secrets must differ. Share only the attendee code; enter administrative secrets in their sign-in forms, never in URLs. Keep `.env` and saved state out of Git.

For a local production run, copy `.env.example` to `.env`, replace its placeholders, then:

```sh
npm run build
node --env-file=.env server/index.js
```

Use the same player, host, and projector paths on the deployed domain. Host controls select activities, manage readiness/rounds, moderate players/chat, and control projector cameras/audio. Battlefield requires team matching before play. Click the projector scene once to enable browser audio.

## Checks

```sh
npm test
npm run test:integration
npm run build
```

Load scripts in `tests/` modify room state; use a separate server and disposable state file. Do not run them against a live workshop.
