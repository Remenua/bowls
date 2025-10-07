// public/src/main.js
'use strict';

import { buildLevels, setLevel, state } from './levels.js';
import { ball, reset as resetEngine, updateRunning, scoreMeters } from './engine.js';
import { drawFrame } from './render.js';
import { createInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const scoreEl  = document.getElementById('score');
const levelEl  = document.getElementById('level');
const resetBtn = document.getElementById('reset');

const loseVeil = document.getElementById('loseVeil');
const winVeil  = document.getElementById('winVeil');
const loseScoreEl = document.getElementById('loseScore');
const winScoreEl  = document.getElementById('winScore');
const restartFromLose = document.getElementById('restartFromLose');
const restartFromWin  = document.getElementById('restartFromWin');

const levels = buildLevels(W, H);
state.levelIndex = Number(localStorage.getItem('fr_levelIndex') || 0);

const input = createInput(canvas);

function hidePanels(){
  loseVeil.classList.remove('show');
  winVeil.classList.remove('show');
}

function onRestart(e){
  if (e){ e.preventDefault(); e.stopPropagation(); }
  hidePanels();
  resetEngine(scoreEl);
  running = true;
}

['click','touchstart'].forEach(ev=>{
  restartFromLose.addEventListener(ev, onRestart, { passive:false });
  resetBtn.addEventListener(ev, onRestart, { passive:false });
});

window.addEventListener('keydown', (e)=>{
  if ((e.key||'').toLowerCase()==='r') onRestart(e);
});

function showLose(){
  running = false;
  loseScoreEl.textContent = String(scoreMeters());
  // --- гарантированная подгрузка арта (и скрытие при ошибке) ---
  const img = document.getElementById('loseArt');
  if (img){
    img.style.display = 'none';
    // жёстко задаём путь (от index.html): ./assets/archmage.webp
    img.onload  = ()=>{ img.style.display='block'; };
    img.onerror = ()=>{ img.style.display='none'; };
    // принудительная перезагрузка, чтобы обойти кэш 304
    const cacheBust = Date.now().toString(36);
    const baseSrc = './assets/archmage.png';
    const nextSrc = `${baseSrc}?v=${cacheBust}`;
    if (img.src.endsWith(baseSrc) || img.src.includes('archmage.webp')) {
      // меняем на новый query, чтобы браузер не брал из кэша
      img.src = nextSrc;
    } else {
      img.src = baseSrc;
    }
  }
  loseVeil.classList.add('show');
}


function goNextLevel(e){
  if (e){ e.preventDefault(); e.stopPropagation(); }
  hidePanels();                              // <<< фикс: прячем модалку победы
  setLevel(levels, state.levelIndex + 1, levelEl);
  resetEngine(scoreEl);
  running = true;
}

function showWin(){
  running = false;
  winScoreEl.textContent = String(scoreMeters());
  // подписать кнопку на переход (один раз)
  ['click','touchstart'].forEach(ev =>
    restartFromWin.addEventListener(ev, goNextLevel, { once:true, passive:false })
  );
  winVeil.classList.add('show');
}

let running = true;

function loop(){
  if (running){
    updateRunning(input, showLose, showWin);
    scoreEl.textContent = String(scoreMeters());
  }
  drawFrame(ctx, W, H);
  requestAnimationFrame(loop);
}

// boot
setLevel(levels, state.levelIndex, levelEl);
resetEngine(scoreEl);
loop();
