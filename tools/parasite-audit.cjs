'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const s=L.create(0,{difficulty:0});
const mine=s.cells.filter(c=>c.own===1&&c.type==='p');
const foe=s.cells.filter(c=>c.own===2&&c.type==='n')[0];
console.log('my parasite cells',mine.length,'foe normal',!!foe);
console.log('selectable(parasite,1)',C.selectable(mine[0],1),'canSend',C.canSend(mine[0],1));
const sent=C.sendFleet(s,[mine[0].id],foe.id,1,50);
console.log('fired',sent,'unit kind',s.units[0]&&s.units[0].kind,'side',s.units[0]&&s.units[0].side);
let t=0;while(s.units.length&&t<600){C.step(s,.04);t++;}
console.log('after arrival: foe.parasite=',foe.parasite,'selectable by1',C.selectable(foe,1),'by2',C.selectable(foe,2));
// let AI act for 40s
const brains=s.ai.map(a=>AI.create({side:a.side,mode:a.mode,timeDecision:a.timeDecision}));
let aiShots=[];
for(let i=0;i<40*25;i++){const before=s.nextUnit;C.step(s,.04);for(const b of brains)AI.think(s,b,.04);
 for(const u of s.units)if(u.id>=before&&u.kind==='p')aiShots.push(u.target);}
console.log('AI parasite shots in 40s',aiShots.length);
for(const id of new Set(aiShots)){const c=s.cells[id];console.log(' target',id,'own',c.own,'type',c.type,'parasite',c.parasite);}
