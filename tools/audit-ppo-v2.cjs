'use strict';
const fs=require('fs'),P=require('./train-ppo.cjs'),C=require('../src/core.js'),A=require('../src/arena.js'),AI=require('../src/ai.js');
const model=JSON.parse(fs.readFileSync('tools/ppo-10k-model.json')),w=Float64Array.from(model.weights);
console.log(JSON.stringify({counts:[2,3,4].map(count=>({count,maps:A.names.map((name,map)=>({map,name,cells:A.map(map,count).length}))}))}));
const s=A.create(1,{},12345,2),b=AI.create({side:2,mode:'normal',timeDecision:5000}),trace=[];let next=6;
for(let f=0;f<180*25&&!s.over;f++){if(s.time+1e-8>=next){const o=P.candidates(s,1),d=P.distribution(w,o.xs);let k=0;for(let j=1;j<d.p.length;j++)if(d.p[j]>d.p[k])k=j;const a=o.actions[k];if(next%10===6)trace.push({time:s.time,action:a,cells:s.cells.map(c=>({id:c.id,own:c.own,type:c.type,u:c.u,antibody:c.antibody,fat:c.fat,ready:c.ready}))});if(a)C.sendFleet(s,a.ids,a.target,1,a.pct);next+=5;}AI.think(s,b,.04);C.step(s,.04);}
console.log(JSON.stringify({map:'duel',over:s.over,time:s.time,trace}));
