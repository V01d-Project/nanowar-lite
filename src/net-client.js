/* Transport/room UI only. Multiplayer never calls Core.step or mutates simulation. */
(function(){'use strict';
const $=id=>document.getElementById(id),app=NanoApp,keys=['speed','time','shield','special'];
const panel=document.createElement('dialog');panel.id='net-panel';panel.innerHTML='<h2>1v1 联机对战</h2><p id="net-info">需从 node server.js 提供的网址进入；静态站仅支持单人。</p><p id="net-error" role="alert"></p><div id="net-entry"><button id="net-create">创建房间</button><label>房间码<input id="net-code" maxlength="6" autocomplete="off" placeholder="6位房间码"></label><button id="net-join">加入房间</button></div><div id="net-room" hidden><p id="net-players"></p><fieldset id="net-settings"><label>关卡<select id="net-level"></select></label><label>难度<select id="net-difficulty"><option value="0">普通</option><option value="1">进阶（红方×1.5）</option><option value="2">专家（红方×2）</option></select></label><p>双方使用相同升级；原版地图并非公平竞技图。</p><div id="net-upgrades"></div><button id="net-configure">保存设置（取消双方准备）</button></fieldset><p id="net-config-summary"></p><button id="net-ready">准备</button><button id="net-start">房主开局</button><button id="net-rematch">请求重赛</button><button id="net-leave">离房 / 返回单人</button></div><button id="net-close">关闭面板</button>';
document.body.append(panel);const button=document.createElement('button');button.id='net-open';button.textContent='联机';button.onclick=()=>panel.showModal();document.body.append(button);
$('net-level').innerHTML=Array.from({length:26},(_,n)=>'<option value="'+n+'">'+(n?'关卡 '+n:'机制沙盒（无AI）')+'</option>').join('');$('net-level').value='1';
$('net-upgrades').innerHTML=keys.map((k,i)=>'<label>'+['飞行速度','产兵时间','脂肪防护','特殊能耗'][i]+'<select id="net-up-'+k+'">'+[0,1,2,3,4].map(n=>'<option>'+n+'</option>').join('')+'</select></label>').join('');
let token='',source=null,seq=0,retry=null,queue=Promise.resolve(),generation=0,lastEvent=0,pinging=false;
const storage={get(){try{return sessionStorage.getItem('nanowar-seat');}catch{return null;}},set(v){try{if(v)sessionStorage.setItem('nanowar-seat',v);else sessionStorage.removeItem('nanowar-seat');}catch{}}};
function error(e){$('net-error').textContent=e.message||String(e);}
async function post(route,data){let response;try{response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(6000)});}catch{throw Error('无法连接联机服务器，请用 node server.js 提供的网址；单人模式不受影响');}let m;try{m=await response.json();}catch{throw Error('此网址不提供联机服务；请打开 Node 服务器网址');}if(!response.ok){const e=Error(m.error||'联机请求失败');e.status=response.status;throw e;}return m;}
function cmd(action,data={}){const current=token,g=generation;queue=queue.catch(()=>{}).then(()=>{if(!current||current!==token||g!==generation)throw Error('已离房');return post('command',Object.assign({},data,{token:current,seq:++seq,action}));});return queue;}
function safe(p){p.catch(error);}
const client={side:1,room:null,connected:false,expired:false,
 canPlay(){return this.connected&&this.room?.phase==='playing'&&this.room.players.every(p=>p?.connected);},
 status(){if(this.expired)return '席位已过期，请离房重新加入';if(!this.connected)return '连接中断，自动重连中（保留30秒）';const r=this.room;if(!r)return '连接中';if(r.phase==='closed')return r.reason+' · 请离房重新建房';const other=r.players[2-this.side];if(!other)return '等待对手加入 · 房间 '+r.code;if(!other.connected)return '对手掉线 · 战局暂停，保留30秒';return r.phase==='lobby'?'双方准备后由房主开局':r.phase==='finished'?'本局结束 · 可请求重赛':'联机对战 · 服务器25fps';},
 sendFleet(ids,target,percent){if(!this.canPlay())return 0;const list=[...ids];safe(cmd('send',{ids:list,target,percent}));return 1;},
 rematch(){safe(cmd('rematch'));},
};window.NanoNet=client;
function settings(){return {level:Number($('net-level').value),difficulty:Number($('net-difficulty').value),upgrades:Object.fromEntries(keys.map(k=>[k,Number($('net-up-'+k).value)]))};}
function draw(){const r=client.room,active=!!token;$('net-entry').hidden=active;$('net-room').hidden=!active;button.textContent=active?'房间 '+(r?.code||'…'):'联机';if(!r)return;
 $('net-info').textContent='房间 '+r.code+' · 你是玩家'+client.side+'（'+(client.side===1?'蓝色':'红色')+'）';
 $('net-players').textContent=r.players.map((p,i)=>'玩家'+(i+1)+': '+(!p?'空位':!p.connected?'掉线，保留30秒':p.ready?'已准备':'未准备')).join(' / ');
 const o=r.options;$('net-config-summary').textContent='开局配置：'+(o.level?'关卡 '+o.level:'机制沙盒')+' · '+['普通','进阶（红方×1.5）','专家（红方×2）'][o.difficulty]+' · 升级（速/产/脂/特）'+keys.map(k=>o.upgrades[k]).join('/')+' · 无AI，原敌方阵营合并到红方';
 $('net-settings').disabled=client.side!==1||r.phase!=='lobby';$('net-settings').hidden=client.side!==1;
 $('net-ready').hidden=r.phase!=='lobby';$('net-ready').textContent=r.players[client.side-1]?.ready?'取消准备':'准备';$('net-ready').disabled=!client.connected;
 $('net-start').hidden=client.side!==1||r.phase!=='lobby';$('net-start').disabled=!r.players.every(p=>p?.connected&&p.ready);
 $('net-rematch').hidden=r.phase!=='finished';$('net-rematch').disabled=!!r.players[client.side-1]?.rematch;
}
function connect(){if(!token)return;source?.close();const current=token,g=generation;source=new EventSource('/api/events?token='+encodeURIComponent(token));const es=source;lastEvent=Date.now();es.addEventListener('heartbeat',()=>{lastEvent=Date.now();});
 source.onmessage=e=>{if(g!==generation)return;lastEvent=Date.now();const m=JSON.parse(e.data),old=client.room;client.connected=true;client.expired=false;client.room=m.room;draw();app.networkSnapshot(m);
 if(old?.phase!==m.room.phase){app.ui.reset();if(m.room.phase==='playing'){panel.close();app.ui.percent=50;$('percent').textContent='派兵 50%';}else if(['lobby','closed'].includes(m.room.phase)&&!panel.open)panel.showModal();}
 };
 source.onerror=()=>{es.close();if(g!==generation||source!==es)return;client.connected=false;app.ui.reset();draw();clearTimeout(retry);retry=setTimeout(async()=>{if(current!==token||g!==generation)return;try{const m=await post('resume',{token:current});seq=Math.max(seq,m.seq);connect();}catch(e){if(e.status===401){client.expired=true;error(e);draw();}else connect();}},1000);};
}
async function attach(m){generation++;token=m.token;seq=m.seq;queue=Promise.resolve();storage.set(token);client.side=m.side;client.room=m.room;client.connected=false;client.expired=false;$('net-error').textContent='';
 const o=m.room.options;$('net-level').value=o.level;$('net-difficulty').value=o.difficulty;for(const k of keys)$('net-up-'+k).value=o.upgrades[k];app.enterNetwork(client);draw();connect();}
async function leave(){const old=token;source?.close();clearTimeout(retry);if(old){try{await cmd('leave');}catch(e){error(e);}}generation++;token='';client.room=null;client.connected=false;storage.set('');app.leaveNetwork();draw();$('net-info').textContent='已返回单人；可重新建房或加入。';}
$('net-create').onclick=()=>{safe(post('create',{options:settings()}).then(attach));};$('net-join').onclick=()=>{safe(post('join',{code:$('net-code').value}).then(attach));};$('net-configure').onclick=()=>safe(cmd('configure',{options:settings()}));$('net-ready').onclick=()=>safe(cmd('ready',{ready:!client.room.players[client.side-1]?.ready}));$('net-start').onclick=()=>safe(cmd('start'));$('net-rematch').onclick=()=>client.rematch();$('net-leave').onclick=leave;$('net-close').onclick=()=>panel.close();
setInterval(()=>{if(!token||client.expired)return;if(client.connected&&Date.now()-lastEvent>15000)source?.onerror();if(pinging)return;pinging=true;post('ping',{token}).catch(()=>{}).finally(()=>{pinging=false;});},5000);
const saved=storage.get();if(saved)safe(post('resume',{token:saved}).then(attach).catch(e=>{storage.set('');throw e;}));
})();
