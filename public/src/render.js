// render.js — всё рисование

import { state } from './levels.js';
import { ball } from './engine.js';

export function drawBackdrop(ctx,W,H){
  ctx.save(); ctx.globalAlpha=.16; ctx.strokeStyle='#0c1222';
  for(let x=0;x<=W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<=H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();
}

export function drawRoad(ctx){
  const path=state.path, roadWidth=state.roadWidth;
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,0.42)'; ctx.lineWidth=roadWidth+14; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x,path[i].y); ctx.stroke();
  ctx.strokeStyle='#1b2637'; ctx.lineWidth=roadWidth;
  ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x,path[i].y); ctx.stroke();
  ctx.setLineDash([16,14]); ctx.strokeStyle='#9fb4cc'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y); for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x,path[i].y); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}

export function drawStartFinish(ctx){
  const path=state.path, start=path[0], goal=path[path.length-1];
  ctx.fillStyle='#22c55e33'; ctx.beginPath(); ctx.arc(start.x,start.y,26,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#22c55e'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('СТАРТ', start.x, start.y-36);
  ctx.fillStyle='#eab3081a'; ctx.beginPath(); ctx.arc(goal.x,goal.y,28,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#facc15'; ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle='#facc15'; ctx.font='700 14px system-ui'; ctx.textAlign='center'; ctx.fillText('ФИНИШ', goal.x, goal.y-36);
}

export function drawBall(ctx){
  const g=ctx.createRadialGradient(ball.x-6,ball.y-8,4, ball.x,ball.y,ball.r+2);
  g.addColorStop(0,'#bcd7ff'); g.addColorStop(1,'#3b82f6');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#1d4ed8'; ctx.lineWidth=2; ctx.stroke();

  ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(ball.angle);
  ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(-ball.r+3,0); ctx.lineTo(ball.r-3,0); ctx.stroke();
  for(let i=0;i<4;i++){ ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.arc(0, ball.r*0.55, 2.2, 0, Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill(); }
  ctx.restore();
}

export function drawFrame(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  drawBackdrop(ctx,W,H);
  drawRoad(ctx);
  drawStartFinish(ctx);
  drawBall(ctx);
}
