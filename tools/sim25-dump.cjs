'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const DIFF=Number(process.argv[2]||2), LIMIT=Number(process.argv[3]||1200);

function act(s,P,t){
  const own=s.cells.filter(c=>c.own===1&&c.type==='n'&&C.canSend(c,1)).sort((a,b)=>b.u-a.u);
  if(!own.length)return;
  const best=own[0];
  const send=(from,to,pct)=>{if(from&&to&&from!==to)C.sendFleet(s,[from.id],to.id,1,pct);};
  const neutrals=s.cells.filter(c=>c.own===0).sort((a,b)=>dist(best,a)-dist(best,b));
  const foes=s.cells.filter(c=>c.own>=2&&c.type!=='f');
  if(t<P.phase){
    const n=neutrals.filter(c=>dist(best,c)<P.range&&best.u>=c.u*P.expandNeed)[0];
    if(n){send(best,n,100);return;}
  }
  // weakest enemy cell in range, including antibody cells
  const tgt=foes.filter(c=>dist(best,c)<P.range).sort((a,b)=>a.u-b.u)[0];
  if(tgt&&best.u>=tgt.u*P.ratio&&best.u>=P.minU)send(best,tgt,P.pct);
  // also push special cells (fat) to attack once charged
  const fat=s.cells.find(c=>c.own===1&&c.type==='f'&&c.ready);
  if(fat){const f=foes.filter(c=>dist(fat,c)<440).sort((a,b)=>b.u-a.u)[0]; if(f)send(fat,f,100);}
}

function run(P){
  const s=L.create(25,{difficulty:DIFF,upgrades:{1:{speed:4,time:4,shield:4,special:4}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  let acc=0,peak=0,marks=[];
  for(let f=0;f<LIMIT*C.FPS;f++){
    C.step(s,C.FRAME); if(s.over)break;
    for(const b of brains)AI.think(s,b,C.FRAME);
    acc+=C.FRAME;
    if(acc>=P.interval/1000){acc-=P.interval/1000;act(s,P,s.time);}
    const pw=C.powerBySide(s)[1]; if(pw>peak)peak=pw;
    if(f%(25*120)===0)marks.push([Math.round(s.time),Math.round(pw),s.cells.filter(c=>c.own===1).length,s.cells.filter(c=>c.own>=2).length]);
  }
  globalThis.__final=s.cells.map(c=>({id:c.id,type:c.type,own:c.own,u:Math.round(c.u),ab:!!c.antibody,fat:c.fat,x:Math.round(c.x),y:Math.round(c.y)}));
  return {cells:globalThis.__final,over:s.over,time:+s.time.toFixed(0),winner:C.winner(s),peak:Math.round(peak),pw:C.powerBySide(s).map(Math.round),cells1:s.cells.filter(c=>c.own===1).length,cellsN:s.cells.filter(c=>c.own===0).length,cells2:s.cells.filter(c=>c.own>=2).length,marks};
}
const out=[];
for(const P of [
 {phase:40,ratio:1.1,pct:100,interval:500,minU:10,expandNeed:1.0,range:500},
 {phase:60,ratio:1.2,pct:50,interval:800,minU:20,expandNeed:1.2,range:440},
 {phase:30,ratio:1.05,pct:100,interval:400,minU:5,expandNeed:1.0,range:600}
]){out.push(run(P));}
console.log(JSON.stringify(out,null,1));
