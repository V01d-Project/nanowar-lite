/* Behavior reconstruction of ai/AI.as and ai/Normal.as. No DOM or private mutations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.NanoAI=factory(root.NanoCore);})(globalThis,function(Core){
'use strict';
const dist=(a,b)=>Math.trunc(Math.hypot(a.x-b.x,a.y-b.y)),asc=a=>a.slice().sort((a,b)=>a.u-b.u),desc=a=>asc(a).reverse();
// Rule layer: ordinary fleets feed antibody-marked cells (+1 energy on every hit) and bounce
// off hostile fat shields. Antibody shots are wasted on hostile fat; fat clears antibody marks.
function normalTargetOK(c,side){return c.own===side?c.type!=='n':(!c.antibody&&(c.fat===-1||c.fat===side));}
function antibodyTargetOK(c,side){return c.own===side?!c.antibody:(c.fat===-1||c.fat===side);}
function fatTargetOK(c,side){return c.type==='n'&&c.fat!==side;}
function incomingPower(s,targetId,side){let n=0;for(const u of s.units)if(u.target===targetId&&u.side===side)n+=Math.max(u.power||0,u.wanted||0);return n;}
function attackWith(s,side,from,to,percent=50,strict=false){if(!from||!to)return 0;if(from.type==='n'&&!normalTargetOK(to,side))return 0;if(from.type==='a'&&!antibodyTargetOK(to,side))return 0;if(from.type==='f'&&!fatTargetOK(to,side))return 0;if(strict&&from.type==='n'&&to.own!==side){const inc=incomingPower(s,to.id,side),base=Math.trunc(from.u*Math.max(0,Math.min(100,percent))/100);if(base+inc<to.u&&from.u>0){const need=Math.min(100,Math.ceil(to.u*100/from.u));if(need>percent)percent=need;}const power=Math.trunc(from.u*Math.max(0,Math.min(100,percent))/100);if(power+inc<to.u)return 0;}return Core.sendFleet(s,[from.id],to.id,side,percent);}
// FrameTimer.as:11,31-34 quantizes milliseconds at the original25fps.
function create(options={}){const ms=options.timeDecision||5000,interval=Math.trunc(ms/1000*25)/Core.FPS;return {timer:1+interval,interval,timeDecision:ms,mode:options.mode||'normal',side:options.side||2,turn:0};}
// Select an existing opponent, never the bot itself or an eliminated default side.
function weakestSide(s,side){const powers=Core.powerBySide(s),foes=[1,2,3,4].filter(n=>n!==side&&s.cells.some(c=>c.own===n));if(s.difficulty>=4&&side!==1&&foes.includes(1))return 1;return foes.sort((a,b)=>{const wa=powers[a]*(s.difficulty>=3&&a===1?0.6:1),wb=powers[b]*(s.difficulty>=3&&b===1?0.6:1);return wa-wb;})[0];}
function fireSpecials(s,side){let sent=0;for(const c of s.cells.filter(c=>c.own===side&&c.ready&&c.type!=='n'&&Core.canSend(c,side))){
 const targets=s.cells.filter(t=>t!==c&&(c.type!=='f'||t.type==='n'));
 let useful;if(c.type==='f')useful=targets.filter(t=>t.own!==side&&t.own!==0&&fatTargetOK(t,side)&&(t.antibody||t.fat!==side));
 else useful=targets.filter(t=>t.own!==side&&antibodyTargetOK(t,side));
 if(!useful.length)useful=targets.filter(t=>t.own===side&&(c.type==='f'?fatTargetOK(t,side):antibodyTargetOK(t,side)));
 const target=useful.sort((a,b)=>Number(b.antibody)-Number(a.antibody)||b.u-a.u||dist(c,a)-dist(c,b))[0];if(target)sent+=Core.sendFleet(s,[c.id],target.id,side);
 }return sent;}
function decision(s,side=2){
 if(fireSpecials(s,side))return;
 const white=s.cells.filter(c=>c.type==='n'),ownAll=white.filter(c=>c.own===side),own=ownAll.filter(c=>Core.canSend(c,side)),foes=white /* AI.as:258-272: cellsSide(side,false) also includes friendly cells */,fat=s.cells.filter(c=>c.type==='f'),ab=s.cells.filter(c=>c.type==='a');
 const strongest=desc(own),a=strongest[0],b=strongest[1];if(!a)return;
 const p=Core.powerBySide(s),weakSide=weakestSide(s,side);
 const enemies=asc(white.filter(c=>c.own===weakSide)),weak=enemies[0],enemy=enemies[enemies.length-1];
 const nearest=(from,list)=>list.slice().sort((x,y)=>dist(from,x)-dist(from,y))[0];
 const neutral=white.filter(c=>c.own===0).sort((x,y)=>dist(a,x)-dist(a,y)).slice(0,3),weakNeutral=asc(neutral)[0],big=own.slice().sort((x,y)=>y.size-x.size)[0];
 const myFat=desc(fat.filter(c=>c.own===side))[0],myAb=desc(ab.filter(c=>c.own===side))[0],nearFat=nearest(a,asc(fat)),nearAb=nearest(a,ab),strongFoe=desc(foes)[0];
 const attack=(from,to,percent=50)=>attackWith(s,side,from,to,percent,true);
 // Normal.as:58-167: preserve ordering, including the original truthy power*3 condition.
 if(weak&&p[weakSide]*7<ownAll.reduce((n,c)=>n+c.u,0)&&!weak.antibody)attack(a,weak,100);
 else if(!weak)attack(a,s.cells.find(c=>c.own===weakSide&&normalTargetOK(c,side)));
 else if(big.u<15&&big.size>=60&&!big.antibody)attack(a,big);
 else if(b&&weakNeutral&&weakNeutral.u*4<a.u+b.u&&weakNeutral.fat!==-1&&!weakNeutral.antibody){attack(a,weakNeutral,100);attack(b,weakNeutral,100);}
 else if(myAb&&myAb.ready&&enemy&&enemy.fat===-1&&enemy.u>50)attack(myAb,strongFoe);
 else if(myAb&&!myAb.ready&&big.u>=30)attack(big,myAb);
 else if(myAb&&myAb.ready&&!big.antibody&&big.size>=60)attack(myAb,big);
 else if(!myAb&&b&&b.u+a.u>=80&&ab.length&&own.length>1){attack(a,nearAb,80);attack(b,nearAb,80);}
 else if(myFat&&enemy&&myFat.ready&&enemy.fat!==side&&enemy.u>50)attack(myFat,enemy);
 else if(myFat&&enemy&&myFat.ready&&enemy.fat!==side)attack(myFat,enemy);
 else if(myFat&&myFat.ready&&big.u>=30&&big.fat!==side)attack(myFat,big);
 else if(b&&a.u+b.u>weak.u*1.2&&dist(a,weak)<250&&weak.fat===-1&&!weak.antibody){attack(a,weak,80);attack(b,weak,80);}
 else if(weak.u<25&&weak.fat===side)attack(a,weak);
 else if(!myFat&&b&&b.u+a.u>=80&&fat.length&&own.length>1){attack(a,nearFat,80);attack(b,nearFat,80);}
 else if(myFat&&own.length>1&&myFat.u<myFat.powerMax&&a.u>30)attack(a,myFat);
 else if(a.u*3&&dist(a,weak)<250&&weak.fat===-1&&!weak.antibody)attack(a,weak,75);
 else if(a.u>=40&&s.cells.filter(c=>c.own===side).length===1)attack(a,asc(foes.filter(c=>c.own!==side&&normalTargetOK(c,side)))[0]);
 else if(neutral.length&&dist(a,neutral[0])<300){for(const c of neutral)if(a.u/1.5>c.u&&dist(a,c)<350&&normalTargetOK(c,side)){attack(a,c,85);break;}}
}
// Easy.as:15-77, Noob.as:17-40, TutorialFat.as:15-26.
function simpleDecision(s,brain,side){
 if(brain.mode!=='base'&&fireSpecials(s,side))return;
 const white=s.cells.filter(c=>c.type==='n'),own=white.filter(c=>c.own===side&&Core.canSend(c,side)),a=desc(own)[0],b=desc(own)[1];if(!a)return;
 const attack=(from,to,pct=50)=>attackWith(s,side,from,to,pct,brain.mode==='easy'),total=Core.powerBySide(s)[side],near=(from,list)=>list.slice().sort((x,y)=>dist(from,x)-dist(from,y))[0];
 if(brain.mode==='noob'){if(total>15){const foes=s.cells.filter(c=>c.own!==side&&(c.type==='n'||c.own>0)&&normalTargetOK(c,side)),from=desc(own).find(c=>Core.canSend(c,side)&&foes.some(t=>dist(c,t)<250));if(from){const targets=foes.filter(c=>dist(from,c)<250);attack(from,targets[Math.floor(Core.random(s)*targets.length)]);}}return;}
 if(brain.mode==='tutorialfat'){const target=white[0];Core.random(s);if(target&&total>=target.u&&total>50)attack(own[0],target);return;}
 if(brain.mode==='base')return;
 const sideWeak=weakestSide(s,side);
 const enemy=asc(white.filter(c=>c.own===sideWeak)),weak=enemy[0],strong=enemy[enemy.length-1],fat=s.cells.filter(c=>c.type==='f'),myFat=desc(fat.filter(c=>c.own===side))[0],nearFat=near(a,asc(fat)),neutral=white.filter(c=>c.own===0).sort((x,y)=>dist(a,x)-dist(a,y)).slice(0,3);
 if(!weak){attack(a,nearFat);return;}
 if(weak.u<25&&weak.fat===side)attack(a,weak);
 else if(myFat&&myFat.u>=myFat.powerMax&&strong.fat!==side&&strong.u>50)attack(myFat,strong);
 else if(!myFat&&b&&a.u+b.u>=80&&fat.length&&own.length>1&&enemy.length>1){attack(a,nearFat,80);attack(b,nearFat,80);}
 else if(myFat&&own.length>1&&myFat.u<myFat.powerMax&&a.u>30&&enemy.length>1)attack(a,myFat);
 else if(a.u*3&&dist(a,weak)<200)attack(a,weak);
 else if(neutral.length&&dist(a,neutral[0])<250){for(const c of neutral)if(a.u/2.1>c.u&&dist(a,c)<250&&normalTargetOK(c,side)){attack(a,c);break;}}
 else if(total*4>weak.u&&dist(a,weak)<350){attack(a,weak);attack(b,weak);}
}
// Original priorities can all miss (e.g. level4: two allies, foe >250px away).
// After two idle decisions, use another legal source/target rather than sleep forever.
function idleFallback(s,brain,side,before){
 if(brain.mode!=='normal'&&brain.mode!=='easy')return;
 brain.idle=s.nextUnit===before?(brain.idle||0)+1:0;if(brain.idle<2)return;
 const source=desc(s.cells.filter(c=>c.type==='n'&&c.u>=40&&Core.canSend(c,side)))[0];if(!source)return;
 const targets=s.cells.filter(c=>c.own!==side&&c!==source&&normalTargetOK(c,side));
 const target=targets.sort((a,b)=>Number(a.own!==0)-Number(b.own!==0)||dist(source,a)-dist(source,b))[0];
 if(target&&attackWith(s,side,source,target,50,true))brain.idle=0;
}
function think(s,brain,dt,side=brain.side){if(s.over||brain.stopped)return;brain.timer-=dt;if(brain.timer>1e-9)return;brain.turn++;if(!s.cells.some(c=>c.own===side)&&!s.units.some(u=>u.side===side)&&!s.minis.some(m=>m.side===side&&m.mode!=='bounce')){brain.timer+=brain.interval;return;}const before=s.nextUnit;if(brain.mode==='normal'){brain.interval=Math.trunc(brain.timeDecision/1000*25)/Core.FPS;decision(s,side);}else{brain.interval=Math.trunc((brain.timeDecision+Core.random(s)*1000)/1000*25)/Core.FPS;simpleDecision(s,brain,side);}idleFallback(s,brain,side,before);brain.timer+=brain.interval;}
return {create,think,decision,simpleDecision,weakestSide,normalTargetOK,antibodyTargetOK,fatTargetOK};
});
