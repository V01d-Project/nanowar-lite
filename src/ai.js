/* Behavior reconstruction of ai/AI.as and ai/Normal.as. No DOM or private mutations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.NanoAI=factory(root.NanoCore);})(globalThis,function(Core){
'use strict';
const dist=(a,b)=>Math.trunc(Math.hypot(a.x-b.x,a.y-b.y)),asc=a=>a.slice().sort((a,b)=>a.u-b.u),desc=a=>asc(a).reverse();
// FrameTimer.as:11,31-34 quantizes milliseconds at the original25fps.
function create(options={}){const ms=options.timeDecision||5000,interval=Math.trunc(ms/1000*25)/Core.FPS;return {timer:1+interval,interval,timeDecision:ms,mode:options.mode||'normal',side:options.side||2,turn:0};}
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
// Easy.as:15-77, Noob.as:17-40, TutorialFat.as:15-26.
function simpleDecision(s,brain,side){
 const white=s.cells.filter(c=>c.type==='n'),own=white.filter(c=>c.own===side),a=desc(own)[0],b=desc(own)[1];if(!a)return;
 const attack=(from,to,pct=50)=>from&&to?Core.sendFleet(s,[from.id],to.id,side,pct):0,total=Core.powerBySide(s)[side],near=(from,list)=>list.slice().sort((x,y)=>dist(from,x)-dist(from,y))[0];
 if(brain.mode==='noob'){if(total>15){const targets=[...white.filter(c=>c.own===0),...white.filter(c=>c.own===1),...white.filter(c=>c.own===2)].filter(c=>dist(a,c)<250);attack(a,targets[Math.floor(Core.random(s)*targets.length)]);}return;}
 if(brain.mode==='tutorialfat'){const target=white[0];Core.random(s);if(target&&total>=target.u&&total>50)attack(own[0],target);return;}
 if(brain.mode==='base')return;
 const powers=Core.powerBySide(s);let sideWeak=1,least=powers[1];for(let i=1;i<powers.length;i++)if(powers[i]<least&&powers[i]>0&&i!==side){least=powers[i];sideWeak=i;}
 const enemy=asc(white.filter(c=>c.own===sideWeak)),weak=enemy[0],strong=enemy[enemy.length-1],fat=s.cells.filter(c=>c.type==='f'),myFat=desc(fat.filter(c=>c.own===side))[0],nearFat=near(a,asc(fat)),neutral=white.filter(c=>c.own===0).sort((x,y)=>dist(a,x)-dist(a,y)).slice(0,3);
 if(!weak){attack(a,nearFat);return;}
 if(weak.u<25&&weak.fat===side)attack(a,weak);
 else if(myFat&&myFat.u>=myFat.powerMax&&strong.fat!==side&&strong.u>50)attack(myFat,strong);
 else if(!myFat&&b&&a.u+b.u>=80&&fat.length&&own.length>1&&enemy.length>1){attack(a,nearFat,80);attack(b,nearFat,80);}
 else if(myFat&&own.length>1&&myFat.u<myFat.powerMax&&a.u>30&&enemy.length>1)attack(a,myFat);
 else if(a.u*3&&dist(a,weak)<200)attack(a,weak);
 else if(neutral.length&&dist(a,neutral[0])<250){for(const c of neutral)if(a.u/2.1>c.u&&dist(a,c)<250){attack(a,c);break;}}
 else if(total*4>weak.u&&dist(a,weak)<350){attack(a,weak);attack(b,weak);}
}
function think(s,brain,dt,side=brain.side){if(s.over||brain.stopped)return;brain.timer-=dt;if(brain.timer>1e-9)return;brain.turn++;if(Core.powerBySide(s)[side]===0){brain.stopped=true;return;}if(brain.mode==='normal'){brain.interval=Math.trunc(brain.timeDecision/1000*25)/Core.FPS;decision(s,side);}else{brain.interval=Math.trunc((brain.timeDecision+Core.random(s)*1000)/1000*25)/Core.FPS;simpleDecision(s,brain,side);}brain.timer+=brain.interval;}
return {create,think,decision,simpleDecision};
});
