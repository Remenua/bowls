// input.js — тач/мышь

export function createInput(canvas){
  const input = { active:false, x:0, y:0, lastX:0, lastY:0, swipeVX:0, swipeVY:0, boost:1.0 };

  const TAP_WINDOW_MS=900; let tapTimes=[];
  function registerTap(){
    const now=performance.now(); tapTimes.push(now);
    while(tapTimes.length && now-tapTimes[0]>TAP_WINDOW_MS) tapTimes.shift();
    const tps = tapTimes.length/(TAP_WINDOW_MS/1000);
    input.boost = 1.0 + Math.min(0.5, tps*0.10);
  }
  function worldPos(evt){
    const r=canvas.getBoundingClientRect();
    return { x:(evt.clientX-r.left)*(canvas.width/r.width), y:(evt.clientY-r.top)*(canvas.height/r.height) };
  }
  function start(x,y){ input.active=true; input.x=x; input.y=y; input.lastX=x; input.lastY=y; input.swipeVX=0; input.swipeVY=0; registerTap(); }
  function move(x,y){ input.x=x; input.y=y; }
  function end(){ 
    const len=Math.hypot(input.swipeVX,input.swipeVY);
    if(len>0.5){ /* флик-импульс обрабатывается в engine.update через swipe */ }
    input.active=false;
  }

  canvas.addEventListener('mousedown', e=>{ const p=worldPos(e); start(p.x,p.y); });
  window.addEventListener('mousemove', e=>{ if(!input.active) return; const p=worldPos(e); move(p.x,p.y); });
  window.addEventListener('mouseup', end);

  canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); start(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchmove',  e=>{ e.preventDefault(); const t=e.changedTouches[0]; const p=worldPos(t); move(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchend',   e=>{ e.preventDefault(); end(); }, {passive:false});

  return input;
}
