(function(){
const els = {
  wallet: document.getElementById('wallet'),
  walletMsg: document.getElementById('walletMsg'),
  playBtn: document.getElementById('playBtn'),
  board: document.getElementById('board'),
  start: document.getElementById('start'),
  pause: document.getElementById('pause'),
  score: document.getElementById('score'),
  leader: document.getElementById('leader'),
  lbStatus: document.getElementById('lbStatus'),
  timer: document.getElementById('timer'),
  tapHint: document.getElementById('tapHint'),
  howBtn: document.getElementById('howBtn'),
  modal: document.getElementById('modal'),
  backdrop: document.getElementById('backdrop'),
  closeModal: document.getElementById('closeModal'),
  howText: document.getElementById('howText'),
  resetNote: document.getElementById('resetNote'),
  xLink: document.getElementById('xLink'),
  addrbar: document.getElementById('addrbar'),
  contractAddr: document.getElementById('contractAddr'),
  toast: document.getElementById('toast'),
};
// Read runtime config
const CFG = (window.APP_CONFIG || {});
if (CFG.X_URL){ els.xLink.href = CFG.X_URL; els.xLink.style.display = 'inline-flex'; }
if (CFG.CONTRACT_ADDRESS){
  els.addrbar.style.display = 'flex';
  els.contractAddr.textContent = CFG.CONTRACT_ADDRESS;
  els.contractAddr.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(CFG.CONTRACT_ADDRESS);
      showToast('Copied!');
    } catch {
      showToast('Copy failed');
    }
  });
}
function showToast(msg){
  els.toast.textContent = msg;
  els.toast.style.display = 'block';
  setTimeout(()=> els.toast.style.display = 'none', 1200);
}

// Modal content
const HOW_TEXT = `1. Compete in the mini-game
Play the snake game and try to achieve your higest score.

2. Earn as high of a score as you can
Your best score will be saved and displayed on the leaderboard.

3. Score top 3 to win
Rank in the top 3 of the leaderboard to receive 100% of generated creator fees every 30 minutes.

Prize Distribution
1st Place 60%
2nd Place 30%
3rd Place 10%

good luck and have fun!`;
els.howText.textContent = HOW_TEXT;
// Modal controls
function openModal(){ els.modal.style.display='flex'; els.backdrop.style.display='block'; }
function closeModalFn(){ els.modal.style.display='none'; els.backdrop.style.display='none'; }
els.howBtn.addEventListener('click', openModal);
els.closeModal.addEventListener('click', closeModalFn);
els.backdrop.addEventListener('click', closeModalFn);

// Wallet validation
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolAddress(s) { return !!s && BASE58_RE.test(s) && s.length >= 32 && s.length <= 44; }
const LOCAL_KEY = 'arcade:wallet';
const LOCAL_TOP = 'arcade:leaderboard';
const LOCAL_WINDOW = 'arcade:window30';
els.wallet.value = localStorage.getItem(LOCAL_KEY) || '';
function updateWalletMsg(){
  const ok = isLikelySolAddress(els.wallet.value.trim());
  els.walletMsg.innerHTML = ok ? '<span class="ok">Looks good.</span> You can play and submit scores.' : 'Wallet required to submit scores. This demo only checks Base58 format.';
}
els.wallet.addEventListener('input', updateWalletMsg);
updateWalletMsg();
els.playBtn.addEventListener('click', ()=>{
  const w = els.wallet.value.trim();
  localStorage.setItem(LOCAL_KEY, w);
  if (!isLikelySolAddress(w)) { alert('Enter a valid-looking Solana address (Base58, 32–44 chars).'); return; }
  els.board.focus();
});

// 30m Window helpers
function currentWindowId(){ return Math.floor(Date.now() / (30*60*1000)); }
let windowId = currentWindowId();
function ensureLocalWindow(){
  const stored = Number(localStorage.getItem(LOCAL_WINDOW));
  if (!Number.isFinite(stored) || stored !== windowId){
    localStorage.setItem(LOCAL_TOP, JSON.stringify([]));
    localStorage.setItem(LOCAL_WINDOW, String(windowId));
    els.resetNote.textContent = 'Leaderboard reset for the new 30-minute window.';
  }
}
ensureLocalWindow();

