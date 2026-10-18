/* Zero-dependency authoritative multiplayer: HTTP commands + SSE snapshots. Node 22+. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Core=require('./src/core.js'),Arena=require('./src/arena.js'),AI=require('./src/ai.js');
const ROOT=__dirname,GRACE=30000,rooms=new Map(),sessions=new Map();
const fail=(status,message)=>Object.assign(new Error(message),{status});
function options(o={}){if(!o||typeof o!=='object'||Array.isArray(o))throw fail(400,'配置格式无效');const n=(v,max)=>{if(!Number.isInteger(v)||v<0||v>max)throw fail(400,'配置数值无效');return v;};const upgrades={};for(const k of ['speed','time','shield','special'])upgrades[k]=n(o.upgrades?.[k]??0,4);const playerCount=n(o.playerCount??2,4),aiCount=n(o.aiCount??0,3),aiDifficulty=o.aiDifficulty??'normal';if(playerCount<2||aiCount>=playerCount||!['easy','normal','noob'].includes(aiDifficulty))throw fail(400,'人数或 AI 难度无效');return {level:n(o.level??1,2),difficulty:0,playerCount,aiCount,aiDifficulty,upgrades};}
function roomView(r){return {code:r.code,hostSide:r.hostSide,draw:!!r.draw,phase:r.phase,options:r.options,revision:r.revision,round:r.round,winner:r.winner,reason:r.reason,seed:r.seed||0,fairMode:true,players:r.players.map(p=>p?{side:p.side,ai:!!p.ai,forfeited:!!p.forfeited,connected:!!p.ai||!!p.stream,ready:p.ready,rematch:p.rematch,expires:p.deadline}:null)};}
function packet(r){return {room:roomView(r),state:r.state};}
function emit(p,data){if(!p?.stream||p.stream.destroyed||p.stream.writableEnded)return;if(p.stream.writableLength>1024*1024){p.stream.destroy();return;}p.stream.write('data: '+data+'\n\n');}
function broadcast(r){r.revision++;const data=JSON.stringify(packet(r));for(const p of r.players)emit(p,data);r.touched=Date.now();}
function seat(r,side){const p={token:crypto.randomBytes(24).toString('hex'),room:r,side,stream:null,deadline:Date.now()+GRACE,ready:false,rematch:false,selected:[],percent:50,seq:0,bucket:0,bucketAt:Date.now(),lastSeen:Date.now(),left:false};r.players[side-1]=p;sessions.set(p.token,p);return p;}
function detach(p,stream){if(p.stream!==stream)return;p.stream=null;p.deadline=Date.now()+GRACE;if(rooms.has(p.room.code))broadcast(p.room);}
function humans(r){return r.players.filter(p=>p&&!p.ai&&!p.forfeited);}
function online(r){return r.players.every(p=>p&&(p.ai||p.forfeited||p.stream));}
function arrange(r,o){
 const people=humans(r);if(people.some(p=>p.side>o.playerCount)||people.length+o.aiCount>o.playerCount)throw fail(409,'新配置会移除人类席位，请先离房');
 const players=Array(o.playerCount).fill(null);for(const p of people)players[p.side-1]=p;
 let bots=o.aiCount;for(let i=players.length-1;i>=0&&bots;i--)if(!players[i]){players[i]={ai:true,side:i+1,ready:true,rematch:true};bots--;}
 r.options=o;r.players=players;for(const p of people)p.ready=false;
}
function start(r){const o=r.options;r.seed=crypto.randomBytes(4).readUInt32BE()||1;const bots=r.players.filter(p=>p.ai).map(p=>({side:p.side,mode:o.aiDifficulty}));r.state=Arena.create(o.level,o.upgrades,r.seed,o.playerCount,bots);r.brains=bots.map(AI.create);r.pending=Array.from({length:o.playerCount},()=>[]);r.draw=false;r.frame=0;r.phase='playing';r.round++;r.winner=0;r.reason='';for(const p of r.players){p.forfeited=false;p.selected=[];p.percent=50;p.rematch=false;}broadcast(r);}
// Commands admitted during a frame are applied together at its boundary, not during HTTP arrival.
// Rotate all seat priorities every frame with a seed-chosen first side, never host priority.
function advance(r){const count=r.options.playerCount,first=(r.frame+++(r.seed%count))%count,order=Array.from({length:count},(_,i)=>(first+i)%count);const q=r.pending;r.pending=Array.from({length:count},()=>[]);while(q.some(a=>a.length))for(const i of order){const m=q[i].shift();if(!m)continue;const ids=m.ids.filter(id=>r.state.cells[id]?.own===i+1);Core.sendFleet(r.state,ids,m.target,i+1,m.percent);}Core.step(r.state,Core.FRAME);for(const i of order){const brain=r.brains.find(b=>b.side===i+1);if(brain)AI.think(r.state,brain,Core.FRAME);}}
function removeRoom(r){for(const p of r.players)if(p){sessions.delete(p.token);const stream=p.stream;p.stream=null;stream?.end();}rooms.delete(r.code);}
function command(p,m){const r=p.room,now=Date.now();if(now-p.bucketAt>=1000){p.bucket=0;p.bucketAt=now;}if(++p.bucket>60)throw fail(429,'操作过快');if(!Number.isSafeInteger(m.seq)||m.seq<=p.seq)throw fail(409,'指令序号过期');p.seq=m.seq;p.lastSeen=now;
 const both=()=>online(r),lobby=()=>{if(r.phase!=='lobby')throw fail(409,'不在准备阶段');};
 switch(m.action){
 case 'configure':lobby();if(p.side!==r.hostSide)throw fail(403,'仅房主可设置');arrange(r,options(m.options));break;
 case 'ready':lobby();if(typeof m.ready!=='boolean')throw fail(400,'准备状态无效');p.ready=m.ready;break;
 case 'start':lobby();if(p.side!==r.hostSide||!both()||!r.players.every(q=>q.ready))throw fail(409,'需要所有人类在线并准备，空位请加入玩家或配置 AI');start(r);return;
 case 'rematch':if(r.phase!=='finished'||!both())throw fail(409,'需要所有人类在线且本局结束');p.rematch=true;if(humans(r).every(q=>q.rematch)){r.phase='lobby';r.state=null;r.winner=0;r.reason='';r.draw=false;arrange(r,r.options);for(const q of humans(r)){q.ready=false;q.rematch=false;}}break;
 case 'leave':p.left=true;sessions.delete(p.token);p.stream?.end();p.stream=null;p.deadline=now;break;
 case 'select':case 'percent':case 'send':case 'special':{
 if(r.phase!=='playing'||!both())throw fail(409,'战局未开始或断线暂停');
 if(m.action==='percent'){if(![25,50,75,100].includes(m.percent))throw fail(400,'派兵比例无效');p.percent=m.percent;return;}
 const ids=m.ids??p.selected;if(!Array.isArray(ids)||ids.length>r.state.cells.length||ids.some(id=>!Number.isInteger(id)||!r.state.cells[id]||r.state.cells[id].own!==p.side))throw fail(400,'只能选择己方细胞');
 if(m.action==='select'){p.selected=[...new Set(ids)];return;}
 if(!Number.isInteger(m.target)||!r.state.cells[m.target])throw fail(400,'目标无效');
 const percent=m.percent??p.percent;if(![25,50,75,100].includes(percent))throw fail(400,'派兵比例无效');
 const sources=m.action==='special'?ids.filter(id=>r.state.cells[id].type!=='n'):ids;
 if(r.pending[p.side-1].length>=32)throw fail(429,'本帧指令过多');r.pending[p.side-1].push({ids:[...sources],target:m.target,percent});p.selected=[];break;}
 default:throw fail(400,'未知指令');
 }broadcast(r);
}
async function body(req){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)throw fail(413,'请求过大');chunks.push(chunk);}try{const m=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!m||typeof m!=='object'||Array.isArray(m))throw Error();return m;}catch{throw fail(400,'无效 JSON');}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function authenticate(token){const p=sessions.get(token);if(!p||(!p.stream&&Date.now()>=p.deadline))throw fail(401,'席位已过期，请重新建房/加入');return p;}
function createServer(config={}){
 const allowed=String(config.allowedOrigins??process.env.ALLOWED_ORIGINS??'*').split(',').map(s=>s.trim()).filter(Boolean);
 const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  const origin=req.headers.origin;
  res.setHeader('Vary','Origin');
  if(origin&&!allowed.includes('*')&&!allowed.includes(origin))throw fail(403,'此页面来源不在服务器 ALLOWED_ORIGINS 白名单');
  // No cookies/credentials: seat bearer tokens authorize commands; wildcard includes file:// null origins.
  res.setHeader('Access-Control-Allow-Origin',allowed.includes('*')?'*':(origin||allowed[0]||'null'));
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Max-Age','600');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 }
 if(url.pathname==='/api/health'&&req.method==='GET'){json(res,200,{service:'nanowar',fairMode:true});return;}
 if(url.pathname==='/api/events'&&req.method==='GET'){
 const p=authenticate(url.searchParams.get('token'));if(p.stream)throw fail(409,'此席位已有连接');
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','Referrer-Policy':'no-referrer'});res.flushHeaders();res.write('retry: 1000\n\n');p.stream=res;p.deadline=0;p.lastSeen=Date.now();req.on('close',()=>detach(p,res));res.on('error',()=>detach(p,res));broadcast(p.room);return;
 }
 if(url.pathname.startsWith('/api/')){
 if(req.method!=='POST')throw fail(405,'请使用 POST');const m=await body(req);
 if(url.pathname==='/api/create'){
 if(rooms.size>=100)throw fail(503,'房间已满');const o=options(m.options);let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
 const r={code,players:Array(o.playerCount).fill(null),hostSide:1,phase:'lobby',options:o,state:null,revision:0,round:0,winner:0,reason:'',touched:Date.now()};rooms.set(code,r);const p=seat(r,1);arrange(r,o);json(res,200,{token:p.token,side:1,seq:p.seq,room:roomView(r)});return;
 }
 if(url.pathname==='/api/join'){
 const r=rooms.get(String(m.code||'').trim().toUpperCase());if(!r)throw fail(404,'房间不存在');const index=r.players.findIndex(p=>!p);if(r.phase!=='lobby'||index<0)throw fail(409,'房间已满或已开局');const p=seat(r,index+1);for(const q of humans(r))q.ready=false;broadcast(r);json(res,200,{token:p.token,side:p.side,seq:p.seq,room:roomView(r)});return;
 }
 const p=authenticate(m.token);
 if(url.pathname==='/api/ping'){p.lastSeen=Date.now();json(res,200,{ok:true});return;}
 if(url.pathname==='/api/resume'){json(res,200,{token:p.token,side:p.side,seq:p.seq,room:roomView(p.room)});return;}
 if(url.pathname==='/api/command'){command(p,m);json(res,200,{ok:true,seq:p.seq});return;}throw fail(404,'接口不存在');
 }
 if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}
 if(!['GET','HEAD'].includes(req.method))throw fail(405,'方法不支持');
 const pathname=decodeURIComponent(url.pathname),relative=pathname==='/'?'index.html':pathname.slice(1);
 if(!(relative==='index.html'||/^src\/[a-z0-9-]+\.(js|css)$/.test(relative)))throw fail(404,'文件不存在');
 const file=path.join(ROOT,relative),data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(!res.headersSent)json(res,e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:'请求失败'});else res.end();}});
 const timer=setInterval(()=>{const now=Date.now();for(const r of rooms.values()){
 for(const p of [...humans(r)]){if(p.stream&&now-p.lastSeen>15000){const stream=p.stream;detach(p,stream);stream.destroy();}if(p.stream||now<p.deadline)continue;sessions.delete(p.token);p.forfeited=true;
 if(r.phase==='playing'){for(const c of r.state.cells)if(c.own===p.side){Core.switchSide(c,0,r.state);Core.setPower(c,0);}r.state.units=r.state.units.filter(u=>u.side!==p.side);r.state.minis=r.state.minis.filter(m=>m.side!==p.side);r.pending[p.side-1]=[];r.reason=p.left?'玩家已离房弃权':'玩家断线超过30秒，已弃权';const win=Core.winner(r.state);if(win){r.state.over=win;r.phase='finished';r.winner=win;r.draw=win>r.options.playerCount;}}
 if(r.phase==='lobby'){if(p.side===r.hostSide){r.phase='closed';r.reason='房主已离房或保留超时';}r.players[p.side-1]=null;for(const q of humans(r))q.ready=false;}
 if(p.side===r.hostSide&&humans(r).length)r.hostSide=humans(r)[0].side;broadcast(r);}
 if(!humans(r).length||(!r.players.some(p=>p?.stream)&&now-r.touched>GRACE)){removeRoom(r);continue;}
 if(r.phase==='playing'&&online(r)){advance(r);if(r.state.over){r.phase='finished';r.winner=r.state.over;r.draw=r.winner>r.options.playerCount;r.reason='全部细胞和在途兵力结算';}broadcast(r);}
 }},1000/Core.FPS);timer.unref();
 const heartbeat=setInterval(()=>{for(const p of sessions.values())if(p.stream&&!p.stream.destroyed&&!p.stream.writableEnded)p.stream.write('event: heartbeat\ndata: {}\n\n');},10000);heartbeat.unref();
 server.requestTimeout=10000;server.headersTimeout=10000;
 server.on('close',()=>{clearInterval(timer);clearInterval(heartbeat);for(const r of [...rooms.values()])removeRoom(r);});return server;}
if(require.main===module){const server=createServer();server.listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0',()=>console.log('Nano War: http://localhost:'+server.address().port));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const r of [...rooms.values()])removeRoom(r);server.close();});}
module.exports={createServer};
