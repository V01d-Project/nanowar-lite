'use strict';
/** Zero-dependency PPO trainer. Only imports the unmodified real arena/core/Normal AI.
 * node tools/train-ppo.cjs --games 10000 --eval 500 --workers 8 --out tools/ppo-10k
 * Timeouts are draws (never adjudicated wins). Holdout seeds never enter updates.
 */
const fs=require('fs'),path=require('path'),os=require('os');
const {Worker,isMainThread,parentPort}=require('worker_threads');
const C=require('../src/core.js'),Arena=require('../src/arena.js'),AI=require('../src/ai.js'),Levels=require('../src/levels.js');
const GLOBAL=['bias','ownCells','enemyCells','ownPower','enemyPower','neutrals','time','mapCells','ownNormal','enemyNormal','ownSpecial','enemySpecial','ownProduction','enemyProduction','ownInFlight','enemyInFlight'];
const LOCAL=['wait','sourcePower','targetPower','distance','targetNormal','targetFat','targetAntibody','targetFriendly','targetEnemy','targetNeutral','targetMarked','targetFatFriendly','targetFatHostile','sourceMarked','sourceFatFriendly','sourceFatHostile','sourceAdjFriendly','sourceAdjEnemy','sourceAdjNeutral','targetAdjFriendly','targetAdjEnemy','targetAdjNeutral','powerRatio','capturable','sourceReady','sourceLoadProgress','targetReady','targetLoadProgress','sourceNormal','sourceFat','sourceAntibody','sourceSize','targetSize','percent','groupCount','incomingFriendly','incomingEnemy','margin','targetProduction','distanceEnemy','distanceOwn','sourceBorder'];
const D=GLOBAL.length+LOCAL.length,H=16,S=D*H+H+H+1+H+1;
const ix={b:D*H,a:D*H+H,ab:D*H+2*H,v:D*H+2*H+1,vb:D*H+3*H+1};
function rng(seed){let n=seed>>>0;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);}
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
function initialize(seed){const r=rng(seed),w=new Float64Array(S);for(let i=0;i<D*H;i++)w[i]=(r()*2-1)*Math.sqrt(6/(D+H));for(let j=0;j<H;j++){w[ix.a+j]=(r()*2-1)*.015;w[ix.v+j]=(r()*2-1)*.1;}return w;}
function forward(w,x,value=false){const h=new Float64Array(H);let y=w[value?ix.vb:ix.ab];const head=value?ix.v:ix.a;for(let j=0;j<H;j++){let z=w[ix.b+j],o=j*D;for(let k=0;k<D;k++)z+=w[o+k]*x[k];h[j]=Math.tanh(z);y+=w[head+j]*h[j];}return {y,h};}
function backward(w,g,x,h,dy,value=false){const head=value?ix.v:ix.a;g[value?ix.vb:ix.ab]+=dy;for(let j=0;j<H;j++){g[head+j]+=dy*h[j];const d=dy*w[head+j]*(1-h[j]*h[j]);g[ix.b+j]+=d;const o=j*D;for(let k=0;k<D;k++)g[o+k]+=d*x[k];}}
function distribution(w,xs){const f=xs.map(x=>forward(w,x)),max=Math.max(...f.map(a=>a.y)),p=f.map(a=>Math.exp(a.y-max)),sum=p.reduce((a,b)=>a+b,0);return {f,p:p.map(a=>a/sum)};}
function observation(s,side){const n=s.cells.length,p=C.powerBySide(s),own=s.cells.filter(c=>c.own===side),foe=s.cells.filter(c=>c.own&&c.own!==side),foePower=[1,2,3,4].reduce((v,k)=>v+(k!==side?p[k]:0),0);const prod=a=>a.reduce((v,c)=>v+(c.type==='n'&&c.fat===-1?1/c.delay:0),0);return [1,own.length/n,foe.length/n,Math.min(5,p[side]/300),Math.min(5,foePower/300),s.cells.filter(c=>!c.own).length/n,s.time/180,n/24,own.filter(c=>c.type==='n').length/n,foe.filter(c=>c.type==='n').length/n,own.filter(c=>c.type!=='n').length/n,foe.filter(c=>c.type!=='n').length/n,prod(own)/10,prod(foe)/10,s.units.filter(u=>u.side===side).reduce((v,u)=>v+u.power,0)/300,s.units.filter(u=>u.side&&u.side!==side).reduce((v,u)=>v+u.power,0)/300];}
function potential(s,side){const g=observation(s,side);return 1.5*(g[1]-g[2])+.35*(g[3]-g[4])+.3*(g[12]-g[13]);}
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
 const nearestEnemy=Math.min(640,...s.cells.filter(c=>c.own&&c.own!==side&&c!==t).map(c=>distances[c.id][t.id]))/640,nearestOwn=Math.min(640,...s.cells.filter(c=>c.own===side&&c!==t).map(c=>distances[c.id][t.id]))/640;
 const hostileFat=t.fat!==-1&&t.fat!==side,capture=t.own!==side&&!t.antibody&&!hostileFat&&send>t.u+1;
 const load=c=>c.ready?1:c.type==='n'?0:clip(c.timer/C.LOAD[c.type],0,1);
 const local=[0,power/200,t.u/100,distance/640,+(t.type==='n'),+(t.type==='f'),+(t.type==='a'),+(t.own===side),+(t.own>0&&t.own!==side),+(t.own===0),+t.antibody,+(t.fat===side),+hostileFat,+a.antibody,+(a.fat===side),+(a.fat!==-1&&a.fat!==side),...adj[a.id],...adj[t.id],clip(send/(t.u+10),0,5)/5,+capture,+a.ready,load(a),+t.ready,load(t),+(a.type==='n'),+(a.type==='f'),+(a.type==='a'),a.size/100,t.size/100,pct/100,sources.length/2,incoming[0]/200,incoming[1]/200,clip((send-t.u)/100,-2,2),t.type==='n'?1/t.delay/2:0,nearestEnemy,nearestOwn,adj[a.id][1]];
 if(local.length!==LOCAL.length)throw Error('feature length mismatch');xs.push(g.concat(local));actions.push({ids:sources.map(c=>c.id),target:t.id,pct});
 }}}
 return {xs,actions,vx:g.concat(Array(LOCAL.length).fill(0))};}
