# ScaleUp — Snake (Render-ready v6)

- Mobilstøtte: on-screen D-pad + swipe.
- Fjernet footer-tekst.
- Beholder: Top-3 highlight, 30m auto-reset (client+server), unik wallet per plass, +10 score, X-ikon, sticky contract bar.
- Render-klar: vedvarende disk via `DATA_DIR`, runtime `/config.js` fra env vars.

Deploy på Render:
- Build: `npm install` | Start: `npm start`
- Env-vars: `NODE_ENV=production`, `DATA_DIR=/data`, valgfritt `X_URL`, `CONTRACT_ADDRESS`
- Disk: mount `/data`
