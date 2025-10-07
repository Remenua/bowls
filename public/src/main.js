// main.js — сборка всего вместе

import { buildLevels, setLevel, state }       from './levels.js';
import { ball, physics, reset, updateRunning, scoreMeters } from './engine.js';
import { drawFrame }                           from './render.js';
import { createInput }                         from './input.js';

const canvas = document.getElementById('game');
const ctx     = canvas.getContext('2d');
const W=canvas.width, H=canvas.height;

const scoreEl  = document.getElementById('score');
const levelEl  = document.getElementById('level');
const resetBtn = document.getElementById('reset');

const loseVeil = document.getElementById('loseVeil');
const winVeil  = document.getElementById('winVeil');
const loseScoreEl = document.getElementById('loseScore');
const winScoreEl  = document.getElementById('winScore');
const restartFromLose = document.getElementById('restartFromLose');
const restartFromWin  = document.getElementById('restartFromWin');

const levels = buildLevels(W,H);
state.levelIndex = Number(localStorage.getItem('fr_levelIndex') || 0);

const input = createInput(canvas);

function hidePanels(){ loseVeil.classList.remove('show'); winVeil.classList.remove('show'); }

function showLose(){
  running=false;
  loseScoreEl.textContent = String(scoreMeters());
  loseVeil.classList.add('show');
}
function showWin(){
  running=false;
  winScoreEl.textContent = String(scoreMeters());
  // кнопка уже в HTML «Испытай себя → следующий уровень»
  ['click','touchstart'].forEach(ev => restartFromWin.addEventListener(ev, goNextLevel, { once:true, passive:false }));
  winVeil.classList.add('show');
}
function goNextLevel(e){
  if (e){ e.preventDefault(); e.stopPropagation(); }
  setLevel(levels, state.levelIndex+1, levelEl);
  reset(scoreEl);
  running=true;
}

function onRestart(e){
  if (e){ e.preventDefault(); e.stopPropagation(); }
  hidePanels();
  reset(scoreEl);
  running=true;
}
['click','touchstart'].forEach(ev=>{
  restartFromLose.addEventListener(ev, onRestart, { passive:false });
  resetBtn.addEventListener(ev, onRestart, { passive:false });
});

window.addEventListener('keydown', (e)=>{
  if ((e.key||'').toLowerCase()==='r') onRestart(e);
});

let running = true;

function loop(){
  if (running){
    updateRunning(input, showLose, showWin);
    scoreEl.textContent = String(scoreMeters());
  }
  drawFrame(ctx,W,H);
  requestAnimationFrame(loop);
}

// boot
setLevel(levels, state.levelIndex, levelEl);
reset(scoreEl);
loop();