function episode(w,index,seedBase,training,config){const campaign=!!(config.campaignLevels&&config.campaignLevels.length),map=campaign?config.campaignLevels[index%config.campaignLevels.length]:index%9,side=campaign?1:1+(Math.floor(index/9)%2),seed=(seedBase+Math.imul(index+1,2654435761))>>>0,s=campaign?Levels.create(map,{difficulty:0,seed}):Arena.create(map,{},seed,2),brains=campaign?s.ai.filter(b=>b.side!==side).map(AI.create):[AI.create({side:3-side,mode:'normal',timeDecision:5000})],r=rng(seed^0xa5a5a5a5),steps=[];let next=6,phi=potential(s,side),last=null;
 for(let f=0;f<config.seconds*C.FPS&&!s.over;f++){if(s.time+1e-8>=next){if(training&&last){last.reward=.99*potential(s,side)-phi;phi=potential(s,side);}
 const o=candidates(s,side),d=distribution(w,o.xs);let action;if(training){let u=r();action=d.p.length-1;for(let i=0;i<d.p.length;i++){u-=d.p[i];if(u<=0){action=i;break;}}}else{action=0;for(let i=1;i<d.p.length;i++)if(d.p[i]>d.p[action])action=i;}
 if(training){last={xs:o.xs,vx:o.vx,action,logp:Math.log(d.p[action]+1e-30),value:forward(w,o.vx,true).y,reward:0};steps.push(last);}const a=o.actions[action];if(a)C.sendFleet(s,a.ids,a.target,side,a.pct);next+=5;}
 for(const b of brains)AI.think(s,b,C.FRAME);C.step(s,C.FRAME);}
 const win=campaign?s.over===1:s.over===side,loss=campaign?s.over===2:s.over===3-side,draw=!win&&!loss;
 if(training&&last){last.reward=(potential(s,side)-phi)+(win?2:loss?-2:0);let gae=0,nv=0;for(let i=steps.length-1;i>=0;i--){const t=steps[i],delta=t.reward+config.gamma*nv-t.value;gae=delta+config.gamma*config.lambda*gae;t.adv=gae;t.ret=gae+t.value;nv=t.value;}}
 return {index,map,side,win:+win,loss:+loss,draw:+draw,seconds:s.time,steps};}
