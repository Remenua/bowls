// engine.js — мяч/физика/апдейт

import { state, roadHalf, distToPolyline, arcLengthAt, clamp } from './levels.js';

export const ball = { x:0, y:0, r:16, vx:0, vy:0, angle:0 };

export const physics = { friction:0.985, accel:0.366, maxSpeed:9.0 };

export function reset(scoreEl){
  ball.x = state.path[0].x; ball.y = state.path[0].y;
  ball.vx=0; ball.vy=0; ball.angle=0;
  if (scoreEl) scoreEl.textContent='0';
}

export function scoreMeters(){
  return Math.max(0, Math.round(arcLengthAt(ball.x, ball.y)/10));
}

export function updateRunning(input, onLose, onWin){
  // input → impulse
  if(input.active){
    const dx=input.x-input.lastX, dy=input.y-input.lastY;
    input.lastX=input.x; input.lastY=input.y;
    const alpha=0.35;
    input.swipeVX=(1-alpha)*input.swipeVX+alpha*dx;
    input.swipeVY=(1-alpha)*input.swipeVY+alpha*dy;
    const len=Math.hypot(input.swipeVX,input.swipeVY);
    if(len>0.3){
      let ax=(input.swipeVX/len)*physics.accel*input.boost;
      let ay=(input.swipeVY/len)*physics.accel*input.boost;
      const aMax=0.9, aLen=Math.hypot(ax,ay);
      if(aLen>aMax){ ax*=aMax/aLen; ay*=aMax/aLen; }
      ball.vx+=ax; ball.vy+=ay;
    }
  }

  // integrate
  const v=Math.hypot(ball.vx,ball.vy);
  if(v>physics.maxSpeed){ ball.vx*=physics.maxSpeed/v; ball.vy*=physics.maxSpeed/v; }
  ball.vx*=physics.friction; ball.vy*=physics.friction;
  ball.x+=ball.vx; ball.y+=ball.vy;

  // lose/win
  const info=distToPolyline(ball.x, ball.y);
  if(info.d > (roadHalf()-state.margin)) return onLose();
  const goal=state.path[state.path.length-1];
  if(Math.hypot(ball.x-goal.x, ball.y-goal.y) < 28) return onWin();

  // clamp to canvas (визуально)
  ball.x=clamp(ball.x,0,980); ball.y=clamp(ball.y,0,560);
}
