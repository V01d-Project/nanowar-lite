/* Node 22+ and an installed Chrome. No npm / WebDriver dependency. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),shots=path.join(__dirname,'shots');
const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<160;i++){const v=await fn();if(v)return v;await sleep(50);}throw Error('Timed out waiting for Chrome');}
(async()=>{
 fs.mkdirSync(shots,{recursive:true});
 const badRequests=[];
 const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(file.endsWith('favicon.ico')){res.writeHead(204).end();return;}
  fs.readFile(file,(err,data)=>{if(err){badRequests.push(req.url);res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/';
 try{
 for(const [width,height] of [[430,932],[1280,800]]){
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'nanowar-chrome-'));
  const args=['--headless=new','--disable-gpu','--hide-scrollbars','--window-size='+width+','+height,'--remote-debugging-port=0','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'about:blank'];
  console.log('Chrome '+args.slice(0,4).join(' '));
  const child=spawn(chrome,args,{stdio:['ignore','ignore','pipe'],windowsHide:true});
  let ws;
  try{
   const portFile=path.join(profile,'DevToolsActivePort');await until(()=>fs.existsSync(portFile));
   const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
   const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
   ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
   await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
   let id=0;const pending=new Map(),exceptions=[];
   ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);});
   function call(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
   async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
   await call('Runtime.enable');await call('Page.enable');
   await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await call('Page.navigate',{url});
   await until(()=>evaluate('document.documentElement?.dataset.ready === "true"'));
   await evaluate('NanoApp.paused=true; NanoApp.reset(); NanoApp.render();');
   async function shot(suffix){const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file=path.join(shots,width+'x'+height+'-'+suffix+'.png');fs.writeFileSync(file,Buffer.from(result.data,'base64'));console.log('screenshot '+path.relative(root,file));}
   await shot('initial');
   const layout=await evaluate(
    '(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,pills:[...document.querySelectorAll(".pill")].map(rect),hud:rect(document.querySelector(".hud")),hint:rect(document.querySelector(".hint")),cells:NanoApp.state.cells.map(c=>({id:c.id,...NanoApp.renderer.point(c),r:NanoApp.renderer.radius(c),special:c.type!=="n"}))};})()');
   assert.deepEqual(layout.viewport,[width,height]);assert.equal(layout.overflow,false);
   for(let i=1;i<layout.pills.length;i++)assert.ok(layout.pills[i-1].x+layout.pills[i-1].w<layout.pills[i].x,'HUD pills overlap');
   for(const c of layout.cells){const extra=c.special?13:2;assert.ok(c.x-c.r-extra>0&&c.x+c.r+extra<width,'cell clipped horizontally');assert.ok(c.y-c.r-extra>layout.hud.y+layout.hud.h,'cell overlaps HUD');assert.ok(c.y+c.r+(c.special?48:2)<layout.hint.y,'cell overlaps instructions');}
   for(let i=0;i<layout.cells.length;i++)for(let j=i+1;j<layout.cells.length;j++){const a=layout.cells[i],b=layout.cells[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>a.r+b.r+(a.special?13:0)+(b.special?13:0),'cell rings overlap');}
   async function click(p){await call('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',clickCount:1});}
   const source=layout.cells[0],battery=layout.cells[8];
   await evaluate('NanoApp.state.cells[8].own=1;NanoApp.state.cells[8].u=50;');
   await click(source);await click(battery);
   assert.equal(await evaluate('NanoApp.state.units.filter(u=>u.target===8).length'),20,'click friendly special sends soldiers');
   assert.equal(await evaluate('NanoApp.ui.selected.size'),0);
   await evaluate('NanoApp.reset();NanoApp.state.cells[0].fat=2;');
   await click(source);await click(layout.cells[4]);
   assert.equal(await evaluate('NanoApp.state.units.length'),0,'input cannot bypass fat blockade');
   // Touch lasso must count max displacement, even when the gesture closes at its start.
   await evaluate('NanoApp.reset();');
   const x=source.x,y=source.y,r=source.r+10;
   const touch=async(type,p)=>call('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p[0],y:p[1]}]:[]});
   await touch('touchStart',[x-r,y-r]);
   for(const p of [[x+r,y-r],[x+r,y+r],[x-r,y+r],[x-r,y-r]])await touch('touchMove',p);
   await touch('touchEnd');
   assert.equal(await evaluate('NanoApp.ui.selected.has(0)'),true,'closed touch lasso selects source');
   assert.equal(await evaluate('(()=>{const e=new MouseEvent("contextmenu",{bubbles:true,cancelable:true});document.getElementById("c").dispatchEvent(e);return e.defaultPrevented;})()'),true);
   assert.equal(await evaluate('getComputedStyle(document.getElementById("c")).touchAction'),'none');
   await evaluate('NanoApp.reset();NanoApp.state.cells[7].own=2;NanoApp.state.cells[7].u=100;NanoApp.state.cells[7].timer=4;NanoApp.state.cells[8].own=1;NanoApp.state.cells[8].u=70;NanoApp.render();');
   await shot('rings');
   assert.deepEqual(exceptions,[],'browser runtime errors');
   console.log('PASS '+width+'x'+height+': layout, friendly charge, fat block, closed touch lasso, context menu, ring screenshots; no JS errors');
  }finally{if(ws)ws.close();child.kill();}
 }
 assert.deepEqual(badRequests,[],'missing resources');
 console.log('PASS browser verification (2 viewports, 4 screenshots)');
 }finally{server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