function update(w,episodes,opt,random,config){const ts=episodes.flatMap(e=>e.steps),mean=ts.reduce((a,t)=>a+t.adv,0)/ts.length,sd=Math.sqrt(ts.reduce((a,t)=>a+(t.adv-mean)**2,0)/ts.length)+1e-8;for(const t of ts)t.norm=(t.adv-mean)/sd;let kl=0,clipped=0,total=0,vl=0,entropy=0;
 for(let epoch=0;epoch<config.epochs;epoch++){const order=Array.from({length:ts.length},(_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}let epochKL=0,epochN=0;
 for(let start=0;start<order.length;start+=config.minibatch){const end=Math.min(order.length,start+config.minibatch),g=new Float64Array(S);for(let u=start;u<end;u++){const t=ts[order[u]],d=distribution(w,t.xs),lp=Math.log(d.p[t.action]+1e-30),ratio=Math.exp(lp-t.logp),adv=t.norm,active=!((adv>=0&&ratio>1+config.clip)||(adv<0&&ratio<1-config.clip));let ent=0;for(const p of d.p)ent-=p*Math.log(p+1e-30);for(let k=0;k<d.p.length;k++){let dy=active?-adv*ratio*((k===t.action?1:0)-d.p[k]):0;dy+=config.entropy*d.p[k]*(Math.log(d.p[k]+1e-30)+ent);backward(w,g,t.xs[k],d.f[k].h,dy);}
 const v=forward(w,t.vx,true),vc=t.value+clip(v.y-t.value,-config.clip,config.clip),raw=(v.y-t.ret)**2,cl=(vc-t.ret)**2;let dv=v.y-t.ret;if(cl>raw&&Math.abs(v.y-t.value)>config.clip)dv=0;backward(w,g,t.vx,v.h,config.value*dv,true);
 const kval=(ratio-1)-(lp-t.logp);epochKL+=kval;epochN++;kl+=kval;clipped+=+(Math.abs(ratio-1)>config.clip);vl+=Math.max(raw,cl);entropy+=ent;total++;}
 let norm=0;for(let k=0;k<S;k++){g[k]/=(end-start);norm+=g[k]*g[k];}const scale=Math.min(1,config.gradClip/(Math.sqrt(norm)+1e-12));opt.t++;for(let k=0;k<S;k++){const v=g[k]*scale;opt.m[k]=.9*opt.m[k]+.1*v;opt.v[k]=.999*opt.v[k]+.001*v*v;w[k]-=config.lr*(opt.m[k]/(1-.9**opt.t))/(Math.sqrt(opt.v[k]/(1-.999**opt.t))+1e-8);if(!Number.isFinite(w[k]))throw Error('non-finite weight');}}
 if(epochKL/Math.max(1,epochN)>.025)break;}
 return {transitions:ts.length,kl:kl/total,clipFraction:clipped/total,valueLoss:vl/total,entropy:entropy/total};}
function stats(es,config){const campaign=!!(config&&config.campaignLevels&&config.campaignLevels.length),names=campaign?config.campaignLevels.map(l=>Levels.levels[l].name):Arena.names,ids=campaign?config.campaignLevels:Arena.names.map((_,i)=>i);const out={games:es.length,wins:0,losses:0,draws:0,winRate:0,averageScore:0,meanSimSeconds:0,byMap:names.map((name,i)=>({map:ids[i],name,games:0,wins:0,losses:0,draws:0}))};for(const e of es){out.wins+=e.win;out.losses+=e.loss;out.draws+=e.draw;out.meanSimSeconds+=e.seconds;const idx=campaign?config.campaignLevels.indexOf(e.map):e.map;if(idx>=0){const m=out.byMap[idx];m.games++;m.wins+=e.win;m.losses+=e.loss;m.draws+=e.draw;}}out.winRate=out.wins/es.length;out.meanSimSeconds/=es.length;const rates=out.byMap.filter(m=>m.games).map(m=>m.wins/m.games);out.averageScore=rates.reduce((a,b)=>a+b,0)/Math.max(1,rates.length);const z=1.96,n=es.length,p=out.winRate,den=1+z*z/n,mid=(p+z*z/(2*n))/den,rad=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;out.wilson95=[mid-rad,mid+rad];return out;}

module.exports={candidates,forward,distribution,D,H,S};
