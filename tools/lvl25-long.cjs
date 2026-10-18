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
  if(P.fat){const fat=s.cells.find(c=>c.own===1&&c.type==='f'&&c.ready);if(fat){const tgt=foes.filter(c=>c.fat===-1&&dist(fat,c)<440).sort((a,b)=>b.size-a.size)[0];if(tgt)send(fat,tgt,50);}}
  if(s.time<P.phase){const n=neutrals.filter(c=>dist(best,c)<440&&best.u>=c.u*1.2)[0];if(n){send(best,n,100);return;}}
  for(const c of own){
    const tgt=foes.filter(c2=>dist(c,c2)<440).sort((a,b)=>a.u-b.u)[0];
    if(tgt&&c.u>=tgt.u*P.ratio&&c.u>=20)send(c,tgt,P.pct);
  }
}
function run(P,limit){
  const s=L.create(25,{difficulty:2,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  let acc=0,peak=0,firstOwn=null;
  for(let f=0;f<limit*C.FPS;f++){
    C.step(s,C.FRAME);if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    acc+=C.FRAME;if(acc>=0.5){acc-=0.5;act(s,P);}
    const p=C.powerBySide(s)[1];if(p>peak)peak=p;
  }
  const pw=C.powerBySide(s).map(x=>Math.round(x));
  return {phase:P.phase,ratio:P.ratio,pct:P.pct,over:s.over,time:+s.time.toFixed(0),peak:Math.round(peak),power:pw,cells1:s.cells.filter(c=>c.own===1).length,cells:s.cells.map(c=>c.own).join('')};
}
const cfgs=[{phase:60,ratio:1.2,pct:100},{phase:60,ratio:1.6,pct:100},{phase:120,ratio:1.2,pct:50},{phase:180,ratio:1.2,pct:50},{phase:180,ratio:1.6,pct:50}];
for(const P of cfgs){const r=run({...P,fat:true},1800);console.log(JSON.stringify(r));}
