// levels.js — трассы, геометрия, выбор уровня

export const state = {
  path: [],
  roadWidth: 130,
  segLen: [],
  prefix: [0],
  totalLen: 0,
  margin: 8,
  levelIndex: 0,
};

export function roadHalf(){ return state.roadWidth / 2; }

// --- генераторы путей ---
function makeS(W, H){
  const bx=0, by=0, w=W*0.95, h=H;
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
function randSeed(seed){ let s=seed|0; return ()=> (s=Math.imul(48271,s)%0x7fffffff)/0x7fffffff; }
function makeGentle(W,H,seed=1){
  const r=randSeed(seed), pts=[], Wc=W*0.86, Hc=H*0.70, bx=W*0.07, by=H*0.15, n=8;
  for(let i=0;i<n;i++){ const t=i/(n-1);
    pts.push({ x: bx+Wc*t, y: by + Hc*(0.45 + 0.25*Math.sin((t*2*Math.PI)+r()*0.9)) });
  }
  return pts;
}
function makeZig(W,H,seed=3){
  const r=randSeed(seed), pts=[], Wc=W*0.86, bx=W*0.07, a=H*0.18, n=9;
  for(let i=0;i<n;i++){ const t=i/(n-1);
    pts.push({ x: bx+Wc*t, y: (i%2? 0.55*H : 0.32*H) + (r()-0.5)*a*0.2 });
  }
  return pts;
}

// --- список уровней ---
export function buildLevels(W,H){
  return [
    { name:'Лесная тропа',     path: makeS(W,H),            width:130 },
    { name:'Петля дюн',        path: makeGentle(W,H,7),     width:125 },
    { name:'Хребет дракона',   path: makeGentle(W,H,21),    width:120 },
    { name:'Змеиный перекат',  path: makeZig(W,H,5),        width:118 },
    { name:'Туманная балка',   path: makeGentle(W,H,42),    width:115 },
    { name:'Обрыв Витиеватый', path: makeZig(W,H,11),       width:112 },
    { name:'Каньон шамана',    path: makeGentle(W,H,77),    width:108 },
  ];
}

// --- геометрия ---
export function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
export function distPointToSegment(px,py, ax,ay, bx,by){
  const abx=bx-ax, aby=by-ay, apx=px-ax, apy=py-ay, ab2=abx*abx+aby*aby;
  const t = ab2 ? clamp((apx*abx+apy*aby)/ab2, 0, 1) : 0;
  const qx=ax+t*abx, qy=ay+t*aby, dx=px-qx, dy=py-qy;
  return { d: Math.hypot(dx,dy), qx, qy, t, abx, aby };
}
export function distToPolyline(px,py){
  let best={ d:Infinity, qx:0, qy:0, seg:0, t:0, abx:1, aby:0 };
  for(let i=0;i<state.path.length-1;i++){
    const a=state.path[i], b=state.path[i+1];
    const r = distPointToSegment(px,py,a.x,a.y,b.x,b.y);
    if(r.d<best.d) best={ ...r, seg:i };
  }
  return best;
}
export function arcLengthAt(px,py){
  const info=distToPolyline(px,py), i=info.seg, t=info.t;
  return state.prefix[i] + t*state.segLen[i];
}

export function prepareLengths(){
  state.segLen=[]; state.totalLen=0; state.prefix=[0];
  for(let i=0;i<state.path.length-1;i++){
    const a=state.path[i], b=state.path[i+1];
    const L=Math.hypot(b.x-a.x, b.y-a.y);
    state.segLen.push(L); state.totalLen+=L; state.prefix.push(state.totalLen);
  }
}

export function setLevel(levels, i, levelEl){
  state.levelIndex = ((i % levels.length)+levels.length)%levels.length;
  const L = levels[state.levelIndex];
  state.path = L.path.map(p=>({x:p.x, y:p.y}));
  state.roadWidth = L.width || 130;
  prepareLengths();
  if (levelEl) levelEl.textContent = String(state.levelIndex+1);
  localStorage.setItem('fr_levelIndex', String(state.levelIndex));
}
