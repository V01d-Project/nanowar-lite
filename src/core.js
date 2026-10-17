/* Clean-room behavior port. Pure simulation: no DOM, wall clock, or Math.random. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NanoCore=factory();})(globalThis,function(){
'use strict';
// Game.as:42-51. Upgrade levels are indices, not multipliers.
const UPGRADES={speed:[0,.04,.12,.18,.25],time:[0,.02,.06,.09,.12],shield:[.4,.45,.5,.55,.6],special:[1,.95,.9,.85,.8],speedUpg:[0,3,4,6,7],timeUpg:[0,3,4,6,7],shieldUpg:[0,4,5,7,8],specialUpg:[0,4,5,7,8]};
// Main.as and SWF header: original 25fps. Movement remains px/frame, never a 30fps override.
const MAX=100,FPS=25,LOAD_FRAMES={f:240,a:360},LOAD={f:240/FPS,a:360/FPS},FRAME=1/FPS,EPS=1e-9;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function upgrade(c,key){return UPGRADES[key][clamp(c.upgrades[key]||0,0,4)];}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function createState(map,options={}){
 map=map||[{x:247,y:131,own:1,u:30},{x:421,y:131,size:64,own:2,u:1}];
 const s={cells:[],units:[],minis:[],time:0,accumulator:0,over:0,seed:options.seed||1,nextUnit:1,difficulty:options.difficulty||0,level:options.level||0,upgrades:options.upgrades||{},ai:options.ai||[]};
 s.cells=map.map((data,id)=>{
 const c=Object.assign({id,x:0,y:0,size:100,own:0,u:0,type:'n',fat:-1,antibody:false,timer:0,growth:0,hits:0,ready:false,loading:false},data,{id});
 c.upgrades=Object.assign({speed:0,time:0,shield:0,special:0},s.upgrades[c.own]);c.powerMax=c.type==='n'?100:100*upgrade(c,'special');
 // Cell.as:461-464; WhiteBloodCell.as:43-53. Size is fixed map size, NOT current energy.
 c.ray=c.type==='n'?Math.floor(44*c.size/100*.83):24;
 c.interval=Math.trunc(1000+2200*(100-c.size)/100)/1000;c.delay=c.interval;
 if(s.difficulty&&c.own>1&&c.type==='n')c.u=Math.trunc(c.u*(s.difficulty===1?1.5:2));
 setPower(c,c.u);return c;});return s;
}
function sync(c){c.ray2=c.type==='n'?Math.trunc(c.ray*clamp(.5+c.u/200,.5,1.1)*.95):15;if(c.type!=='n'){if(c.u<c.powerMax){c.timer=0;c.loading=false;c.ready=false;}else if(!c.ready&&!c.loading){c.loading=true;c.timer=0;}}}
function setPower(c,p){c.u=Number.isFinite(p)?Math.max(0,Math.trunc(p)):0;sync(c);}
function switchSide(c,side,s){if(c.own!==side){if(c.type==='n'&&c.own===0)c.u+=Math.trunc(25*c.size/100);if(c.type!=='n'){c.ready=false;c.loading=false;c.timer=0;}if(side!==c.fat)c.fat=-1;c.own=side;c.upgrades=Object.assign({speed:0,time:0,shield:0,special:0},s&&s.upgrades[side]);c.powerMax=c.type==='n'?100:100*upgrade(c,'special');}sync(c);}
function selectable(c,side){return !!c&&c.own===side&&(c.type==='n'||c.ready);}
function canSend(c,side){return selectable(c,side)&&(c.type!=='n'||((c.fat===-1||c.fat===side)&&c.u>=2));}
// Cell.as:373-410. Zero becomes neutral first; next hostile mini captures with one energy.
function shieldMini(c,side){c.hits++;if(c.hits<upgrade(c,'shield')*10&&side!==c.fat&&c.fat!==-1)return true;c.hits=0;return false;}
function arriveWhite(c,side,s,checkShield=true){if(checkShield&&shieldMini(c,side))return false;let p=c.u+(side===c.own||c.antibody?1:-1),owner=c.own;if(p===0)owner=0;else if(p<0){p=Math.abs(p);owner=side;}switchSide(c,owner,s);setPower(c,p);return true;}
// Cell.as:413-440: friendly fat does NOT remove a friendly antibody.
function arriveFat(c,side){if(c.type==='f')return false;if(c.antibody&&c.fat===-1&&side!==c.own)c.antibody=false;else if(c.fat===-1)c.fat=side;else if(c.fat!==side)c.fat=-1;return true;}
function arriveAb(c,side,s){if(c.fat!==-1&&c.fat!==side)return false;c.antibody=true;if(c.own!==side)switchSide(c,side,s);sync(c);return true;}
// WhiteBloodUnit.as:33-40,78-96: radius/scale, velocity2.3+2.7*p/100 and upgrades.
function unitPower(u,p){u.power=p;if(u.kind==='w'){u.scale=clamp(.25+.75*p/100,.25,1);u.ray=Math.trunc(11.5*u.scale);u.vmax=2.3+2.7*p/100;}}
// FatUnit.as:13-19; AntibodyUnit.as:13-18; SpecialUnit.as:13: ray18.
function launch(s,c,target,kind,power=0){const u={id:s.nextUnit++,kind,side:c.own,source:c.id,target:target.id,x:c.x,y:c.y,power:0,wanted:power,moving:kind!=='w',v:0,acc:true,angle:Math.atan2(target.y-c.y,target.x-c.x),bx:0,by:0,age:0,ray:18,vmax:kind==='f'?3:3.3,vmin:kind==='w'?.6:.8,acceleration:.5,slow:kind==='a'?.96:.94};
 if(kind==='w'){unitPower(u,0);u.x+=Math.cos(u.angle)*(c.ray2*.8-u.ray);u.y+=Math.sin(u.angle)*(c.ray2*.8-u.ray);}s.units.push(u);return u;}
function sendFleet(s,ids,targetId,side,percent=50){const target=s.cells[targetId];if(!target||s.over||!Number.isInteger(side)||side<1||side>4||!Number.isFinite(percent))return 0;let count=0;for(const id of new Set(ids)){const c=s.cells[id];if(!canSend(c,side)||c===target)continue;if(c.type!=='n'){if(c.type==='f'&&target.type!=='n')continue;launch(s,c,target,c.type);c.ready=false;setPower(c,c.u-c.powerMax);count++;}else{let n=Math.trunc(c.u*clamp(percent,0,100)/100);count+=n;while(n>0){launch(s,c,target,'w',Math.min(100,n));n-=100;}}}return count;}
function growthInterval(c){return c.interval;} // WhiteBloodCell.as:57: fixed SIZE interpolation.
function produce(c){if(c.own===0&&c.fat===-1)return;if(c.fat===-1||c.fat===c.own){if(c.u>100)c.u--;else if(c.u<100&&c.own!==0)c.u++;}else c.u--;c.u=clamp(Math.trunc(c.u),0,1000);sync(c);c.delay=Math.trunc(c.interval*1000/(c.antibody?1.5:1))/1000*(1-upgrade(c,'time'));}
// Unit.as:18-20,326-333: bounce3.5, attenuation0.85; collision coefficient1.5.
function bounce(u,o){const a=Math.atan2(o.y-u.y,o.x-u.x),v=3.5+u.v+(o.v||0);u.bx=-Math.cos(a)*v;u.by=-Math.sin(a)*v;}
function separate(u,o){const a=Math.atan2(o.y-u.y,o.x-u.x);u.x-=Math.cos(a)/1.5;u.y-=Math.sin(a)/1.5;}
// WhiteBloodUnitMini.as:34-44,83-140,159-186: speed10, slowdown.83, bounce life20.
// WhiteBloodUnitMini.as:83-140,171-186: burst, decelerate, home; hostile fat filters minis.
function burst(s,u){for(let i=0;i<u.power;i++){const t=s.cells[u.target];let vx=-10/3+random(s)*20/3,vy=-10/3+random(s)*20/3;const a=Math.atan2(t.y-u.y,t.x-u.x)+(random(s)*Math.PI-Math.PI/2);vx-=Math.cos(a)*(10/6+random(s)*10/6);vy-=Math.sin(a)*(10/6+random(s)*10/6);s.minis.push({x:u.x,y:u.y,side:u.side,target:u.target,v:0,vx,vy,mode:'burst',hit:false,life:20});}}
// Unit.as:22,173-199,224-288,379-449: expiry60s and pulse movement, two acceleration additions.
function tickUnit(s,u){const c=s.cells[u.source],t=s.cells[u.target];u.age+=FRAME;if(u.age>=60)return false;
 // WhiteBloodUnit.as:126-178: transfer ceil-ish integer thirds over frames, never instant debit.
 if(u.kind==='w'&&u.power<u.wanted&&!u.moving){if(u.side===c.own&&c.fat!==-1&&c.fat!==u.side){setPower(c,c.u+u.power);return false;}if(c.u===0||u.side!==c.own){u.wanted=u.power;if(!u.power)return false;u.moving=true;return true;}let n=Math.max(1,Math.trunc((u.wanted-u.power)/3));n=Math.min(n,c.u);unitPower(u,u.power+n);setPower(c,c.u-n);if(u.power>=u.wanted||c.u===0){u.wanted=u.power;u.moving=true;const v=upgrade(c,'speed');u.vmax*=1+v;u.acceleration*=1+v;u.slow-=u.slow*v/3;}return true;}
 u.x+=u.bx;u.y+=u.by;u.bx*=.85;u.by*=.85;
 if(u.moving){u.v=clamp(u.v,0,u.vmax);if(u.acc)u.angle=Math.atan2(t.y-u.y,t.x-u.x);u.x+=Math.cos(u.angle)*u.v;u.y+=Math.sin(u.angle)*u.v;if(u.acc){u.v+=u.acceleration*2;if(u.v>=u.vmax-.1)u.acc=false;}else{u.v*=u.slow;if(u.v<=u.vmin){u.acc=true;u.angle=Math.atan2(t.y-u.y,t.x-u.x);}}}
 for(const other of s.cells){if(other===c)continue;const d=Math.trunc(Math.hypot(u.x-other.x,u.y-other.y));if(other===t){const hit=u.kind==='w'?d<u.ray+other.ray:d<2;if(hit){if(u.kind==='w')burst(s,u);else if(u.kind==='f')arriveFat(other,u.side);else arriveAb(other,u.side,s);return false;}if(u.kind!=='w'&&d<other.ray-u.ray/2)u.angle=Math.atan2(other.y-u.y,other.x-u.x);}else if(d<u.ray+other.ray){separate(u,other);if(other.fat!==-1&&other.fat!==u.side)bounce(u,other);}}
 return true;
}
function collide(a,b){separate(a,b);separate(b,a);if(a.kind==='w'&&b.kind==='a'&&a.side!==b.side)a.side=b.side;if(b.kind==='w'&&a.kind==='a'&&b.side!==a.side)b.side=a.side;if(a.kind==='w'&&b.kind==='f'&&a.side!==b.side)bounce(a,b);if(b.kind==='w'&&a.kind==='f'&&b.side!==a.side)bounce(b,a);if(a.kind==='a'&&b.kind==='f')bounce(a,b);if(b.kind==='a'&&a.kind==='f')bounce(b,a);if(a.kind==='f'&&b.kind==='f'&&a.side!==b.side){bounce(a,b);bounce(b,a);}}
function tickMini(s,m){const c=s.cells[m.target];if(m.mode==='home'){const a=Math.atan2(c.y-m.y,c.x-m.x);m.v=Math.min(10,m.v+1);m.vx=Math.cos(a)*m.v;m.vy=Math.sin(a)*m.v;const d=Math.trunc(Math.hypot(c.x-m.x,c.y-m.y));if(d<c.ray*1.2&&!m.hit){m.hit=true;if(shieldMini(c,m.side)){m.mode='bounce';const a=Math.atan2(c.y-m.y,c.x-m.x);m.x=c.x-Math.cos(a)*c.ray*1.2;m.y=c.y-Math.sin(a)*c.ray*1.2;m.vx=-Math.cos(a)*(2+random(s)*3);m.vy=-Math.sin(a)*(2+random(s)*3);m.side=0;}}if(m.mode!=='bounce'&&d<c.ray2){arriveWhite(c,m.side,s,false);return false;}}else if(m.mode==='bounce'){if(m.life--===0)return false;m.vx*=.83;m.vy*=.83;}else{m.vx*=.83;m.vy*=.83;if(m.vx<.5&&m.vy<.5)m.mode='home';}m.x+=m.vx;m.y+=m.vy;return true;}
function powerBySide(s){const p=[0,0,0,0,0];for(const c of s.cells)p[c.own]+=c.u;for(const u of s.units)p[u.side]+=u.power;return p;}
// Game.as:1986-2044: ALL cell types count, and wait for minis; unlike previous Lite.
function winner(s){const alive=new Set(s.cells.filter(c=>c.own).map(c=>c.own));for(const u of s.units)if(u.side)alive.add(u.side);for(const m of s.minis)if(m.side&&m.mode!=='bounce')alive.add(m.side);if(!alive.has(1))return 2;return alive.size===1&&s.units.length===0&&s.minis.length===0?1:0;}
function tick(s){s.time+=FRAME;for(const c of s.cells){sync(c);if(c.type==='n'){c.growth+=FRAME;if(c.growth+EPS>=c.delay){c.growth-=c.delay;produce(c);}}else if(c.loading){c.timer+=FRAME;if(c.timer+EPS>=LOAD[c.type]){c.timer=LOAD[c.type];c.loading=false;c.ready=true;}}}s.units=s.units.filter(u=>tickUnit(s,u));for(let i=0;i<s.units.length;i++)for(let j=i+1;j<s.units.length;j++){const a=s.units[i],b=s.units[j];if(Math.trunc(Math.hypot(a.x-b.x,a.y-b.y))<a.ray+b.ray)collide(a,b);}s.minis=s.minis.filter(m=>tickMini(s,m));s.over=winner(s);}
function clampFrame(dt){return Number.isFinite(dt)?clamp(dt,0,.05):0;}
function step(s,seconds){if(s.over)return;s.accumulator+=clampFrame(seconds);while(s.accumulator+EPS>=FRAME&&!s.over){s.accumulator-=FRAME;tick(s);}}
return {MAX,FPS,FRAME,LOAD,LOAD_FRAMES,UPGRADES,createState,selectable,canSend,setPower,switchSide,arriveWhite,arriveFat,arriveAb,sendFleet,growthInterval,winner,powerBySide,clampFrame,step,random,upgrade,shieldMini,collide};
});
