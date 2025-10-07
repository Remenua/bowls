'use strict';

/* ===== DOM ===== */
const levelEl = document.getElementById('level');
let   levelIndex = Number(localStorage.getItem('fr_levelIndex') || 0);

const canvas = document.getElementById('game');
const ctx     = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const resetBtn= document.getElementById('reset');

const loseVeil       = document.getElementById('loseVeil');
const winVeil        = document.getElementById('winVeil');
const loseScoreEl    = document.getElementById('loseScore');
const winScoreEl     = document.getElementById('winScore');
const restartFromLose= document.getElementById('restartFromLose');
const restartFromWin = document.getElementById('restartFromWin');
const loseArt        = document.getElementById('loseArt');

const W = canvas.width, H = canvas.height;

/* ===== Кнопки перезапуска (поражение/сброс) ===== */
function onRestart(e){
  if (e) { e.preventDefault(); e.stopPropagation(); }
  reset();
}
['click','touchstart'].forEach(ev => {
  restartFromLose?.addEventListener(ev, onRestart, { passive:false });
  resetBtn       ?.addEventListener(ev, onRestart, { passive:false });
});
// НЕ вешаем обработчик на restartFromWin тут — на победе он делает «следующий уровень»

// Делегирование на всю вуаль (если что-то перекрывает)
loseVeil?.addEventListener('click', (e)=>{
  if (e.target.closest('#restartFromLose')) onRestart(e);
}, { passive:false });

// Хоткей R — перезапуск
window.addEventListener('keydown', (e)=>{
  const k = (e.key || '').toLowerCase();
  if (k === 'r') onRestart(e);
});

/* =================================================================== */
/*                              LEVELS                                  */
/* =================================================================== */

// Уровень — массив точек {x,y} + ширина дороги.
function makeS(bx, by, w, h){
  return [
    {x: bx+0.00*w, y: by+0.55*h},
    {x: bx+0.18*w, y: by+0.40*h},
    {x: bx+0.33*w, y: by+0.52*h},
    {x: bx+0.50*w, y: by+0.32*h},
    {x: bx+0.66*w, y: by+0.44*h},
    {x: bx+0.79*w, y: by+0.62*h},
    {x: bx+0.90*w, y: by+0.50*h},
    {x: bx+1.00*w, y: by+0.50*h},
  ];
}

function makeGentle(seed=1){
  const rand = (()=>{ let s=seed|0; return ()=> (s=Math.imul(48271, s)%0x7fffffff)/0x7fffffff; })();
  const pts = [];
  const Wc = W*0.86, Hc = H*0.70, bx = W*0.07, by = H*0.15;
  const n = 8;
  for(let i=0;i<n;i++){
    const t = i/(n-1);
    const x = bx + Wc*t;
    const y = by + Hc*(0.45 + 0.25*Math.sin( (t*2*Math.PI) + rand()*0.9 ));
    pts.push({x,y});
  }
  return pts;
}

function makeZig(seed=3){
  const rand = (()=>{ let s=seed|0; return ()=> (s=Math.imul(16807, s)%0x7fffffff)/0x7fffffff; })();
  const pts = [];
  const Wc = W*0.86, bx=W*0.07, by=H*0.20, a=H*0.18;
  const n=9;
  for(let i=0;i<n;i++){
    const t=i/(n-1);
    const x=bx+Wc*t;
    const y=by + (i%2? 0.55*H : 0.32*H) + (rand()-0.5)*a*0.2;
    pts.push({x,y});
  }
  return pts;
}

// 7 уровней (легче → сложнее: сужаем ширину)
const levels = [
  { name:'Лесная тропа',     path: makeS(0,0, W*0.95,H), width:130 },
  { name:'Петля дюн',        path: makeGentle(7),        width:125 },
  { name:'Хребет дракона',   path: makeGentle(21),       width:120 },
  { name:'Змеиный перекат',  path: makeZig(5),           width:118 },
  { name:'Туманная балка',   path: makeGentle(42),       width:115 },
  { name:'Обрыв Витиеватый', path: makeZig(11),          width:112 },
  { name:'Каньон шамана',    path: makeGentle(77),       width:108 },
];

/* ===== Текущее состояние трассы/геометрии ===== */
let path = [];                    // активный путь
let roadWidth = 130;              // активная ширина
const roadHalf = ()=> roadWidth/2;
let margin = 8;

let segLen = [];                  // длина каждого сегмента
let totalLen = 0;
let prefix = [0];                 // префиксные суммы для arc-length

