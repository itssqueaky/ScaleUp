import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5173;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'scores.json');
const WIN_FILE = path.join(__dirname, 'window.json');

function currentWindowId(){ return Math.floor(Date.now() / (30*60*1000)); }
function readScores(){ try{ return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return []; } }
function writeScores(arr){ try{ fs.writeFileSync(DB_FILE, JSON.stringify(arr, null, 2)); } catch(e){ console.error('write fail', e); } }
function readWindow(){ try{ return Number(JSON.parse(fs.readFileSync(WIN_FILE,'utf8')).id); } catch { return NaN; } }
function writeWindow(id){ try{ fs.writeFileSync(WIN_FILE, JSON.stringify({ id }), 'utf8'); } catch(e){ console.error('write win fail', e); } }
function ensureWindow(){
  const cur = currentWindowId();
  const stored = readWindow();
  if (!Number.isFinite(stored) || stored !== cur){
    writeWindow(cur);
    writeScores([]);
  }
}
ensureWindow();

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolAddress(s){ return typeof s==='string' && BASE58_RE.test(s) && s.length>=32 && s.length<=44; }

app.get('/api/reset-if-needed', (req,res)=>{ ensureWindow(); res.json({ ok:true, window: readWindow() }); });

app.get('/api/leaderboard', (req,res)=>{
  ensureWindow();
  const scores = readScores();
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
  const all = readScores();
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
  writeScores(all.slice(0, 2000));
  res.json({ ok:true });
});

app.listen(PORT, ()=> console.log(`ScaleUp (Snake) server at http://localhost:${PORT}`));
