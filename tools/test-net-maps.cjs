/* Catalogue fairness, deterministic selection, AI compatibility and live HTTP/SSE setup. */
'use strict';
const assert=require('node:assert/strict'),Core=require('../src/core.js'),AI=require('../src/ai.js'),Arena=require('../src/arena.js'),Catalogue=require('../src/arena-maps.js'),{createServer}=require('../server.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=8000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await sleep(20);}throw Error('Map test timeout: '+fn);}
function fair(state,count){
 const first=state.cells.filter(c=>c.own===1),energy=first.reduce((sum,c)=>sum+c.u,0);
 for(let side=1;side<=count;side++){
  const cells=state.cells.filter(c=>c.own===side);assert.equal(cells.length,first.length);assert.equal(cells.reduce((sum,c)=>sum+c.u,0),energy);assert.deepEqual(state.upgrades[side],state.upgrades[1]);
 }
 // A bijection for EVERY cell, including central fixed points and neutral types/energy.
 const angle=2*Math.PI/count,matched=new Set();
 for(const c of state.cells){
  const x=320+(c.x-320)*Math.cos(angle)-(c.y-240)*Math.sin(angle),y=240+(c.x-320)*Math.sin(angle)+(c.y-240)*Math.cos(angle),own=c.own?c.own%count+1:0;
  const candidates=state.cells.filter(t=>t.own===own&&Math.abs(t.x-x)<1e-7&&Math.abs(t.y-y)<1e-7);assert.equal(candidates.length,1,'unique rotated counterpart: '+c.id);
  const t=candidates[0];assert.ok(!matched.has(t.id),'rotation is one-to-one');matched.add(t.id);
  for(const k of ['type','size','u','powerMax','delay','ready','timer','loading','fat','antibody','upgrades'])assert.deepEqual(t[k],c[k],k+' rotates too');
 }
 assert.equal(matched.size,state.cells.length);assert.equal(state.difficulty,0);
 if(state.level>=3)for(const c of state.cells){
  assert.ok(c.x-c.ray>=-1e-7&&c.x+c.ray<=640+1e-7&&c.y-c.ray>=-1e-7&&c.y+c.ray<=480+1e-7,'inside canvas');
  for(const t of state.cells)if(c.id<t.id)assert.ok(Math.hypot(c.x-t.x,c.y-t.y)>c.ray+t.ray+2,'non-overlapping new map cells '+c.id+'/'+t.id);
 }
}
function pure(){
 assert.equal(Arena.names.length,9);assert.equal(new Set(Arena.names).size,9);assert.deepEqual(Arena.names,Catalogue.names);
 for(const count of [2,3,4]){
  const counts=new Set();
  for(let level=0;level<Arena.names.length;level++){
   for(let n=0;n<=4;n++){
    const upgrades={speed:n,time:n,shield:n,special:n},a=Arena.create(level,upgrades,123,count),b=Arena.create(level,upgrades,123,count);fair(a,count);
    for(let frame=0;frame<25;frame++){Core.step(a,Core.FRAME);Core.step(b,Core.FRAME);}assert.deepEqual(a,b,'deterministic map replay');
   }
   if(level>=3)counts.add(Arena.map(level,count).length);
   for(const mode of ['easy','normal','noob']){
    const bots=Array.from({length:count-1},(_,i)=>({side:i+2,mode})),s=Arena.create(level,{},123,count,bots),brains=bots.map(AI.create);
    for(let frame=0;frame<750&&!s.over;frame++){Core.step(s,Core.FRAME);for(const brain of brains)AI.think(s,brain,Core.FRAME);}assert.ok(s.nextUnit>1,'AI acts on '+Arena.names[level]+'/'+count+'/'+mode);
   }
  }
  assert.equal(counts.size,6,'six new layouts have different cell counts');
 }
 const selected=new Set();for(let seed=1;seed<=100;seed++){const a=Arena.create(-1,{},seed,4);assert.equal(a.level,Arena.resolveLevel(-1,seed));assert.deepEqual(a,Arena.create(-1,{},seed,4));selected.add(a.level);}assert.equal(selected.size,Arena.names.length,'random can select every map');
 // Complete full simulated matches using the unchanged authoritative core + original AI.
 for(const count of [2,4]){
  const bots=Array.from({length:count},(_,i)=>({side:i+1,mode:'normal'})),s=Arena.create(3,{},17,count,bots),brains=bots.map(AI.create);
  for(let frame=0;frame<30000&&!s.over;frame++){Core.step(s,Core.FRAME);for(const brain of brains)AI.think(s,brain,Core.FRAME);}
  assert.ok(s.over>=1&&s.over<=count,'complete '+count+'-seat new-map match');console.log('maps: '+count+'-seat '+Arena.names[3]+' full AI match winner '+s.over+' at '+s.time.toFixed(1)+'s');
 }
 console.log('PASS maps: 9 maps × 2/3/4 seats × 5 upgrades; full cell/neutral rotation bijections, equal energy/upgrades, six distinct layouts, bounds/non-overlap, all AI modes, deterministic random');
}
async function run(){
 pure();const server=createServer(),clients=[];await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function post(route,data,status=200){const res=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated-static.invalid'},body:JSON.stringify(data)});assert.equal(res.headers.get('access-control-allow-origin'),'*');const m=await res.json();assert.equal(res.status,status,JSON.stringify(m));return m;}
 async function client(options){const m=await post('create',{options}),c={...m,latest:null,initial:null,seq:0,ctrl:new AbortController(),cmd(action,data={}){return post('command',{token:this.token,seq:++this.seq,action,...data});}};clients.push(c);
  const res=await fetch(base+'/api/events?token='+c.token,{signal:c.ctrl.signal});c.reader=(async()=>{let rest='';try{for await(const chunk of res.body){rest+=new TextDecoder().decode(chunk);let n;while((n=rest.indexOf(String.fromCharCode(10,10)))>=0){const event=rest.slice(0,n);rest=rest.slice(n+2);if(event.startsWith('event:'))continue;const line=event.split(String.fromCharCode(10)).find(l=>l.startsWith('data: '));if(line){c.latest=JSON.parse(line.slice(6));if(c.latest.state?.time===0)c.initial=c.latest;}}}}catch(e){if(e.name!=='AbortError')throw e;}})();await until(()=>c.latest);return c;
 }
 try{
  for(const level of [-2,9,1.1,'3'])await post('create',{options:{level}},400);
  for(const count of [2,3,4])for(let level=-1;level<Arena.names.length;level++){
   const c=await client({level,playerCount:count,aiCount:count-1,aiDifficulty:['normal','easy','noob'][(level+1)%3]});
   assert.equal(c.room.mapLevel,level);assert.equal(c.room.mapName,level===-1?'随机（开局揭晓）':Arena.names[level]);assert.ok(c.room.symmetry.includes((360/count)+'°'));
   await c.cmd('ready',{ready:true});await c.cmd('start');await until(()=>c.initial);const actual=c.initial.room.mapLevel;assert.equal(actual,level===-1?Arena.resolveLevel(-1,c.initial.room.seed):level);assert.equal(c.initial.room.mapName,Arena.names[actual]);assert.equal(c.initial.state.level,actual);fair(c.initial.state,count);assert.equal(c.initial.state.ai.length,count-1);
   if(level>=3){await until(()=>c.latest.state.time>=0.08);assert.equal(c.latest.room.phase,'playing');}
   await c.cmd('leave');c.ctrl.abort();
  }
  console.log('PASS live maps: all fixed/random maps start via cross-origin HTTP/SSE with 2/3/4 seats + AI, server-selected names/seeds, invalid IDs rejected');
 }finally{for(const c of clients)c.ctrl.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
module.exports={run,pure};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
