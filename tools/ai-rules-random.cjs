'use strict';
// Random-map audit for the Nano War AI rule layer.
// Generates reproducible maps, runs normal/easy/noob brains, and fails on any order that
// violates the two hard rules: ordinary fleets must not hit antibody-marked cells or hostile
// fat shields; antibody units must not be spent on hostile fat shields.
const C=require('../src/core.js'),AI=require('../src/ai.js');
const argv=process.argv.slice(2);
const num=(name,def)=>{const i=argv.indexOf('--'+name);return i>=0?Number(argv[i+1]):def;};
const MAPS=num('maps',300),SEED=num('seed',12345),SECONDS=num('seconds',60);
const MODES=['normal','easy','noob'];

function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

function makeMap(seed){
 const rnd=rng(seed),sides=2+Math.floor(rnd()*3),cells=[];
 const rayOf=d=>(d.type&&d.type!=='n')?24:Math.trunc(44*(d.size||100)/100*.83);
 function place(data){
  const ray=rayOf(data);
  for(let k=0;k<400;k++){
   const x=60+Math.floor(rnd()*520),y=60+Math.floor(rnd()*360);
   if(cells.every(c=>Math.hypot(c.x-x,c.y-y)>c._ray+ray+12)){cells.push(Object.assign({x,y,_ray:ray},data));return true;}
  }
  return false;
 }
 for(let side=1;side<=sides;side++){
  const n=1+Math.floor(rnd()*3);
  for(let i=0;i<n;i++)place({type:'n',own:side,size:40+Math.floor(rnd()*61),u:20+Math.floor(rnd()*61)});
 }
 for(let i=0,n=4+Math.floor(rnd()*7);i<n;i++)place({type:'n',own:0,size:40+Math.floor(rnd()*61),u:Math.floor(rnd()*31)});
 for(let i=0,n=Math.floor(rnd()*4);i<n;i++)place({type:'f',own:rnd()<.55?0:1+Math.floor(rnd()*sides),u:0,size:100});
 for(let i=0,n=Math.floor(rnd()*4);i<n;i++)place({type:'a',own:rnd()<.55?0:1+Math.floor(rnd()*sides),u:rnd()<.35?100:0,size:100});
 for(let side=1;side<=sides;side++)if(!cells.some(c=>c.own===side&&c.type==='n'))return null;
 return cells.map(({_ray,...c})=>c);
}

const stats={maps:0,sims:0,think:0,orders:{n:0,a:0,f:0},violations:[],captures:0,fatClears:0,games:0,timeouts:0,soft:{ownNormal:0,fatWaste:0,abWaste:0,futile:0,blocked:0},byMode:{normal:{orders:0,futile:0},easy:{orders:0,futile:0},noob:{orders:0,futile:0}},turns:0,idleTurns:0};
let ctx={mapSeed:0,mode:'normal'};
const origSend=C.sendFleet;
C.sendFleet=function(s,ids,targetId,side,percent){
 const before={u:ids&&ids[0]!=null?s.cells[ids[0]].u:0,n:s.units.length};
 const sent=origSend.apply(this,arguments);
 stats.turns++;
 if(!sent)stats.soft.blocked++;
 if(sent>0){
  const src=s.cells[ids&&ids[0]],t=s.cells[targetId];
  if(src&&t){
   stats.orders[src.type]=(stats.orders[src.type]||0)+1;
   const m=stats.byMode[ctx.mode]||(stats.byMode[ctx.mode]={orders:0,futile:0});m.orders++;
   if(src.type==='n'&&t.own!==side&&(t.antibody||(t.fat!==-1&&t.fat!==side))){
    stats.violations.push({mapSeed:ctx.mapSeed,mode:ctx.mode,side,kind:'n',source:src.id,target:t.id,targetOwn:t.own,antibody:!!t.antibody,fat:t.fat,time:+s.time.toFixed(2)});
   }
   if(src.type==='a'&&t.own!==side&&t.fat!==-1&&t.fat!==side){
    stats.violations.push({mapSeed:ctx.mapSeed,mode:ctx.mode,side,kind:'a',source:src.id,target:t.id,targetOwn:t.own,antibody:!!t.antibody,fat:t.fat,time:+s.time.toFixed(2)});
   }
   if(src.type==='a'&&t.own!==side&&t.antibody)stats.captures++;
   if(src.type==='f'&&t.own!==side&&t.antibody)stats.fatClears++;
   if(src.type==='n'&&t.own===side&&t.type==='n')stats.soft.ownNormal++;
   if(src.type==='f'&&t.fat===side)stats.soft.fatWaste++;
   if(src.type==='a'&&t.own===side&&t.antibody)stats.soft.abWaste++;
   if(src.type==='n'&&t.own!==side){const power=s.units.slice(before.n).reduce((n,u)=>n+Math.max(u.power||0,u.wanted||0),0);if(power<t.u){stats.soft.futile++;const m=stats.byMode[ctx.mode]||(stats.byMode[ctx.mode]={orders:0,futile:0});m.futile++;}}
  }
 }
 return sent;
};