function prepareLengths(){
  segLen = []; totalLen = 0; prefix = [0];
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const L = Math.hypot(b.x-a.x, b.y-a.y);
    segLen.push(L); totalLen += L; prefix.push(totalLen);
  }
}

function setLevel(i){
  levelIndex = ((i % levels.length) + levels.length) % levels.length;
  const L = levels[levelIndex];
  path = L.path.map(p=>({x:p.x, y:p.y}));
  roadWidth = L.width || 130;

  if (levelEl) levelEl.textContent = String(levelIndex+1);
  localStorage.setItem('fr_levelIndex', String(levelIndex));

  prepareLengths();

  // сдвиг стартовой позиции шара на начало пути
  ball.x = path[0].x; ball.y = path[0].y; ball.vx=0; ball.vy=0; ball.angle=0;
}

/* =================================================================== */
/*                           GAMEPLAY                                   */
/* =================================================================== */

/* Мяч и физика */
const ball = { x: 0, y: 0, r: 16, vx:0, vy:0, angle:0 }; // координаты выставим при setLevel
const physics = { friction: 0.985, accel: 0.366, maxSpeed: 9.0 };

let running = true;

/* Ввод */
const input = { active:false, x:0, y:0, lastX:0, lastY:0, swipeVX:0, swipeVY:0 };
const TAP_WINDOW_MS = 900; let tapTimes = []; let boost = 1.0;

function registerTap(){
  const now = performance.now(); tapTimes.push(now);
  while (tapTimes.length && now - tapTimes[0] > TAP_WINDOW_MS) tapTimes.shift();
  const tps = tapTimes.length / (TAP_WINDOW_MS/1000);
  boost = 1.0 + Math.min(0.5, tps * 0.10);
}

function worldPos(evt){
  const r = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left) * (canvas.width / r.width),
    y: (evt.clientY - r.top)  * (canvas.height / r.height)
  };
}

function startDrag(x,y){
  input.active=true; input.x=x; input.y=y; input.lastX=x; input.lastY=y;
  input.swipeVX=0; input.swipeVY=0; registerTap();
}
function moveDrag(x,y){ input.x=x; input.y=y; }
function endDrag(){
  const len = Math.hypot(input.swipeVX, input.swipeVY);
  if (len>0.5){
    ball.vx += (input.swipeVX/len) * physics.accel * 1.2;
    ball.vy += (input.swipeVY/len) * physics.accel * 1.2;
  }
  input.active=false;
}

/* Events */
canvas.addEventListener('mousedown', e=>{ const p=worldPos(e); startDrag(p.x,p.y); });
window.addEventListener('mousemove', e=>{ if(!input.active) return; const p=worldPos(e); moveDrag(p.x,p.y); });
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); startDrag(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchmove',  e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); moveDrag(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchend',   e=>{ e.preventDefault(); endDrag(); }, {passive:false});

/* Геометрия */
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function distPointToSegment(px,py, ax,ay, bx,by){
  const abx = bx-ax, aby = by-ay; const apx = px-ax, apy = py-ay; const ab2 = abx*abx + aby*aby;
  const t = ab2 ? Math.max(0, Math.min(1, (apx*abx + apy*aby)/ab2)) : 0;
  const qx = ax + t*abx, qy = ay + t*aby; const dx = px-qx, dy = py-qy; const d = Math.hypot(dx,dy);
  return { d, qx, qy, t, abx, aby };
}
function distToPolyline(px,py){
  let best = { d: Infinity, qx:0, qy:0, seg:0, t:0, abx:1, aby:0 };
  for (let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const r = distPointToSegment(px,py,a.x,a.y,b.x,b.y);
    if (r.d < best.d) best = { ...r, seg:i };
  }
  return best;
}
function arcLengthAt(px,py){
  const info = distToPolyline(px,py);
  const i = info.seg; const t = info.t;
  return prefix[i] + t * segLen[i];
}

/* Модалки */
function hidePanels(){ loseVeil.classList.remove('show'); winVeil.classList.remove('show'); }

function showLose(){
  running=false; loseScoreEl.textContent = scoreMeters();
  if (loseArt){
    loseArt.style.animation='none';
    void loseArt.offsetWidth;
    loseArt.style.animation='loseArtIn .42s ease-out forwards, lightningPulse 2.6s ease-in-out .42s infinite alternate';
  }
  loseVeil.classList.add('show');
}

