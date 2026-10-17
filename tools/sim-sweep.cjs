'use strict';
// Offline, seeded 25fps campaign stress test. No DOM or artificial auto-firing.
const fs=require('node:fs'),path=require('node:path');
const C=require('../src/core.js'),AI=require('../src/ai.js'),L=require('../src/levels.js');
const profiles=['mixed','easy','normal','noob'];
const thresholds={deadlockSeconds:10,specialReadySeconds:60,inactiveSeconds:45};
function liveSides(s){
 return [...new Set([
  ...s.cells.filter(c=>c.own).map(c=>c.own),...s.units.map(u=>u.side),
  ...s.minis.filter(m=>m.side&&m.mode!=='bounce').map(m=>m.side)
 ])];
}
function runGame(level,difficulty,profile,seconds=300){
 const seed=level*1009+difficulty*97+profiles.indexOf(profile)+1;
 const s=L.create(level,{difficulty,seed});
 const sides=[...new Set(s.cells.map(c=>c.own).filter(Boolean))].sort();
 const brains=sides.map((side,i)=>AI.create({
  side,mode:profile==='mixed'?['normal','easy','noob'][i%3]:profile,timeDecision:3000
 }));
 const issues=new Map(),ready=new Map(),launches={};
 let blocked=0,maxBlocked=0,lastLaunch=0,winner=0;
 function issue(kind,details){
  if(!issues.has(kind))issues.set(kind,{kind,time:+s.time.toFixed(2),details});
 }
 for(let frame=0;frame<seconds*C.FPS&&!winner;frame++){
  // The UI's over=2 means player defeat, not a winner in a 3/4-faction match.
  // Continue the remaining factions, without changing the production winner API.
  s.over=0;C.step(s,C.FRAME);
  const alive=liveSides(s);
  if(alive.length===1&&!s.units.length&&!s.minis.length){winner=alive[0];break;}
  s.over=0;
  const next=s.nextUnit;
  for(const brain of brains)AI.think(s,brain,C.FRAME);
  if(s.nextUnit!==next)lastLaunch=s.time;
  for(const u of s.units)if(u.id>=next&&u.kind!=='w')launches[u.source]=(launches[u.source]||0)+1;
  for(const [kind,items,fields] of [
   ['cell',s.cells,['u','x','y','powerMax','timer','growth','delay','ray2']],
   ['unit',s.units,['x','y','power','wanted','v','vmax','age']],
   ['mini',s.minis,['x','y','vx','vy','v']]
  ])for(const obj of items)for(const field of fields){
   if(!Number.isFinite(obj[field]))issue('nonfinite',{kind,id:obj.id,field,value:String(obj[field])});
   if(['u','power','wanted'].includes(field)&&obj[field]<0)
    issue('negativeEnergy',{kind,id:obj.id,field,value:obj[field]});
  }
  for(const c of s.cells.filter(c=>c.type!=='n')){
   const previous=ready.get(c.id);
   if(!c.ready||!c.own){ready.delete(c.id);continue;}
   if(!previous||previous.side!==c.own)ready.set(c.id,{side:c.own,time:s.time});
   const actionable=s.cells.some(t=>t!==c&&(c.type!=='f'||t.type==='n')&&
    (c.type!=='a'||t.fat===-1||t.fat===c.own)&&
    (t.own!==c.own||(c.type==='f'?t.fat!==c.own:!t.antibody)));
   if(actionable&&s.time-ready.get(c.id).time>thresholds.specialReadySeconds)
    issue('specialNeverFires',{id:c.id,type:c.type,side:c.own});
  }
  // A low-energy cell which can produce, or a charging full battery, is NOT frozen.
  const canEverSend=s.cells.some(c=>c.own&&
   s.cells.some(t=>t!==c&&(c.type!=='f'||t.type==='n'))&&
   (C.canSend(c,c.own)||(c.type==='n'&&(c.fat===-1||c.fat===c.own))||
    (c.type!=='n'&&c.u>=c.powerMax)));
  if(alive.length>1&&!s.units.length&&!s.minis.length&&!canEverSend)blocked+=C.FRAME;
  else blocked=0;
  maxBlocked=Math.max(maxBlocked,blocked);
  if(blocked>=thresholds.deadlockSeconds)issue('deadlock',{
   cells:s.cells.map(c=>({id:c.id,own:c.own,u:c.u,type:c.type,fat:c.fat}))
  });
 }
 return {
  level,difficulty,profile,seed,seconds:+s.time.toFixed(2),winner,timeout:!winner,
  timeoutKind:winner?null:(s.time-lastLaunch>thresholds.inactiveSeconds?'inactive-policy':'active-contest'),
  lastLaunch:+lastLaunch.toFixed(2),maxBlocked:+maxBlocked.toFixed(2),issues:[...issues.values()],
  final:s.cells.map(c=>({id:c.id,own:c.own,u:c.u,type:c.type,fat:c.fat,antibody:c.antibody,ready:c.ready})),
  launches
 };
}
function sweep(){
 const games=[];
 for(let level=1;level<=25;level++)for(let difficulty=0;difficulty<3;difficulty++)
  for(const profile of profiles){
   try{games.push(runGame(level,difficulty,profile));}
   catch(error){games.push({level,difficulty,profile,winner:0,timeout:false,
    issues:[{kind:'exception',details:{message:error.stack}}]});}
  }
 const categories={nonfinite:0,negativeEnergy:0,deadlock:0,specialNeverFires:0,exception:0};
 for(const game of games)for(const issue of game.issues)categories[issue.kind]++;
 const summary={
  games:games.length,normal:games.filter(g=>!g.issues.length).length,
  abnormal:games.filter(g=>g.issues.length).length,finished:games.filter(g=>g.winner).length,
  timeouts:games.filter(g=>g.timeout).length,categories,
  timeoutKinds:games.filter(g=>g.timeout).reduce((n,g)=>(n[g.timeoutKind]=(n[g.timeoutKind]||0)+1,n),{})
 };
 const report={fps:C.FPS,secondsPerGame:300,profiles,thresholds,
  note:'normal means no engine anomaly, NOT necessarily a winner within 300 seconds',summary,games};
 const output=process.argv[2]||'tmp/sim-sweep.json';
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+String.fromCharCode(10));
 console.log(JSON.stringify(summary,null,2));console.log('Report: '+output);
 process.exitCode=summary.abnormal?1:0;
 return report;
}
if(require.main===module)sweep();
module.exports={runGame,sweep};
