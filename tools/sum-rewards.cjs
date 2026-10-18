const L=require('../src/levels.js');
const tut=[1,2,3,4,9,19];
let tot=0;
const per={};
for(const k of Object.keys(L.levels)){
  const n=+k; if(!n) continue;
  const d=L.levels[n]; if(!d||!d.enemyUpgrades) continue;
  const rs=[0,1,2].map(x=>(d.enemyUpgrades[x]&&d.enemyUpgrades[x].reward)||0);
  per[n]=rs;
  if(!tut.includes(n)) tot+=rs.reduce((a,b)=>a+b,0);
}
const keys=['speed','time','shield','special'];
const U=require('../src/core.js').UPGRADES;
const fullCost={};for(const k of keys) fullCost[k]=U[k+'Upg'].slice(1).reduce((a,b)=>a+b,0);
console.log('levels:',Object.keys(per).length,'tutorials:',tut.join(','));
console.log('totalReward:',tot);
console.log('fullUpgradeCost:',JSON.stringify(fullCost),'sum:',Object.values(fullCost).reduce((a,b)=>a+b,0));
console.log('sample per level:',JSON.stringify(Object.fromEntries(Object.entries(per).slice(0,8))));
