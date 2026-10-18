'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function act(s,P){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const send=(from,to,pct)=>{if(from&&to&&from!==to)C.sendFleet(s,[from.id],to.id,1,pct);};
  const neutrals=s.cells.filter(c=>c.own===0&&c.type==='n').sort((a,b)=>dist(best,a)-dist(best,b));
  const foes=s.cells.filter(c=>c.own>=2&&c.type==='n');
  if(P.fat){const fat=s.cells.find(c=>c.own===1&&c.type==='f'&&c.ready);if(fat){const t=foes.filter(c=>c.fat===-1&&dist(fat,c)<420).sort((a,b)=>b.size-a.size)[0];if(t)send(fat,t,50);}}
  let target=null;
  if(P.strategy==='expand'){target=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.need)[0]||null;}
  else if(P.strategy==='weak'){const t=foes.filter(c=>dist(best,c)<P.range).sort((a,b)=>a.u-b.u)[0];if(t&&best.u>=t.u*P.need&&best.u>=P.minU)target=t;}
  else {const side=+P.strategy.slice(1);const t=foes.filter(c=>c.own===side).sort((a,b)=>a.u-b.u)[0];if(t&&best.u>=t.u*P.need&&best.u>=P.minU)target=t;}
  if(!target&&P.expandFallback)target=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*1.4)[0]||null;
  if(target){send(best,target,P.pct);for(const other of own.slice(1))if(dist(other,target)<P.range*1.2&&other.u>=target.u*P.need)send(other,target,P.pct);}
}
function run(level,difficulty,P,seconds=600){
  const s=L.create(level,{difficulty,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  const timer={t:0,interval:P.interval/1000};
  let peak=0;
  for(let f=0;f<seconds*C.FPS;f++){
    C.step(s,C.FRAME);
    if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    timer.t+=C.FRAME;
    if(timer.t>=timer.interval){timer.t-=timer.interval;act(s,P);}
    const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  }
  return {over:s.over,time:+s.time.toFixed(0),peak:Math.round(peak),cells:s.cells.filter(c=>c.own===1).length};
}
const out=[];
for(const strategy of ['expand','weak','focus2','focus3','focus4'])
 for(const pct of [50,100])
  for(const interval of [600,1200,2000])
   for(const fat of [false,true]){
    const P={strategy,pct,interval,fat,range:420,need:1.6,minU:25,expandFallback:true};
    const r=run(25,2,P,600);
    out.push({strategy,pct,interval,fat,...r});
   }
out.sort((a,b)=>b.time-a.time);
console.log(JSON.stringify(out.slice(0,10),null,1));
console.log('wins',out.filter(r=>r.over===1).length,'of',out.length,'maxTime',out[0].time,'maxPeak',Math.max(...out.map(r=>r.peak)));
