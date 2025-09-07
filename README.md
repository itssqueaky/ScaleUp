# ScaleUp — Snake (v1.3)

New:
- **X.com icon/link** top-left (hidden until you set `X_URL`).
- **Sticky address bar** at bottom showing **only** the contract address; click-to-copy with toast.

Runtime-config (no rebuild needed): edit `public/config.js`
```js
window.APP_CONFIG = {
  X_URL: "https://x.com/yourhandle",
  CONTRACT_ADDRESS: "So1anaBase58AddressGoesHere..."
};
```

Still included: Top-3 highlight, 30m auto-reset (client+server), unique-per-wallet Top 10, +10 scoring, modal text, hero copy.
