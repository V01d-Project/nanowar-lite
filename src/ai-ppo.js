/* Frozen PPO actor from train-ppo.cjs. Opponents aggregate in 3/4-seat FFA; two-seat features are unchanged. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./ppo-model.js'));else root.NanoPPO=factory(root.NanoCore,root.NanoPPOModel);})(globalThis,function(C,model){
'use strict';
const GLOBAL=['bias','ownCells','enemyCells','ownPower','enemyPower','neutrals','time','mapCells','ownNormal','enemyNormal','ownSpecial','enemySpecial','ownProduction','enemyProduction','ownInFlight','enemyInFlight'];
const LOCAL=['wait','sourcePower','targetPower','distance','targetNormal','targetFat','targetAntibody','targetFriendly','targetEnemy','targetNeutral','targetMarked','targetFatFriendly','targetFatHostile','sourceMarked','sourceFatFriendly','sourceFatHostile','sourceAdjFriendly','sourceAdjEnemy','sourceAdjNeutral','targetAdjFriendly','targetAdjEnemy','targetAdjNeutral','powerRatio','capturable','sourceReady','sourceLoadProgress','targetReady','targetLoadProgress','sourceNormal','sourceFat','sourceAntibody','sourceSize','targetSize','percent','groupCount','incomingFriendly','incomingEnemy','margin','targetProduction','distanceEnemy','distanceOwn','sourceBorder'];
const D=GLOBAL.length+LOCAL.length,H=16,S=D*H+H+H+1+H+1;
const ix={b:D*H,a:D*H+H,ab:D*H+2*H,v:D*H+2*H+1,vb:D*H+3*H+1};
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function forward(w,x,value=false){const h=new Float64Array(H);let y=w[value?ix.vb:ix.ab];const head=value?ix.v:ix.a;for(let j=0;j<H;j++){let z=w[ix.b+j],o=j*D;for(let k=0;k<D;k++)z+=w[o+k]*x[k];h[j]=Math.tanh(z);y+=w[head+j]*h[j];}return {y,h};}
// Stable softmax; greedy inference is the same frozen evaluation policy.
function distribution(w,xs){const f=xs.map(x=>forward(w,x)),max=Math.max(...f.map(a=>a.y)),p=f.map(a=>Math.exp(a.y-max)),sum=p.reduce((a,b)=>a+b,0);return {f,p:p.map(a=>a/sum)};}
function observation(s,side){const n=s.cells.length,p=C.powerBySide(s),own=s.cells.filter(c=>c.own===side),foe=s.cells.filter(c=>c.own>0&&c.own!==side),enemyPower=p.reduce((v,power,i)=>v+(i>0&&i!==side?power:0),0);const prod=a=>a.reduce((v,c)=>v+(c.type==='n'&&c.fat===-1?1/c.delay:0),0);return [1,own.length/n,foe.length/n,Math.min(5,p[side]/300),Math.min(5,enemyPower/300),s.cells.filter(c=>!c.own).length/n,s.time/180,n/24,own.filter(c=>c.type==='n').length/n,foe.filter(c=>c.type==='n').length/n,own.filter(c=>c.type!=='n').length/n,foe.filter(c=>c.type!=='n').length/n,prod(own)/10,prod(foe)/10,s.units.filter(u=>u.side===side).reduce((v,u)=>v+u.power,0)/300,s.units.filter(u=>u.side>0&&u.side!==side).reduce((v,u)=>v+u.power,0)/300];}
function candidates(s,side){const g=observation(s,side),actions=[null],xs=[g.concat([1,...Array(LOCAL.length-1).fill(0)])],n=s.cells.length;
 const distances=s.cells.map(a=>s.cells.map(b=>Math.hypot(a.x-b.x,a.y-b.y)));
 const adj=s.cells.map(c=>{const a=[0,0,0];for(const t of s.cells)if(t!==c&&distances[c.id][t.id]<160)a[t.own===side?0:t.own?1:2]++;return a.map(v=>v/8);});
 const normal=s.cells.filter(c=>c.type==='n'&&C.canSend(c,side)).sort((a,b)=>b.u-a.u).slice(0,2);
 const groups=normal.map(c=>[c]);if(normal.length===2)groups.push(normal);
 for(const c of s.cells)if(c.type!=='n'&&C.canSend(c,side))groups.push([c]);
 for(const sources of groups){const a=sources[0],power=sources.reduce((v,c)=>v+c.u,0);for(const t of s.cells){if(sources.includes(t)||(a.type==='f'&&t.type!=='n'))continue;
 // Every legal target remains available; no scripted target ranking or special firing.
 for(const pct of a.type==='n'?[50,100]:[100]){const send=power*pct/100,distance=sources.reduce((v,c)=>v+distances[c.id][t.id],0)/sources.length;
 const incoming=[0,0];for(const u of s.units)if(u.target===t.id)incoming[u.side===side?0:1]+=u.power;
 const nearest=owner=>Math.min(640,...s.cells.filter(c=>(owner===-1?c.own>0&&c.own!==side:c.own===owner)&&c!==t).map(c=>distances[c.id][t.id]))/640;
 const hostileFat=t.fat!==-1&&t.fat!==side,capture=t.own!==side&&!t.antibody&&!hostileFat&&send>t.u+1;
 const load=c=>c.ready?1:c.type==='n'?0:clip(c.timer/C.LOAD[c.type],0,1);
 const local=[0,power/200,t.u/100,distance/640,+(t.type==='n'),+(t.type==='f'),+(t.type==='a'),+(t.own===side),+(t.own>0&&t.own!==side),+(t.own===0),+t.antibody,+(t.fat===side),+hostileFat,+a.antibody,+(a.fat===side),+(a.fat!==-1&&a.fat!==side),...adj[a.id],...adj[t.id],clip(send/(t.u+10),0,5)/5,+capture,+a.ready,load(a),+t.ready,load(t),+(a.type==='n'),+(a.type==='f'),+(a.type==='a'),a.size/100,t.size/100,pct/100,sources.length/2,incoming[0]/200,incoming[1]/200,clip((send-t.u)/100,-2,2),t.type==='n'?1/t.delay/2:0,nearest(-1),nearest(side),adj[a.id][1]];
 if(local.length!==LOCAL.length)throw Error('feature length mismatch');xs.push(g.concat(local));actions.push({ids:sources.map(c=>c.id),target:t.id,pct});
 }}}
 return {xs,actions,vx:g.concat(Array(LOCAL.length).fill(0))};}

const weights=Float64Array.from(model.weights);
if(model.config.dimensions!==D||model.config.hidden!==H||weights.length!==S||!weights.every(Number.isFinite))throw Error('Invalid PPO model');
function create({side=2}={}){return {side,policy:'ppo',timer:6,interval:5,turn:0,lastAction:null};}
function think(state,brain,dt){if(state.over||brain.stopped)return;brain.timer-=dt;if(brain.timer>1e-9)return;brain.timer+=brain.interval;brain.turn++;const o=candidates(state,brain.side);let best=0,score=forward(weights,o.xs[0]).y;for(let i=1;i<o.xs.length;i++){const y=forward(weights,o.xs[i]).y;if(y>score){score=y;best=i;}}const action=o.actions[best];brain.lastAction=action;if(action)return C.sendFleet(state,action.ids,action.target,brain.side,action.pct);return 0;}
return {create,think,observation,candidates,forward,distribution,modelInfo:{trainedGames:model.trainedGames,dimensions:D,hidden:H}};
});
