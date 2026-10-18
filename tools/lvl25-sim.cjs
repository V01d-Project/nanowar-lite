'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
function run(level,difficulty,playerMs,seconds=600,playerUp=4){
  const s=L.create(level,{difficulty,upgrades:{1:{speed:playerUp,time:playerUp,shield:playerUp,special:playerUp}}});
  const brains=s.ai.map(ai=>AI.create({side:ai.side,mode:ai.mode,timeDecision:ai.timeDecision}));
  const player=AI.create({side:1,mode:'normal',timeDecision:playerMs});
  let firstHit=null,peak=0;
  for(let f=0;f<seconds*C.FPS;f++){
    C.step(s,C.FRAME);
    if(s.over){firstHit=s.time;break;}
    for(const b of brains)AI.think(s,b,C.FRAME);
    AI.think(s,player,C.FRAME);
    const p=C.powerBySide(s);if(p[1]>peak)peak=p[1];
  }
  const p=C.powerBySide(s);
  return {over:s.over,time:+s.time.toFixed(1),power:p.map(x=>Math.round(x)),peak:Math.round(peak),
    cells:s.cells.filter(c=>c.own===1).length,all:s.cells.map(c=>c.own).join('')};
}
const rows=[];
for(const ms of [400,600,800,1000,1500,2000,3000,4500])rows.push({ms,...run(25,2,ms)});
console.log(JSON.stringify(rows,null,1));
