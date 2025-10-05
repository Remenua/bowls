
'use strict';

/* ===== DOM ===== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const resetBtn = document.getElementById('reset');
const loseVeil = document.getElementById('loseVeil');
const winVeil  = document.getElementById('winVeil');
const loseScoreEl = document.getElementById('loseScore');
const winScoreEl  = document.getElementById('winScore');
const restartFromLose = document.getElementById('restartFromLose');
const restartFromWin  = document.getElementById('restartFromWin');
const loseArt = document.getElementById('loseArt');

const W = canvas.width, H = canvas.height;

/* ===== Track ===== */
const path = [
  {x: 70,  y: H*0.55},
  {x: 200, y: H*0.40},
  {x: 340, y: H*0.50},
  {x: 480, y: H*0.32},
  {x: 610, y: H*0.42},
  {x: 720, y: H*0.60},
  {x: 840, y: H*0.48},
  {x: 930, y: H*0.48}
];
let roadWidth = 130; const roadHalf = ()=>roadWidth/2; let margin = 8;

/* ===== Precompute lengths ===== */
const segLen = []; let totalLen = 0; const prefix = [0];
for(let i=0;i<path.length-1;i++){ const a=path[i], b=path[i+1]; const L = Math.hypot(b.x-a.x, b.y-a.y); segLen.push(L); totalLen += L; prefix.push(totalLen); }

/* ===== Ball (no auto-centering) ===== */
const ball = { x: path[0].x, y: path[0].y, r: 16, vx:0, vy:0, angle:0 };
const physics = { friction: 0.985, accel: 0.366, maxSpeed: 9.0 };

let running = true;

/* ===== Input ===== */
const input = { active:false, x:0, y:0, lastX:0, lastY:0, swipeVX:0, swipeVY:0 };
const TAP_WINDOW_MS = 900; let tapTimes = []; let boost = 1.0;

function registerTap(){
  const now = performance.now(); tapTimes.push(now);
  while(tapTimes.length && now - tapTimes[0] > TAP_WINDOW_MS) tapTimes.shift();
  const tps = tapTimes.length / (TAP_WINDOW_MS/1000);
  boost = 1.0 + Math.min(0.5, tps * 0.10); // мягкий буст до +50%
}

function worldPos(evt){ const r = canvas.getBoundingClientRect(); return { x: (evt.clientX - r.left) * (canvas.width / r.width), y: (evt.clientY - r.top)  * (canvas.height / r.height) }; }

function startDrag(x,y){ input.active=true; input.x=x; input.y=y; input.lastX=x; input.lastY=y; input.swipeVX=0; input.swipeVY=0; registerTap(); }
function moveDrag(x,y){ input.x=x; input.y=y; }
function endDrag(){
  // флик на отпускании — последний толчок
  const len = Math.hypot(input.swipeVX, input.swipeVY);
  if(len>0.5){ ball.vx += (input.swipeVX/len) * physics.accel * 1.2; ball.vy += (input.swipeVY/len) * physics.accel * 1.2; }
  input.active=false;
}

/* Events */
canvas.addEventListener('mousedown', e=>{ const p=worldPos(e); startDrag(p.x,p.y); });
window.addEventListener('mousemove', e=>{ if(!input.active) return; const p=worldPos(e); moveDrag(p.x,p.y); });
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); startDrag(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchmove',  e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); moveDrag(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchend',   e=>{ e.preventDefault(); endDrag(); }, {passive:false});

/* Geometry */
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function distPointToSegment(px,py, ax,ay, bx,by){
  const abx = bx-ax, aby = by-ay; const apx = px-ax, apy = py-ay; const ab2 = abx*abx + aby*aby;
  const t = ab2 ? clamp((apx*abx + apy*aby)/ab2, 0, 1) : 0;
  const qx = ax + t*abx, qy = ay + t*aby; const dx = px-qx, dy = py-qy; const d = Math.hypot(dx,dy);
  return { d, qx, qy, t, abx, aby };
}
function distToPolyline(px,py){
  let best = { d: Infinity, qx:0, qy:0, seg:0, t:0, abx:1, aby:0 };
  for(let i=0;i<path.length-1;i++){ const a=path[i], b=path[i+1]; const r = distPointToSegment(px,py,a.x,a.y,b.x,b.y); if(r.d < best.d){ best = { ...r, seg:i } } }
  return best;
}
function arcLengthAt(px,py){ const info = distToPolyline(px,py); const i = info.seg; const t = info.t; return prefix[i] + t * segLen[i]; }

