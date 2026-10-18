'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const LEVEL=Number(process.argv[2]||24),DIFF=Number(process.argv[3]||2);
function act(s,P,t){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const send=(from,to,pct)=>{if(from&&to&&from!==to)C.sendFleet(s,[from.id],to.id,1,pct);};
  const neutrals=s.cells.filter(c=>c.own===0).sort((a,b)=>dist(best,a)-dist(best,b));
  const foeN=s.cells.filter(c=>c.own>=2&&c.type==='n');
  if(P.fat){const fat=s.cells.find(c=>c.own===1&&c.type==='f'&&c.ready);if(fat){const tgt=foeN.filter(c=>c.fat===-1&&dist(fat,c)<440).sort((a,b)=>b.size-a.size)[0];if(tgt)send(fat,tgt,50);}}
  if(t<P.phase){const n=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.expandNeed)[0];if(n){send(best,n,100);return;}}
  const tgt=foeN.filter(c=>dist(best,c)<P.range).sort((a,b)=>a.u-b.u)[0];
  if(tgt&&best.u>=tgt.u*P.ratio&&best.u>=P.minU)send(best,tgt,P.pct);
}
function run(P){
  const s=L.create(LEVEL,{difficulty:DIFF,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  let acc=0,peak=0;
  for(let f=0;f<600*C.FPS;f++){
    C.step(s,C.FRAME);if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    acc+=C.FRAME;if(acc>=P.interval/1000){acc-=P.interval/1000;act(s,P,s.time);}
    const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  }
  return {over:s.over,time:+s.time.toFixed(0),peak:Math.round(peak),pw:C.powerBySide(s).map(Math.round),cells1:s.cells.filter(c=>c.own===1).length};
}
const out=[];
for(const phase of [60,120,240])
 for(const ratio of [1.2,1.6,2.0])
  for(const pct of [50,100])
   for(const interval of [600,1000])
    out.push({phase,ratio,pct,interval,...run({phase,ratio,pct,interval,minU:20,expandNeed:1.2,range:440,fat:true})});
out.sort((a,b)=>(b.over===1)-(a.over===1)||b.time-a.time);
console.log('level',LEVEL,'diff',DIFF,'wins',out.filter(r=>r.over===1).length,'of',out.length);
console.log(JSON.stringify(out.slice(0,6),null,1));
