/* Real HTTP/SSE clients against a child node server.js; no dependencies or test-only simulation speed. */
'use strict';
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),path=require('node:path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=6000){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await sleep(20);}throw Error('Timed out: '+fn.toString());}
(async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe']});let output='',stderr='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>stderr+=d);let clients=[];
 try{
 await until(()=>output.match(/localhost:(\d+)/));const base='http://127.0.0.1:'+output.match(/localhost:(\d+)/)[1];
 async function post(route,data,status=200){const res=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),m=await res.json();assert.equal(res.status,status,JSON.stringify(m));return m;}
 function client(m){const c={...m,latest:null,history:new Map(),controller:null,async open(){this.controller=new AbortController();const res=await fetch(base+'/api/events?token='+this.token,{signal:this.controller.signal});assert.equal(res.status,200);this.pump=(async()=>{let rest='';try{for await(const chunk of res.body){rest+=new TextDecoder().decode(chunk);let n;while((n=rest.indexOf('\n\n'))>=0){const event=rest.slice(0,n);rest=rest.slice(n+2);if(event.startsWith('event: heartbeat'))continue;for(const line of event.split('\n'))if(line.startsWith('data: ')){const m=JSON.parse(line.slice(6));this.latest=m;this.history.set(m.room.revision,m);if(this.history.size>100)this.history.delete(this.history.keys().next().value);}}}}catch(e){if(e.name!=='AbortError')throw e;}})();await until(()=>this.latest);},close(){this.controller?.abort();},cmd(action,data={},status=200){return post('command',{...data,token:this.token,seq:++this.seq,action},status);}};c.heartbeat=setInterval(()=>{post('ping',{token:c.token}).catch(()=>{});},5000);clients.push(c);return c;}
 assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/src/net-client.js')).status,200);assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/.git/config')).status,404);
 const origin=await fetch(base+'/api/create',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(origin.status,403);
 await post('create',{options:{level:26}},400);await post('join',{code:'XXXXXX'},404);
 const a=client(await post('create',{options:{level:1,difficulty:0,upgrades:{speed:0,time:0,shield:0,special:0}}}));assert.match(a.room.code,/^[A-F0-9]{6}$/);await a.open();
 const b=client(await post('join',{code:a.room.code.toLowerCase()}));await b.open();await until(()=>a.latest.room.players[1]?.connected);assert.equal(a.side,1);assert.equal(b.side,2);
 await post('join',{code:a.room.code},409);await b.cmd('configure',{options:{level:2}},403);await a.cmd('start',{},409);
 await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('configure',{options:{level:1,difficulty:0}});await until(()=>a.latest.room.players.every(p=>!p.ready));
 await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('start');await until(()=>a.latest.state&&b.latest.state);assert.equal(a.latest.state.ai.length,0);
 const source=a.latest.state.cells.find(c=>c.own===1).id,target=a.latest.state.cells.find(c=>c.own===2).id;
 await b.cmd('send',{ids:[source],target,percent:100},400);await a.cmd('send',{ids:[source],target:-1},400);await a.cmd('percent',{percent:Infinity},400);await a.cmd('select',{ids:[source]});await a.cmd('percent',{percent:100});
 const oldSeq=a.seq;await post('command',{token:a.token,seq:oldSeq,action:'send',ids:[source],target},409);
 // Drop SSE, observe pause, restore identity + exact snapshot using the original seat token.
 b.close();await until(()=>a.latest.room.players[1].connected===false);const paused=a.latest.state.time;await sleep(200);assert.equal(a.latest.state.time,paused);await a.cmd('send',{ids:[source],target,percent:100},409);
 const restored=await post('resume',{token:b.token});assert.equal(restored.side,2);assert.equal(restored.room.code,a.room.code);b.seq=restored.seq;b.latest=null;await b.open();await until(()=>a.latest.room.players[1].connected);
 await a.cmd('send',{target});await until(()=>a.latest.state.units.length>0);await until(()=>b.latest.state.units.length>0);
 // Opponent returns a small legal fleet as well; both clients issue commands, server resolves all combat.
 await b.cmd('send',{ids:[target],target:source,percent:25});
 await until(()=>a.latest.room.phase==='finished'&&b.latest.room.phase==='finished',30000);
 assert.equal(a.latest.room.winner,1);assert.equal(a.latest.state.over,1);assert.deepEqual(a.latest,b.latest,'final authoritative states must match byte-for-byte structurally');
 let comparisons=0;for(const [revision,snapshot]of a.history)if(b.history.has(revision)){assert.deepEqual(snapshot,b.history.get(revision));comparisons++;}assert.ok(comparisons>20,'compare many in-flight snapshots, not only final state');
 await a.cmd('rematch');assert.equal(a.latest.room.phase,'finished');await b.cmd('rematch');await until(()=>a.latest.room.phase==='lobby');await a.cmd('ready',{ready:true});await b.cmd('ready',{ready:true});await a.cmd('start');await until(()=>a.latest.room.round===2&&a.latest.room.phase==='playing');assert.equal(a.latest.state.over,0);
 // Actual 30-second grace timeout and rejected expired token (no shortened test clock).
 b.close();await until(()=>!a.latest.room.players[1].connected);await until(()=>a.latest.room.phase==='finished',33000);assert.equal(a.latest.room.winner,1);assert.match(a.latest.room.reason,/30秒/);await post('resume',{token:b.token},401);
 console.log('PASS network: create/join, host config + ready, role/command validation, real 25fps combat, '+comparisons+' identical snapshots, reconnect + pause, rematch, actual 30s expiry, static isolation, same-origin');assert.equal(stderr,'');
 }finally{for(const c of clients){clearInterval(c.heartbeat);c.close();}child.kill();await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
