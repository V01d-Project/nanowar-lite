const L=require('../src/levels.js'),C=require('../src/campaign.js');
const d=L.levels[24];
console.log('rewards per difficulty', d.enemyUpgrades.map(x=>x.reward));
const c=C.create({pregrant:false});
for(const df of [0,1,2])console.log('diff',df,'award',C.award(c,24,df),'points',c.points);
