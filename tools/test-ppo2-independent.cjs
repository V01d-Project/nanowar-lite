'use strict';
const assert=require('assert/strict'),P=require('./train-ppo2-independent.cjs'),Arena=require('../src/arena.js');
const w=P.initialize(42);let checks=0;
for(let map=0;map<9;map++)for(const side of [1,2]){const s=Arena.create(map,{},42,2),o=P.candidates(s,side);assert.equal(o.vx.length,P.D);for(const x of o.xs){assert.equal(x.length,P.D);assert(x.every(Number.isFinite));}const d=P.distribution(w,o.xs);assert(Math.abs(d.p.reduce((a,b)=>a+b)-1)<1e-10);checks++;}
const o=P.candidates(Arena.create(0,{},42,2),1),x=o.xs[3],eps=1e-5;let maxError=0;
for(const value of [false,true]){const f=P.forward(w,x,value),g=new Float64Array(P.S);P.backward(w,g,x,f.h,1,value);for(let k=0;k<P.S;k+=11){const old=w[k];w[k]=old+eps;const hi=P.forward(w,x,value).y;w[k]=old-eps;const lo=P.forward(w,x,value).y;w[k]=old;const err=Math.abs((hi-lo)/(2*eps)-g[k]);maxError=Math.max(maxError,err);assert(err<1e-7);checks++;}}
const trainSeeds=new Set(Array.from({length:10000},(_,i)=>(100003+Math.imul(i+1,2654435761))>>>0));for(let i=0;i<500;i++)assert(!trainSeeds.has((3900000501+Math.imul(i+1,2654435761))>>>0));checks++;
const cfg={seconds:20,gamma:.99,lambda:.95,timeCost:.02,duelGames:2048},a=P.episode(w,0,100003,true,cfg),b=P.episode(w,0,100003,true,cfg);assert.deepEqual(a,b);assert(a.steps.every(t=>Number.isFinite(t.adv)&&Number.isFinite(t.ret)));checks++;
const weights=Float64Array.from(w),opt={m:new Float64Array(P.S),v:new Float64Array(P.S),t:0};const metrics=P.update(weights,[a],opt,()=>.5,{...cfg,epochs:2,minibatch:8,clip:.2,entropy:.015,value:.5,gradClip:.5,lr:.0003});assert(weights.every(Number.isFinite));assert(weights.some((v,i)=>v!==w[i]));checks++;
assert.throws(()=>P.distribution(new Float64Array(1),[x]),/dimension/);checks++;
const train2=new Set(Array.from({length:8192},(_,i)=>(200003+Math.imul(i+1,2654435761))>>>0));for(const base of [3100000701,3300000901,3500001101])for(let i=0;i<500;i++)assert(!train2.has((base+Math.imul(i+1,2654435761))>>>0));checks++;
const timeout=P.episode(w,1,200003,true,{...cfg,seconds:7});assert(timeout.draw);assert(timeout.steps.at(-1).reward<-3);checks++;
console.log(JSON.stringify({passed:true,checks,maxGradientError:maxError,dimensions:P.D,hidden:P.H,parameters:P.S,featureMaps:9,trainHoldoutSeedsDisjoint:true,metrics}));
