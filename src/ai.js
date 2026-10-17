/* Behavior reconstruction of ai/AI.as and ai/Normal.as. No DOM or private mutations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.NanoAI=factory(root.NanoCore);})(globalThis,function(Core){
'use strict';
const dist=(a,b)=>Math.trunc(Math.hypot(a.x-b.x,a.y-b.y)),asc=a=>a.slice().sort((a,b)=>a.u-b.u),desc=a=>asc(a).reverse();
// FrameTimer.as:11,31-34 uses25fps to compute frame counts, even on requested30fps mode.
function create(options={}){const ms=options.timeDecision||5000,interval=Math.trunc(ms/1000*25)/Core.FPS;return {timer:1+interval,interval,timeDecision:ms,mode:'normal',side:options.side||2,turn:0};}
function decision(s,side=2){
 const white=s.cells.filter(c=>c.type==='n'),own=white.filter(c=>c.own===side),foes=white /* AI.as:258-272: cellsSide(side,false) also includes friendly cells */,fat=s.cells.filter(c=>c.type==='f'),ab=s.cells.filter(c=>c.type==='a');
 const strongest=desc(own),a=strongest[0],b=strongest[1];if(!a)return;
 const p=Core.powerBySide(s);let weakSide=1,least=p[1];for(let i=1;i<p.length;i++)if(p[i]<least&&p[i]>0&&i!==side){least=p[i];weakSide=i;}
 const enemies=asc(white.filter(c=>c.own===weakSide)),weak=enemies[0],enemy=enemies[enemies.length-1];
 const nearest=(from,list)=>list.slice().sort((x,y)=>dist(from,x)-dist(from,y))[0];
 const neutral=white.filter(c=>c.own===0).sort((x,y)=>dist(a,x)-dist(a,y)).slice(0,3),weakNeutral=asc(neutral)[0],big=own.slice().sort((x,y)=>y.size-x.size)[0];
 const myFat=desc(fat.filter(c=>c.own===side))[0],myAb=desc(ab.filter(c=>c.own===side))[0],nearFat=nearest(a,asc(fat)),nearAb=nearest(a,ab),strongFoe=desc(foes)[0];
 const attack=(from,to,percent=50)=>from&&to?Core.sendFleet(s,[from.id],to.id,side,percent):0;
 // Normal.as:58-167: preserve ordering, including the original truthy power*3 condition.
 if(weak&&p[weakSide]*7<own.reduce((n,c)=>n+c.u,0)&&!weak.antibody)attack(a,weak,100);
 else if(!weak)attack(a,s.cells.find(c=>c.own===weakSide));
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
 else if(a.u>=40&&s.cells.filter(c=>c.own===side).length===1)attack(a,asc(foes)[0]);
 else if(neutral.length&&dist(a,neutral[0])<300){for(const c of neutral)if(a.u/1.5>c.u&&dist(a,c)<350&&c.fat===-1){attack(a,c,85);break;}}
}
function think(s,brain,dt,side=brain.side){if(s.over||brain.stopped)return;brain.timer-=dt;if(brain.timer>1e-9)return;brain.timer+=brain.interval;brain.turn++;if(Core.powerBySide(s)[side]===0){brain.stopped=true;return;}decision(s,side);}
return {create,think,decision};
});
