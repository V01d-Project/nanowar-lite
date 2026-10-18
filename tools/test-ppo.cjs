'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../src/core.js'),Arena=require('../src/arena.js'),P=require('../src/ai-ppo.js'),M=require('../src/ppo-model.js');
const root=path.resolve(__dirname,'..'),weights=Float64Array.from(M.weights);
assert.equal(M.trainedGames,10000);assert.equal(weights.length,978);assert(weights.every(Number.isFinite));
console.log('model sha256 '+crypto.createHash('sha256').update(Buffer.from(weights.buffer)).digest('hex'));
// Browser globals have no CommonJS, fs, fetch or runtime JSON dependency.
const browser=vm.createContext({});for(const file of ['core.js','ppo-model.js','ai-ppo.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),browser,{filename:file});
assert.equal(browser.NanoPPO.create({side:4}).side,4);
for(const count of [2,3,4])for(let map=0;map<Arena.names.length;map++){
 const s=Arena.create(map,{},123,count),brains=Array.from({length:count-1},(_,i)=>P.create({side:i+2}));
 for(const b of brains){const o=P.candidates(s,b.side);assert(o.xs.every(x=>x.length===58&&x.every(Number.isFinite)));const d=P.distribution(weights,o.xs);assert(Math.abs(d.p.reduce((a,b)=>a+b,0)-1)<1e-12);}
 for(let frame=0;frame<750&&!s.over;frame++){C.step(s,C.FRAME);for(const b of brains)P.think(s,b,C.FRAME);}
 assert(s.nextUnit>0,'PPO must dispatch on map '+map+' / '+count+' seats');assert(s.cells.every(c=>Number.isFinite(c.u)));
}
// First decision at six seconds, matching training; subsequent decisions every five.
{const s=Arena.create(1,{},1),b=P.create({side:2});for(let i=0;i<149;i++)P.think(s,b,C.FRAME);assert.equal(b.turn,0);P.think(s,b,C.FRAME);assert.equal(b.turn,1);assert(b.lastAction);for(let i=0;i<125;i++)P.think(s,b,C.FRAME);assert.equal(b.turn,2);b.stopped=true;P.think(s,b,5);assert.equal(b.turn,2);}
// App-level preference: defaults classic, persists, never swaps a live brain.
function appContext(saved){const elements=new Map(),memory=new Map(saved===undefined?[]:[['nanowar-ai-ppo',saved]]);const el=id=>{if(!elements.has(id))elements.set(id,{value:id==='difficulty'?'0':'1',checked:false,disabled:false,hidden:false,style:{},classList:{add(){}},showModal(){},close(){}});return elements.get(id);};const sandbox={NanoCore:C,NanoArena:Arena,NanoArenaMaps:require('../src/arena-maps.js'),NanoLevels:require('../src/levels.js'),NanoAI:require('../src/ai.js'),NanoPPO:P,NanoCampaign:require('../src/campaign.js'),NanoRender:{create(){return {draw(){},resize(){}};}},NanoInput:{create(){return {percent:50,selected:new Set(),reset(){},cancel(){},update(){}};}},document:{getElementById:el,querySelector(){return el('query');},documentElement:{dataset:{}},addEventListener(){}},performance:{now:()=>0},navigator:{},location:{protocol:'file:'},requestAnimationFrame(){},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}};sandbox.window=sandbox;sandbox.addEventListener=()=>{};vm.runInNewContext(fs.readFileSync(path.join(root,'src/app.js'),'utf8'),sandbox);return {app:sandbox.NanoApp,el,memory};}
{const {app,el,memory}=appContext();assert(!el('ai-ppo').checked);app.setLevel(101);assert(app.brains.every(b=>b.policy!=='ppo'));el('ai-ppo').checked=true;el('ai-ppo').onchange();assert.equal(memory.get('nanowar-ai-ppo'),'true');assert(app.brains.every(b=>b.policy!=='ppo'));app.reset();assert(app.brains.every(b=>b.policy==='ppo'));app.enterNetwork({side:1});assert(el('ai-ppo').disabled);app.leaveNetwork();assert(!el('ai-ppo').disabled);}
assert(appContext('true').el('ai-ppo').checked);
console.log('PASS PPO: embedded/browser model, 24 arena layouts (2/3/4 seats), dispatch, cadence, preference persistence');