function showWin(){
  running=false; winScoreEl.textContent = scoreMeters();
  // Меняем текст кнопки и подписываем: следующий уровень
  const btn = document.getElementById('restartFromWin');
  if (btn) btn.textContent = 'Испытай себя → следующий уровень';
  winVeil.classList.add('show');

  const goNext = (e)=>{
    if (e){ e.preventDefault(); e.stopPropagation(); }
    setLevel(levelIndex+1);
    reset();
  };
  ['click','touchstart'].forEach(ev => btn?.addEventListener(ev, goNext, { once:true, passive:false }));
}

/* Сброс */
function reset(){
  hidePanels(); running=true;
  // вернём мяч на старт активного уровня
  ball.x = path[0].x; ball.y = path[0].y; ball.vx=0; ball.vy=0; ball.angle=0;
  input.active=false; tapTimes.length=0; boost=1.0; scoreEl.textContent='0';
}

/* Апдейт/рендер */
function update(){
  if(!running) return;

  if (input.active){
    const dx = input.x - input.lastX; const dy = input.y - input.lastY;
    input.lastX = input.x; input.lastY = input.y;
    const alpha = 0.35;
    input.swipeVX = (1-alpha)*input.swipeVX + alpha*dx;
    input.swipeVY = (1-alpha)*input.swipeVY + alpha*dy;
    const len = Math.hypot(input.swipeVX, input.swipeVY);
    if (len > 0.3){
      let ax = (input.swipeVX/len) * physics.accel * boost;
      let ay = (input.swipeVY/len) * physics.accel * boost;
      const aMax = 0.9; const aLen = Math.hypot(ax,ay);
      if (aLen>aMax){ ax*=aMax/aLen; ay*=aMax/aLen; }
      ball.vx += ax; ball.vy += ay;
    }
  }

  const v = Math.hypot(ball.vx, ball.vy);
  if (v > physics.maxSpeed){ ball.vx *= physics.maxSpeed/v; ball.vy *= physics.maxSpeed/v; }
  ball.vx *= physics.friction; ball.vy *= physics.friction;
  ball.x += ball.vx; ball.y += ball.vy;

  const info = distToPolyline(ball.x, ball.y);
  if (info.d > (roadHalf() - margin)) { showLose(); return; }
  const goal = path[path.length-1];
  if (Math.hypot(ball.x-goal.x, ball.y-goal.y) < 28) { showWin(); return; }

  scoreEl.textContent = scoreMeters();

  ball.x = clamp(ball.x, 0, W); ball.y = clamp(ball.y, 0, H);

  const step = Math.hypot(ball.vx, ball.vy);
  const circumference = Math.PI*2*ball.r;
  ball.angle += (step/circumference)*(Math.PI*2);
}

function scoreMeters(){
  const s = arcLengthAt(ball.x, ball.y);
  return Math.max(0, Math.round(s/10));
}

function drawBackdrop(){
  ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = '#0c1222';
  for (let x=0; x<=W; x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0; y<=H; y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();
}
function drawRoad(){
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,0.42)'; ctx.lineWidth=roadWidth+14; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke();
  ctx.strokeStyle='#1b2637'; ctx.lineWidth=roadWidth;
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke();
  ctx.setLineDash([16,14]); ctx.strokeStyle='#9fb4cc'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}
function drawStartFinish(){
  const start=path[0], goal=path[path.length-1];
  ctx.fillStyle='#22c55e33'; ctx.beginPath(); ctx.arc(start.x,start.y,26,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#22c55e'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('СТАРТ', start.x, start.y-36);
  ctx.fillStyle='#eab3081a'; ctx.beginPath(); ctx.arc(goal.x,goal.y,28,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#facc15'; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle='#facc15'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('ФИНИШ', goal.x, goal.y-36);
}
function drawBall(){
  const g = ctx.createRadialGradient(ball.x-6, ball.y-8, 4, ball.x, ball.y, ball.r+2);
  g.addColorStop(0,'#bcd7ff'); g.addColorStop(1,'#3b82f6');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#1d4ed8'; ctx.lineWidth=2; ctx.stroke();
  ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(ball.angle);
  ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(-ball.r+3,0); ctx.lineTo(ball.r-3,0); ctx.stroke();
  for (let i=0;i<4;i++){
    ctx.rotate(Math.PI/2);
    ctx.beginPath(); ctx.arc(0, ball.r*0.55, 2.2, 0, Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill();
  }
  ctx.restore();
}

function draw(){ ctx.clearRect(0,0,W,H); drawBackdrop(); drawRoad(); drawStartFinish(); drawBall(); }

function loop(){ update(); draw(); requestAnimationFrame(loop); }

/* Boot */
function init(){
  setLevel(levelIndex);   // выставляем активную трассу
  reset();
  loop();
}
init();
