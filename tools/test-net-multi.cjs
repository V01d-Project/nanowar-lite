/* Real 25fps HTTP/SSE multiplayer acceptance, no simulation hooks. */
'use strict';
const assert=require('node:assert/strict'),{createServer}=require('../server.js'),Core=require('../src/core.js'),Arena=require('../src/arena.js'),AI=require('../src/ai.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=8000){const end=Date.now()+timeout;while(Date.now()<end){const v=fn();if(v)return v;await sleep(25);}throw Error('Multiplayer timeout: '+fn);}
function fair(s,count){
 const first=s.cells.filter(c=>c.own===1),energy=first.reduce((n,c)=>n+c.u,0);
 for(let side=1;side<=count;side++){
  const cells=s.cells.filter(c=>c.own===side);assert.equal(cells.length,first.length);assert.equal(cells.reduce((n,c)=>n+c.u,0),energy);assert.deepEqual(s.upgrades[side],s.upgrades[1]);
  for(const c of first){const a=Math.PI*2*(side-1)/count,dx=c.x-320,dy=c.y-240;
   const pair=cells.find(t=>Math.abs(t.x-(320+dx*Math.cos(a)-dy*Math.sin(a)))<1e-7&&Math.abs(t.y-(240+dx*Math.sin(a)+dy*Math.cos(a)))<1e-7);assert.ok(pair,'rotated sector');
   for(const k of ['size','type','u','ready','delay','powerMax','upgrades'])assert.deepEqual(pair[k],c[k]);
  }
 }
 const neutral=s.cells.filter(c=>c.own===0);for(const c of neutral){const a=Math.PI*2/count,dx=c.x-320,dy=c.y-240;assert.ok(neutral.some(t=>Math.abs(t.x-(320+dx*Math.cos(a)-dy*Math.sin(a)))<1e-7&&Math.abs(t.y-(240+dx*Math.sin(a)+dy*Math.cos(a)))<1e-7),'neutrals rotate too');}
 assert.equal(s.time,0);assert.equal(s.difficulty,0);
}
async function run(){
 for(const count of [3,4])for(let level=0;level<3;level++)for(let upgrade=0;upgrade<=4;upgrade++)fair(Arena.create(level,{speed:upgrade,time:upgrade,shield:upgrade,special:upgrade},123,count),count);
 for(const count of [3,4])for(let side=1;side<=count;side++){const s=Arena.create(1,{},123,count);s.cells=s.cells.filter(c=>c.own===side);assert.equal(Core.winner(s),side,'side 3/4 is a winner, not draw');s.cells=[];assert.equal(Core.winner(s),5);}
 const server=createServer(),clients=[];await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 async function post(route,data,status=200){const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),m=await r.json();assert.equal(r.status,status,JSON.stringify(m));return m;}
 function client(m){const c={...m,latest:null,initial:null,botOrders:new Map(),async open(){this.ctrl=new AbortController();const res=await fetch(base+'/api/events?token='+this.token,{signal:this.ctrl.signal});assert.equal(res.status,200);this.reader=(async()=>{let rest='';try{for await(const chunk of res.body){rest+=new TextDecoder().decode(chunk);let n;while((n=rest.indexOf(String.fromCharCode(10,10)))>=0){const event=rest.slice(0,n);rest=rest.slice(n+2);if(event.startsWith('event: heartbeat'))continue;const line=event.split(String.fromCharCode(10)).find(l=>l.startsWith('data: '));if(!line)continue;this.latest=JSON.parse(line.slice(6));if(this.latest.state?.time===0)this.initial=this.latest.state;for(const u of this.latest.state?.units||[])if(u.side>=3&&!this.botOrders.has(u.side))this.botOrders.set(u.side,u);}}}catch(e){if(e.name!=='AbortError')throw e;}})();await until(()=>this.latest);},close(){this.ctrl?.abort();},cmd(action,data={},status=200){return post('command',{...data,action,token:this.token,seq:++this.seq},status);}};c.heartbeat=setInterval(()=>post('ping',{token:c.token}).catch(()=>{}),5000);clients.push(c);return c;}
 async function room(count,bots,mode){const a=client(await post('create',{options:{level:1,playerCount:count,aiCount:bots,aiDifficulty:mode}}));await a.open();const humans=[a];for(let i=1;i<count-bots;i++){const b=client(await post('join',{code:a.room.code}));assert.equal(b.side,i+1);await b.open();humans.push(b);}return humans;}
 async function start(h){for(const c of h)await c.cmd('ready',{ready:true});await h[0].cmd('start');await until(()=>h.every(c=>c.initial));fair(h[0].initial,h[0].initial.playerCount);for(const c of h)assert.deepEqual(c.initial,h[0].initial);}
 try{
  for(const options of [{playerCount:1},{playerCount:5},{playerCount:2,aiCount:2},{playerCount:4,aiCount:4},{playerCount:4,aiCount:2,aiDifficulty:'expert'}])await post('create',{options},400);
  for(const count of [2,3,4]){const h=await room(count,count-1,'easy');await start(h);assert.equal(h[0].initial.ai.length,count-1);await h[0].cmd('leave');clearInterval(h[0].heartbeat);h[0].close();}
  // Real 3 and 4 human seats, ready gating, side3/4 command ownership, reconnect and leave.
  for(const count of [3,4]){
   const h=await room(count,0,'normal');await h[0].cmd('configure',{options:{playerCount:2}},409);await h[0].cmd('start',{},409);await start(h);
   const last=h.at(-1);await last.cmd('send',{ids:[count-1],target:0,percent:25});await last.cmd('send',{ids:[0],target:count-1},400);
   last.close();await until(()=>h[0].latest.room.players[count-1].connected===false);const paused=h[0].latest.state.time;await sleep(200);assert.equal(h[0].latest.state.time,paused);
   const restored=await post('resume',{token:last.token});assert.equal(restored.side,count);last.seq=restored.seq;last.latest=null;await last.open();await until(()=>h[0].latest.room.players[count-1].connected);
   for(const c of h)await c.cmd('leave');for(const c of h){clearInterval(c.heartbeat);c.close();}
  }
  // AI may fill a middle vacancy, preserving side3/4 human identities.
  {
   const h=await room(4,0,'normal');await h[1].cmd('leave');h[1].close();clearInterval(h[1].heartbeat);await until(()=>h[0].latest.room.players[1]===null);
   await h[0].cmd('configure',{options:{playerCount:4,aiCount:1,aiDifficulty:'noob'}});await until(()=>h[0].latest.room.players[1]?.ai);assert.equal(h[0].latest.room.players[3].ai,false);
   const remaining=[h[0],h[2],h[3]];await start(remaining);assert.deepEqual(h[0].initial.ai,[{side:2,mode:'noob'}]);
   await h[0].cmd('leave');h[0].close();clearInterval(h[0].heartbeat);await until(()=>h[2].latest.room.hostSide===3);assert.equal(h[2].latest.room.phase,'playing');
   for(const c of remaining.slice(1)){await c.cmd('leave');c.close();clearInterval(c.heartbeat);}
  }
  // Each selected mode produces exactly the corresponding existing AI replay orders.
  for(const mode of ['easy','noob','normal']){
   console.log('multi: validating '+mode+' server AI');
   const h=await room(4,2,mode),[a,b]=h;await start(h);assert.deepEqual(a.initial.ai,[{side:3,mode},{side:4,mode}]);
   await until(()=>a.botOrders.size===2,18000);
   const replay=JSON.parse(JSON.stringify(a.initial)),brains=replay.ai.map(AI.create),expected=new Map();
   for(let frame=0;frame<500&&expected.size<2;frame++){const first=(frame+(replay.initialSeed%4))%4;Core.step(replay,Core.FRAME);for(let i=0;i<4;i++){const brain=brains.find(b=>b.side===(first+i)%4+1);if(brain)AI.think(replay,brain,Core.FRAME);}for(const u of replay.units)if(u.side>=3&&!expected.has(u.side))expected.set(u.side,u);}
   for(const [side,u]of a.botOrders){const e=expected.get(side);assert.ok(e,mode+' replay emits orders');for(const key of ['wanted','source','target','kind'])assert.equal(u[key],e[key],mode+' real server matches existing AI mode: '+key);}
   if(mode==='normal'){
    // Two legal human strategies: side2 reinforces side1, side1 concentrates on weakest foes.
    const end=Date.now()+150000;let next=0;
    while(a.latest.room.phase==='playing'&&Date.now()<end){
     const s=a.latest.state;
     if(s.time>=next){next=s.time+2;for(const c of h){const own=s.cells.filter(x=>x.own===c.side&&x.type==='n'&&x.u>=12);const targets=s.cells.filter(x=>x.own&&x.own!==c.side&&(c.side!==2||x.own===1));const target=targets.sort((x,y)=>x.u-y.u)[0];if(own.length&&target)await c.cmd('send',{ids:own.map(x=>x.id),target:target.id,percent:100});}}
     await sleep(80);
    }
    await until(()=>a.latest.room.phase==='finished'&&b.latest.room.phase==='finished',5000);assert.ok([1,2,3,4].includes(a.latest.room.winner));assert.deepEqual(a.latest,b.latest);assert.ok(a.botOrders.size===2);
    console.log('multi: 2 humans + 2 AI finished at '+a.latest.state.time.toFixed(1)+'s, winner '+a.latest.room.winner);
    await a.cmd('rematch');await b.cmd('rematch');await until(()=>a.latest.room.phase==='lobby');assert.equal(a.latest.room.players.filter(p=>p.ai).length,2);a.initial=b.initial=null;await start(h);assert.equal(a.latest.room.round,2);
    // Real thirty-second grace with two AI; surviving game resumes after expiry, not 3-side arithmetic.
    b.close();await until(()=>!a.latest.room.players[1].connected);const t=a.latest.state.time;await sleep(200);assert.equal(a.latest.state.time,t);await until(()=>a.latest.room.players[1].forfeited,33000);await post('resume',{token:b.token},401);assert.ok(a.latest.state.time>=t);assert.ok(a.latest.room.phase==='playing'||a.latest.room.phase==='finished');
   }
   for(const c of h){if(c.latest?.room.players[c.side-1]&&!c.latest.room.players[c.side-1].forfeited)await c.cmd('leave',{},c===b&&mode==='normal'?401:200);clearInterval(c.heartbeat);c.close();}
  }
  console.log('PASS multi: 3/4 real humans, all seats commands/reconnect, 4 seats (2 humans+2 server AI) combat to finish/rematch/real30s expiry, easy/normal/noob exact existing-mode replay dispatch, all map/upgrade rotational fairness, side3/4 winners');
 }finally{for(const c of clients){clearInterval(c.heartbeat);c.close();}server.closeAllConnections();await new Promise(r=>server.close(r));}
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