// Rewards timer
function next30mWindow(){ const now = new Date(); const add = 30 - (now.getMinutes() % 30); const end = new Date(now.getTime() + add*60000); end.setSeconds(0,0); return end; }
function refreshTimer(){
  const target = next30mWindow();
  (function tick(){
    const now = new Date(); let diff = target - now;
    if (diff <= 0){
      windowId = currentWindowId();
      ensureLocalWindow();
      fetch('./api/reset-if-needed').catch(()=>{});
      return refreshTimer();
    }
    const mm = String(Math.floor(diff/60000)).padStart(2,'0');
    const ss = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    els.timer.textContent = `${mm}:${ss}`;
    setTimeout(tick, 200);
  })();
}
refreshTimer();

// Snake game
const ctx = els.board.getContext('2d');
const W = els.board.width, H = els.board.height;
const CELL = 20;
const COLS = Math.floor(W / CELL);
const ROWS = Math.floor(H / CELL);
let game = null, loopId = 0;
function resetGame(){
  const startX = Math.floor(COLS/2);
  const startY = Math.floor(ROWS/2);
  game = {
    snake: [{x:startX, y:startY}, {x:startX-1, y:startY}, {x:startX-2, y:startY}],
    dir: {x:1, y:0},
    nextDir: {x:1, y:0},
    food: spawnFood([{x:startX, y:startY},{x:startX-1,y:startY},{x:startX-2,y:startY}]),
    score: 0,
    speedMs: 140,
    running: false,
    over: false,
  };
  els.score.textContent = '0';
  draw();
  showHint(true);
}
function spawnFood(blocked){
  while (true){
    const fx = Math.floor(Math.random()*COLS);
    const fy = Math.floor(Math.random()*ROWS);
    if (!blocked.some(s => s.x===fx && s.y===fy)) return {x:fx, y:fy};
  }
}
function drawGrid(){ ctx.fillStyle = '#081019'; ctx.fillRect(0,0,W,H); ctx.strokeStyle = 'rgba(136,146,166,0.06)'; ctx.lineWidth = 1;
  for (let x=0;x<=COLS;x++){ ctx.beginPath(); ctx.moveTo(x*CELL+0.5,0); ctx.lineTo(x*CELL+0.5,H); ctx.stroke(); }
  for (let y=0;y<=ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*CELL+0.5); ctx.lineTo(W,y*CELL+0.5); ctx.stroke(); } }
function drawSnake(){ const head = game.snake[0]; ctx.fillStyle = '#6ee7ff'; ctx.fillRect(head.x*CELL, head.y*CELL, CELL, CELL);
  ctx.fillStyle = '#8b5cf6'; for (let i=1;i<game.snake.length;i++){ const s = game.snake[i]; ctx.fillRect(s.x*CELL+2, s.y*CELL+2, CELL-4, CELL-4); } }
