'use strict';
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const d=L.levels[0];
console.log(d.cells.filter(c=>c.type==='a'||c.type==='f').map(c=>({type:c.type,own:c.own,u:c.u,antibody:c.antibody,parasite:c.parasite})));
// controlled: AI with one strong cell vs a weak antibody-marked player cell
const s=C.createState([{own:2,u:80,x:100,y:100,size:100},{own:1,u:20,x:300,y:100,size:50},{own:3,u:20,x:100,y:300,size:50}],{seed:1});
s.cells[1].antibody=true;
const b=AI.create({side:2,mode:'normal',timeDecision:3000});
for(let i=0;i<200;i++){const before=s.nextUnit;C.step(s,.04);AI.think(s,b,.04);if(s.nextUnit!==before){const u=s.units[s.units.length-1];console.log('shot kind',u.kind,'target',u.target);break;}}
