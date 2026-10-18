'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function act(s,P){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const neutrals=s.cells.filter(c=>c.own===0).sort((a,b)=>dist(best,a)-dist(best,b));
  const foes=s.cells.filter(c=>c.own>=2).sort((a,b)=>a.u-b.u);
  // grab neutral specials too once we are strong
  if(s.time<P.phase){
    const n=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.need)[0];
    if(n){C.sendFleet(s,[best.id],n.id,1,100);return;}
  }
  const tgt=foes.filter(c=>dist(best,c)<P.range)[0];
  if(!tgt)return;
  const near=own.filter(c=>dist(c,tgt)<P.range);
  const sum=near.reduce((n,c)=>n+c.u,0);
  if(sum<tgt.u*1.3)return;
  let sent=0;
  for(const c of near){if(c.u<15)continue;if(C.sendFleet(s,[c.id],tgt.id,1,100))sent++;if(sent>=P.maxSources)break;}
}
function run(level,diff,P,limit){
  const s=L.create(level,{difficulty:diff,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  let acc=0,peak=0;
  for(let f=0;f<limit*C.FPS;f++){
    C.step(s,C.FRAME);if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    acc+=C.FRAME;if(acc>=P.interval/1000){acc-=P.interval/1000;act(s,P);}
    const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  }
  return {level,over:s.over,time:+s.time.toFixed(0),peak:Math.round(peak),pw:C.powerBySide(s).map(Math.round),cells1:s.cells.filter(c=>c.own===1).length};
}
for(const level of [24,25])
 for(const phase of [60,120])
  for(const interval of [600,1000])
   for(const maxSources of [2,3])
    console.log(JSON.stringify(run(level,2,{phase,interval,maxSources,range:460,need:1.2},1200)));
