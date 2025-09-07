import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5173;

// Persistent data directory (Render disk recommended: set DATA_DIR=/data)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE  = path.join(DATA_DIR, 'scores.json');
const WIN_FILE = path.join(DATA_DIR, 'window.json');

function currentWindowId(){ return Math.floor(Date.now() / (30*60*1000)); }

function readJSON(file, fallback){
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, obj){
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }
  catch(e){ console.error('write fail', e); }
}

// Initialize window file if missing
if (!fs.existsSync(WIN_FILE)) writeJSON(WIN_FILE, { id: currentWindowId() });
if (!fs.existsSync(DB_FILE)) writeJSON(DB_FILE, []);

// Runtime config.js from env (no rebuild needed)
app.get('/config.js', (req, res) => {
  const X_URL = process.env.X_URL || "";
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
  res.type('application/javascript').send(
    `window.APP_CONFIG={X_URL:${JSON.stringify(X_URL)},CONTRACT_ADDRESS:${JSON.stringify(CONTRACT_ADDRESS)}};`
  );
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/config.js') return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function ensureWindow(){
  const cur = currentWindowId();
  const stored = Number(readJSON(WIN_FILE, {id: NaN}).id);
  if (!Number.isFinite(stored) || stored !== cur){
    writeJSON(WIN_FILE, { id: cur });
    writeJSON(DB_FILE, []); // reset scores on window rollover
  }
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolAddress(s){ return typeof s==='string' && BASE58_RE.test(s) && s.length>=32 && s.length<=44; }

app.get('/api/reset-if-needed', (req,res)=>{ ensureWindow(); res.json({ ok:true, window: readJSON(WIN_FILE,{id:null}).id }); });

app.get('/api/leaderboard', (req,res)=>{
  ensureWindow();
  const scores = readJSON(DB_FILE, []);
  const byWallet = new Map();
  for (const row of scores){
    if (!row || !row.wallet) continue;
    const sc = Number(row.score) || 0;
    const prev = byWallet.get(row.wallet);
    if (!prev || sc > prev.score) byWallet.set(row.wallet, { wallet: row.wallet, score: sc, at: row.at || Date.now() });
  }
  const unique = Array.from(byWallet.values()).sort((a,b)=> b.score - a.score);
  res.json({ leaderboard: unique.slice(0, 50) });
});

app.post('/api/score', (req,res)=>{
  ensureWindow();
  const { wallet, score } = req.body || {};
  if (!isLikelySolAddress(wallet)) return res.status(400).json({ error:'invalid wallet' });
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return res.status(400).json({ error:'invalid score' });

  const all = readJSON(DB_FILE, []);
  let found = false;
  for (let i=0;i<all.length;i++){
    if (all[i].wallet === wallet){
      all[i].score = Math.max(all[i].score||0, n);
      all[i].at = Date.now();
      found = true;
      break;
    }
  }
  if (!found) all.push({ wallet, score: n, at: Date.now() });
  all.sort((a,b)=> b.score - a.score);
  writeJSON(DB_FILE, all.slice(0, 2000));
  res.json({ ok:true });
});

app.listen(PORT, ()=> console.log(`ScaleUp (Snake) server at http://localhost:${PORT}`));