/* Panels */
function hidePanels(){ loseVeil.classList.remove('show'); winVeil.classList.remove('show'); }
function showLose(){
  running=false; loseScoreEl.textContent = scoreMeters();
  if(loseArt){ loseArt.style.animation='none'; void loseArt.offsetWidth; loseArt.style.animation='loseArtIn .42s ease-out forwards, lightningPulse 2.6s ease-in-out .42s infinite alternate'; }
  loseVeil.classList.add('show');
}
function showWin(){ running=false; winScoreEl.textContent  = scoreMeters(); winVeil.classList.add('show'); }

function reset(){
  hidePanels(); running=true;
  ball.x = path[0].x; ball.y = path[0].y; ball.vx=0; ball.vy=0; ball.angle=0;
  input.active=false; tapTimes.length=0; boost=1.0; scoreEl.textContent='0';
}

/* Update */
function update(){
  if(!running) return;
  // input → impulse
  if(input.active){
    const dx = input.x - input.lastX; const dy = input.y - input.lastY; input.lastX = input.x; input.lastY = input.y;
    const alpha = 0.35; input.swipeVX = (1-alpha)*input.swipeVX + alpha*dx; input.swipeVY = (1-alpha)*input.swipeVY + alpha*dy;
    const len = Math.hypot(input.swipeVX, input.swipeVY);
    if(len > 0.3){
      let ax = (input.swipeVX/len) * physics.accel * boost;
      let ay = (input.swipeVY/len) * physics.accel * boost;
      const aMax = 0.9; const aLen = Math.hypot(ax,ay); if(aLen>aMax){ ax*=aMax/aLen; ay*=aMax/aLen; }
      ball.vx += ax; ball.vy += ay;
    }
  }
  // integrate
  const v = Math.hypot(ball.vx, ball.vy);
  if(v > physics.maxSpeed){ ball.vx *= physics.maxSpeed/v; ball.vy *= physics.maxSpeed/v; }
  ball.vx *= physics.friction; ball.vy *= physics.friction;
  ball.x += ball.vx; ball.y += ball.vy;

  // lose by center only
  const info = distToPolyline(ball.x, ball.y);
  if(info.d > (roadHalf() - margin)) { showLose(); return; }
  const goal = path[path.length-1]; if(Math.hypot(ball.x-goal.x, ball.y-goal.y) < 28) { showWin(); return; }

  scoreEl.textContent = scoreMeters();

  // keep inside canvas
  ball.x = clamp(ball.x, 0, W); ball.y = clamp(ball.y, 0, H);

  // spin
  const step = Math.hypot(ball.vx, ball.vy); const circumference = Math.PI*2*ball.r; ball.angle += (step/circumference)*(Math.PI*2);
}

/* Score */
function scoreMeters(){ const s = arcLengthAt(ball.x, ball.y); return Math.max(0, Math.round(s/10)); }

/* Render */
function drawBackdrop(){ ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = '#0c1222'; for(let x=0; x<=W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); } for(let y=0; y<=H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); } ctx.restore(); }
function drawRoad(){ ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.42)'; ctx.lineWidth=roadWidth+14; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke(); ctx.strokeStyle='#1b2637'; ctx.lineWidth=roadWidth; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke(); ctx.setLineDash([16,14]); ctx.strokeStyle='#9fb4cc'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
function drawStartFinish(){ const start=path[0], goal=path[path.length-1]; ctx.fillStyle='#22c55e33'; ctx.beginPath(); ctx.arc(start.x,start.y,26,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle='#22c55e'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('СТАРТ', start.x, start.y-36); ctx.fillStyle='#eab3081a'; ctx.beginPath(); ctx.arc(goal.x,goal.y,28,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#facc15'; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle='#facc15'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('ФИНИШ', goal.x, goal.y-36); }
function drawBall(){ const g = ctx.createRadialGradient(ball.x-6, ball.y-8, 4, ball.x, ball.y, ball.r+2); g.addColorStop(0,'#bcd7ff'); g.addColorStop(1,'#3b82f6'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#1d4ed8'; ctx.lineWidth=2; ctx.stroke(); ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(ball.angle); ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-ball.r+3,0); ctx.lineTo(ball.r-3,0); ctx.stroke(); for(let i=0;i<4;i++){ ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.arc(0, ball.r*0.55, 2.2, 0, Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill(); } ctx.restore(); }

function draw(){ ctx.clearRect(0,0,W,H); drawBackdrop(); drawRoad(); drawStartFinish(); drawBall(); }

function loop(){ update(); draw(); requestAnimationFrame(loop); }

/* Boot */
function init(){ reset(); loop(); }
init();