function drawFood(){ ctx.fillStyle = '#22c55e'; ctx.fillRect(game.food.x*CELL+2, game.food.y*CELL+2, CELL-4, CELL-4); }
function drawScore(){ ctx.fillStyle = '#e6edf3'; ctx.font = '700 20px system-ui,-apple-system,Segoe UI,Roboto,Arial'; ctx.textAlign = 'center'; ctx.fillText(game.score, W/2, 28); }
function draw(){ drawGrid(); drawFood(); drawSnake(); drawScore(); }
function tick(){
  game.dir = game.nextDir;
  const newHead = { x: game.snake[0].x + game.dir.x, y: game.snake[0].y + game.dir.y };
  if (newHead.x < 0 || newHead.y < 0 || newHead.x >= COLS || newHead.y >= ROWS){ return gameOver(); }
  if (game.snake.some(s => s.x===newHead.x && s.y===newHead.y)){ return gameOver(); }
  game.snake.unshift(newHead);
  if (newHead.x === game.food.x && newHead.y === game.food.y){
    game.score += 10; els.score.textContent = game.score; game.speedMs = Math.max(70, game.speedMs - 4); game.food = spawnFood(game.snake);
  } else { game.snake.pop(); }
  draw(); scheduleNext();
}
function scheduleNext(){ if (!game.running) return; loopId = setTimeout(tick, game.speedMs); }
function startGame(){ if (!game || game.over) resetGame(); if (game.running) return; game.running = true; showHint(false); scheduleNext(); }
function pauseGame(){ game.running = false; clearTimeout(loopId); }
function gameOver(){ game.running = false; game.over = true; clearTimeout(loopId); draw(); drawOverlay('Game Over', `Score: ${game.score}`); submitScore(); showHint(true); }
function drawOverlay(text, sub){ ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#e6edf3'; ctx.font='700 26px system-ui,-apple-system,Segoe UI,Roboto,Arial'; ctx.textAlign='center'; ctx.fillText(text,W/2,H/2-8); ctx.font='400 16px system-ui,-apple-system,Segoe UI,Roboto,Arial'; ctx.fillStyle='#8892a6'; if (sub) ctx.fillText(sub,W/2,H/2+20); }
function showHint(on){ els.tapHint.style.display = on ? 'grid' : 'none'; }
// Input
function setDir(x,y){ if (game && (game.dir.x === -x && game.dir.y === -y)) return; game.nextDir = {x,y}; }
document.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') { e.preventDefault(); setDir(0,-1); startGame(); }
  else if (k === 'arrowdown' || k === 's') { e.preventDefault(); setDir(0,1); startGame(); }
  else if (k === 'arrowleft' || k === 'a') { e.preventDefault(); setDir(-1,0); startGame(); }
  else if (k === 'arrowright' || k === 'd') { e.preventDefault(); setDir(1,0); startGame(); }
  else if (k === 'p') { e.preventDefault(); (game && game.running) ? pauseGame() : startGame(); }
});
els.start.addEventListener('click', startGame);
els.pause.addEventListener('click', pauseGame);
// Init
resetGame();
// Leaderboard — unique by wallet, keep best; client shows top 10; highlight top 3
async function fetchLeaderboard(){
  els.lbStatus.textContent = 'Loading…';
  try{
    const res = await fetch('./api/leaderboard');
    if (!res.ok) throw new Error('no server');
    const data = await res.json();
    renderLeaderboard(data.leaderboard);
    els.lbStatus.textContent = 'Live';
  } catch (e){
    const list = JSON.parse(localStorage.getItem(LOCAL_TOP) || '[]');
    renderLeaderboard(list);
    els.lbStatus.textContent = 'Local';
  }
}
function renderLeaderboard(list){
  const byWallet = new Map();
  (list||[]).forEach(row=>{
    if (!row || !row.wallet) return;
    const prev = byWallet.get(row.wallet);
    const score = Number(row.score)||0;
    if (!prev || score > prev.score) byWallet.set(row.wallet, { wallet: row.wallet, score });
  });
  const unique = Array.from(byWallet.values()).sort((a,b)=> b.score - a.score).slice(0,10);
  els.leader.innerHTML='';
  if (unique.length===0){ els.leader.innerHTML = '<p class="muted">No scores yet. Be the first!</p>'; return; }
  unique.forEach((row,i)=>{
    const div=document.createElement('div'); const rank=i+1;
    div.className='row' + (rank===1?' top1': rank===2?' top2': rank===3?' top3':'');
    const rankClass = (rank===1?'rank top1': rank===2?'rank top2': rank===3?'rank top3':'rank');
    const medal = rank===1?'🥇': rank===2?'🥈': rank===3?'🥉':'';
    div.innerHTML = `<div class="${rankClass}">${medal || rank}</div><div class="addr" title="${row.wallet}">${shorten(row.wallet)}</div><div class="score">${row.score}</div>`;
    els.leader.appendChild(div);
  });
}
function shorten(a){ if (!a) return '—'; return a.length<=10?a:(a.slice(0,4)+'…'+a.slice(-4)); }
async function submitScore(){
  const wallet=(localStorage.getItem(LOCAL_KEY)||'').trim();
  if (!isLikelySolAddress(wallet)) return;
  const payload={ wallet, score: game.score };
  try{
    const res=await fetch('./api/score',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    if (res.ok) fetchLeaderboard(); else throw new Error('server rejected');
  } catch {
    const list = JSON.parse(localStorage.getItem(LOCAL_TOP) || '[]');
    const byWallet = new Map();
    list.forEach(r=>{ if (r && r.wallet){ const sc=Number(r.score)||0; const cur=byWallet.get(r.wallet); if (!cur || sc>cur.score) byWallet.set(r.wallet,{wallet:r.wallet,score:sc}); } });
    const cur = byWallet.get(wallet);
    if (!cur || game.score > cur.score) byWallet.set(wallet, { wallet, score: game.score });
    const unique = Array.from(byWallet.values()).sort((a,b)=> b.score - a.score).slice(0, 10);
    localStorage.setItem(LOCAL_TOP, JSON.stringify(unique));
    renderLeaderboard(unique);
  }
}
fetchLeaderboard();
setInterval(()=>{
  const nowWin = Math.floor(Date.now() / (30*60*1000));
  if (nowWin !== Number(localStorage.getItem(LOCAL_WINDOW))){
    localStorage.setItem(LOCAL_WINDOW, String(nowWin));
    localStorage.setItem(LOCAL_TOP, JSON.stringify([]));
    document.getElementById('resetNote').textContent = 'Leaderboard reset for the new 30-minute window.';
    fetchLeaderboard();
  }
}, 2000);
})();