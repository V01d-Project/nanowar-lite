'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function act(s,P,t){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const send=(from,to,pct)=>{if(from&&to&&from!==to)C.sendFleet(s,[from.id],to.id,1,pct);};
  const neutrals=s.cells.filter(c=>c.own===0).sort((a,b)=>dist(best,a)-dist(best,b));
  const foeN=s.cells.filter(c=>c.own>=2&&c.type==='n');
  if(t<P.phase){const n=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.expandNeed)[0];if(n){send(best,n,100);return;}}
  const tgt=foeN.filter(c=>dist(best,c)<P.range).sort((a,b)=>a.u-b.u)[0];
  if(tgt&&best.u>=tgt.u*P.ratio&&best.u>=P.minU)send(best,tgt,P.pct);
}
const P={phase:60,ratio:2,pct:100,interval:600,minU:20,expandNeed:1.2,range:440};
const s=L.create(24,{difficulty:2,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
let acc=0,peak=0;const marks=[];
for(let f=0;f<3600*C.FPS;f++){
  C.step(s,C.FRAME);if(s.over)break;
  for(const b of brains)AI.think(s,b,C.FRAME);
  acc+=C.FRAME;if(acc>=0.6){acc-=0.6;act(s,P,s.time);}
  const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  if(f%(25*60)===0)marks.push([Math.round(s.time),Math.round(p),s.cells.filter(c=>c.own===1).length]);
}
console.log(JSON.stringify({over:s.over,time:+s.time.toFixed(0),peak,power:C.powerBySide(s).map(Math.round),cells1:s.cells.filter(c=>c.own===1).length}));
console.log(JSON.stringify(marks));
