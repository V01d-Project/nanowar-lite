'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function act(s,P){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const total=own.reduce((n,c)=>n+c.u,0);
  const neutrals=s.cells.filter(c=>c.own===0).sort((a,b)=>dist(best,a)-dist(best,b));
  const foes=s.cells.filter(c=>c.own>=2);
  if(s.time<P.phase){
    const n=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.need)[0];
    if(n){C.sendFleet(s,[best.id],n.id,1,100);return;}
  }
  if(total<P.dominance){
    const weakFoe=foes.filter(c=>c.type==='n'&&dist(best,c)<P.range).sort((a,b)=>a.u-b.u)[0];
    if(weakFoe&&best.u>=weakFoe.u*2)C.sendFleet(s,[best.id],weakFoe.id,1,100);
    return;
  }
  const tgt=foes.sort((a,b)=>a.u-b.u||dist(best,a)-dist(best,b))[0];
  if(!tgt)return;
  const near=own.filter(c=>dist(c,tgt)<P.range);
  let sum=near.reduce((n,c)=>n+c.u,0);
  if(sum<tgt.u*1.4)return;
  const ids=[];
  for(const c of near){if(c.u<10)continue;ids.push(c.id);if(ids.reduce((n,id)=>n+s.cells[id].u,0)>=tgt.u*1.6)break;}
  C.sendFleet(s,ids,tgt.id,1,100);
}
function run(P){
  const s=L.create(24,{difficulty:2,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  let acc=0,peak=0;
  for(let f=0;f<1800*C.FPS;f++){
    C.step(s,C.FRAME);if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    acc+=C.FRAME;if(acc>=P.interval/1000){acc-=P.interval/1000;act(s,P);}
    const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  }
  return {dominance:P.dominance,interval:P.interval,over:s.over,time:+s.time.toFixed(0),peak:Math.round(peak),pw:C.powerBySide(s).map(Math.round),cells1:s.cells.filter(c=>c.own===1).length};
}
for(const dominance of [300,500,800])
 for(const interval of [600,1000])
  console.log(JSON.stringify(run({phase:60,dominance,interval,range:460,need:1.2})));
