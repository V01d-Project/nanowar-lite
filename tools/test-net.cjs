/* Real HTTP/SSE clients against a child node server.js; no dependencies or test-only simulation speed. */
'use strict';
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const Core=require('../src/core.js'),Arena=require('../src/arena.js');
function fair(state){const one=state.cells.filter(c=>c.own===1),two=state.cells.filter(c=>c.own===2);assert.equal(one.length,two.length);assert.equal(one.reduce((n,c)=>n+c.u,0),two.reduce((n,c)=>n+c.u,0));assert.deepEqual(state.upgrades[1],state.upgrades[2]);for(const c of one){const pair=two.find(d=>d.x===640-c.x&&d.y===480-c.y);assert.ok(pair,'180-degree mirrored cell');for(const k of ['u','size','type','powerMax','delay','ready'])assert.deepEqual(c[k],pair[k]);assert.deepEqual(c.upgrades,pair.upgrades);}assert.equal(state.difficulty,0);assert.deepEqual(state.ai,[]);}
for(let level=0;level<3;level++)for(let n=0;n<=4;n++){const u={speed:n,time:n,shield:n,special:n},a=Arena.create(level,u,123),b=Arena.create(level,u,123);fair(a);for(let i=0;i<50;i++){Core.step(a,Core.FRAME);Core.step(b,Core.FRAME);}assert.deepEqual(a,b,'seeded deterministic PvP');}
for(const side of [1,2]){const s=Arena.create(1,{},1);s.cells=s.cells.filter(c=>c.own===side);assert.equal(Core.winner(s),side);s.units=[{side}];assert.equal(Core.winner(s),0,'both sides wait for in-flight units');}
// Reversing seats and both initial priority bits must permit the same winning strategy.
for(const winner of [1,2])for(const seed of [1,2]){const s=Arena.create(2,{},seed),loser=3-winner,source=loser-1;for(const target of loser===1?[2,4]:[3,5])Core.sendFleet(s,[source],target,loser,25);for(let i=0;i<175;i++)Core.step(s,Core.FRAME);Core.sendFleet(s,[winner-1],loser-1,winner,100);for(let i=0;i<1000&&!s.over;i++)Core.step(s,Core.FRAME);assert.equal(s.over,winner,'mirrored combat can finish for either seat/priority seed');}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=6000){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await sleep(20);}throw Error('Timed out: '+fn.toString());}
(async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,ALLOWED_ORIGINS:'*',HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});let output='',stderr='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>stderr+=d);let clients=[];
 try{
 await until(()=>output.match(/localhost:(\d+)/));const base='http://127.0.0.1:'+output.match(/localhost:(\d+)/)[1];
 async function post(route,data,status=200){const res=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),m=await res.json();assert.equal(res.status,status,JSON.stringify(m));return m;}
 function client(m){const c={...m,latest:null,history:new Map(),controller:null,async open(){this.controller=new AbortController();const res=await fetch(base+'/api/events?token='+this.token,{signal:this.controller.signal});assert.equal(res.status,200);this.pump=(async()=>{let rest='';try{for await(const chunk of res.body){rest+=new TextDecoder().decode(chunk);let n;while((n=rest.indexOf('\n\n'))>=0){const event=rest.slice(0,n);rest=rest.slice(n+2);if(event.startsWith('event: heartbeat'))continue;for(const line of event.split('\n'))if(line.startsWith('data: ')){const m=JSON.parse(line.slice(6));this.latest=m;this.history.set(m.room.revision,m);if(this.history.size>100)this.history.delete(this.history.keys().next().value);}}}}catch(e){if(e.name!=='AbortError')throw e;}})();await until(()=>this.latest);},close(){this.controller?.abort();},cmd(action,data={},status=200){return post('command',{...data,token:this.token,seq:++this.seq,action},status);}};c.heartbeat=setInterval(()=>{post('ping',{token:c.token}).catch(()=>{});},5000);clients.push(c);return c;}
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/src/net-client.js')).status,200);assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/.git/config')).status,404);
 for(const origin of ['https://pages-a.invalid','https://pages-b.invalid','null']){const pre=await fetch(base+'/api/create',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),'*');const health=await fetch(base+'/api/health',{headers:{Origin:origin}});assert.equal(health.status,200);assert.equal(health.headers.get('access-control-allow-origin'),'*');}
 const invalid=await fetch(base+'/api/join',{method:'POST',headers:{Origin:'https://pages-a.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,404);assert.equal(invalid.headers.get('access-control-allow-origin'),'*');
 await post('create',{options:{level:26}},400);await post('join',{code:'XXXXXX'},404);
 const a=client(await post('create',{options:{level:2,difficulty:2,upgrades:{speed:0,time:0,shield:0,special:0}}}));assert.match(a.room.code,/^[A-F0-9]{6}$/);await a.open();
 const b=client(await post('join',{code:a.room.code.toLowerCase()}));await b.open();await until(()=>a.latest.room.players[1]?.connected);assert.equal(a.side,1);assert.equal(b.side,2);
 await post('join',{code:a.room.code},409);await b.cmd('configure',{options:{level:2}},403);await a.cmd('start',{},409);
 await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('configure',{options:{level:2,difficulty:2}});await until(()=>a.latest.room.players.every(p=>!p.ready));
 await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('start');await until(()=>a.latest.state&&b.latest.state);assert.equal(a.latest.state.ai.length,0);const initial=[...a.history.values()].find(m=>m.state?.time===0);assert.ok(initial,'initial snapshot at time zero');fair(initial.state);assert.equal(initial.state.seed,initial.room.seed);
 const source=a.latest.state.cells.find(c=>c.own===1).id,target=a.latest.state.cells.find(c=>c.own===2).id;
 await b.cmd('send',{ids:[source],target,percent:100},400);await a.cmd('send',{ids:[source],target:-1},400);await a.cmd('percent',{percent:Infinity},400);await a.cmd('select',{ids:[source]});await a.cmd('percent',{percent:100});
 const oldSeq=a.seq;await post('command',{token:a.token,seq:oldSeq,action:'send',ids:[source],target},409);
 // Drop SSE, observe pause, restore identity + exact snapshot using the original seat token.
 b.close();await until(()=>a.latest.room.players[1].connected===false);const paused=a.latest.state.time;await sleep(200);assert.equal(a.latest.state.time,paused);await a.cmd('send',{ids:[source],target,percent:100},409);
 const restored=await post('resume',{token:b.token});assert.equal(restored.side,2);assert.equal(restored.room.code,a.room.code);b.seq=restored.seq;b.latest=null;await b.open();await until(()=>a.latest.room.players[1].connected);
 // Red intentionally wastes two small fleets on neutral garrisons; blue counterattacks.
 await b.cmd('send',{ids:[target],target:3,percent:25});await b.cmd('send',{ids:[target],target:5,percent:25});
 await until(()=>b.latest.state.units.length===0&&b.latest.state.time>7,15000);
 await a.cmd('send',{target});await until(()=>a.latest.state.units.length>0);await until(()=>b.latest.state.units.length>0);
 // Opponent returns a small legal fleet as well; both clients issue commands, server resolves all combat.
 // No further red orders: finish through real authoritative combat, not a surrender/test hook.
 await until(()=>a.latest.room.phase==='finished'&&b.latest.room.phase==='finished',30000);
 assert.equal(a.latest.room.winner,1);assert.equal(a.latest.state.over,1);assert.deepEqual(a.latest,b.latest,'final authoritative states must match byte-for-byte structurally');
 let comparisons=0;for(const [revision,snapshot]of a.history)if(b.history.has(revision)){assert.deepEqual(snapshot,b.history.get(revision));comparisons++;}assert.ok(comparisons>20,'compare many in-flight snapshots, not only final state');
 await a.cmd('rematch');assert.equal(a.latest.room.phase,'finished');await b.cmd('rematch');await until(()=>a.latest.room.phase==='lobby');await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('start');await until(()=>a.latest.room.round===2&&a.latest.room.phase==='playing');assert.equal(a.latest.state.over,0);
 // Actual 30-second grace timeout and rejected expired token (no shortened test clock).
 b.close();await until(()=>!a.latest.room.players[1].connected);await until(()=>a.latest.room.phase==='finished',33000);assert.equal(a.latest.room.winner,1);assert.match(a.latest.room.reason,/30秒/);await post('resume',{token:b.token},401);
 console.log('PASS network: create/join, host config + ready, role/command validation, real 25fps combat, '+comparisons+' identical snapshots, reconnect + pause, rematch, actual 30s expiry, static isolation, CORS/preflight/null origin, mirrored resources/upgrades + deterministic seed');assert.equal(stderr,'');
 }finally{for(const c of clients){clearInterval(c.heartbeat);c.close();}child.kill();await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);});}
 await require('./test-net-maps.cjs').run();
 await require('./test-net-multi.cjs').run();
 await require('./test-net-browser.cjs').run();
})().catch(e=>{console.error(e);process.exitCode=1;});
