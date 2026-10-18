'use strict';
const L=require('../src/levels.js');
for(let n=1;n<=25;n++){
  const d=L.levels[n];
  const sides=[...new Set(d.cells.filter(c=>c.own).map(c=>c.own))].sort();
  const enemyN=d.cells.filter(c=>c.own>1&&c.type==='n');
  const enemyS=d.cells.filter(c=>c.own>1&&c.type!=='n');
  const eu0=enemyN.reduce((a,c)=>a+c.u,0);
  const eu2=enemyN.reduce((a,c)=>a+c.u*2,0);
  const up0=d.enemyUpgrades[0],up2=d.enemyUpgrades[2];
  const s0=up0?up0.speed+up0.time+up0.shield+up0.special:0;
  const s2=up2?up2.speed+up2.time+up2.shield+up2.special:0;
  const ai=d.ai||[];
  const minT=ai.length?Math.min(...ai.map(a=>a.timeDecision)):0;
  const modes=ai.map(a=>a.mode[0]).join('');
  console.log([n,'cells',d.cells.length,'sides',sides.length,'eN',enemyN.length,'eS',enemyS.length,'eu0',eu0,'eu2',eu2,'up0',s0,'up2',s2,'ai',ai.length,modes,'t',minT,'reward2',up2?up2.reward:'-'].join(' '));
}