function simulate(cells,seed,mode){
 const rnd=rng(seed^0x9e3779b9),maxSide=Math.max(...cells.map(c=>c.own));
 const brains=[];
 for(let side=1;side<=maxSide;side++)if(cells.some(c=>c.own===side))brains.push(AI.create({side,mode,timeDecision:1000+Math.floor(rnd()*2001)}));
 const s=C.createState(cells,{seed});
 for(let i=0;i<SECONDS*25&&!s.over;i++){
  C.step(s,1/25);
  for(const b of brains){AI.think(s,b,1/25);stats.think++;}
 }
 stats.sims++;if(s.over)stats.games++;else stats.timeouts++;
}

function selfCheck(){
 const fail=m=>{throw new Error('self-check failed: '+m)};
 const mk=(extra,opts)=>{const s=C.createState(extra,opts||{seed:1});return s;};
 // Ordinary AI must not shoot the antibody-marked cell.
 let s=mk([{own:1,u:20,x:100,y:100,size:50,antibody:true},{own:2,u:80,x:300,y:100,size:100}]);
 AI.decision(s,2);
 if(s.units.some(u=>u.target===0))fail('normal fleet hit an antibody-marked cell');
 // Hostile fat shield must be respected too.
 s=mk([{own:1,u:20,x:100,y:100,size:50,fat:1},{own:2,u:80,x:300,y:100,size:100}]);
 AI.decision(s,2);
 if(s.units.some(u=>u.target===0))fail('normal fleet hit a hostile fat shield');
 // Antibody and fat must still be used against an antibody-marked enemy.
 for(const type of ['a','f']){
  s=mk([{own:1,u:50,x:100,y:100,size:100,antibody:true},{own:2,type,u:100,x:300,y:100,size:100}]);
  s.cells[1].ready=true;
  AI.decision(s,2);
  if(!s.units.some(u=>u.kind===type&&u.target===0))fail(type+' special was over-filtered');
 }
 return 'self-check PASS (no ordinary shots on antibody/fat, special counters still fire)';
}

console.log(selfCheck());
for(let i=0;i<MAPS;i++){
 const mapSeed=(SEED+i*7919)>>>0,cells=makeMap(mapSeed);
 if(!cells)continue;
 stats.maps++;
 for(const mode of MODES){ctx={mapSeed,mode};simulate(cells,(mapSeed+i*31)>>>0,mode);}
}
const summary={maps:stats.maps,simulations:stats.sims,aiTurns:stats.think,orders:stats.orders,sendCalls:stats.turns,blockedSendCalls:stats.soft.blocked,gamesFinished:stats.games,timeouts:stats.timeouts,validAntibodyCaptures:stats.captures,fatClearedAntibodyMarks:stats.fatClears,softIssues:stats.soft,byMode:stats.byMode,violations:stats.violations.length};
console.log(JSON.stringify(summary,null,2));
if(stats.violations.length){
 for(const v of stats.violations.slice(0,10))console.log('VIOLATION',JSON.stringify(v));
 process.exit(1);
}
console.log('PASS: 0 rule violations across '+stats.maps+' random maps / '+stats.sims+' simulations');
