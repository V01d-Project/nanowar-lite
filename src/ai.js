/* AI issues the same validated orders as the player; no private rule mutations. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.NanoAI=factory(root.NanoCore);})(globalThis,function(Core){
'use strict';
function create(){return {timer:0,turn:0};}
function think(state,brain,dt,side=2){
  if(state.over)return;
  brain.timer-=dt;if(brain.timer>0)return;brain.timer=1.1;brain.turn++;
  const incoming=(c,s)=>state.units.filter(u=>u.kind==='w'&&u.target===c.id&&u.side===s).length;
  const sources=state.cells.filter(c=>Core.canSend(c,side)&&c.u>=12).sort((a,b)=>b.u-a.u);
  if(!sources.length)return;
  // Defend normal AND special cells, accounting for reinforcements already on the way.
  const threatened=state.cells.filter(c=>c.own===side&&incoming(c,3-side)>c.u+incoming(c,side)-4)
    .sort((a,b)=>incoming(b,3-side)-b.u-(incoming(a,3-side)-a.u));
  for(const target of threatened){const src=sources.find(c=>c.id!==target.id);if(src){Core.sendFleet(state,[src.id],target.id,side);return;}}
  const src=sources[0];
  // Regularly invest in friendly batteries (including after their automatic discharge).
  const batteries=state.cells.filter(c=>c.type!=='n'&&c.own===side&&c.u+incoming(c,side)<Core.MAX);
  if(batteries.length&&(brain.turn%3===0||src.u>=65)){
    batteries.sort((a,b)=>Math.hypot(a.x-src.x,a.y-src.y)-Math.hypot(b.x-src.x,b.y-src.y));
    Core.sendFleet(state,[src.id],batteries[0].id,side);return;
  }
  const targets=state.cells.filter(c=>c.own!==side&&!c.antibody&&Math.floor(src.u*.5)>c.u-incoming(c,side)+1);
  targets.sort((a,b)=>score(a)-score(b));
  function score(c){return Math.hypot(c.x-src.x,c.y-src.y)*55+c.u-(c.type!=='n'?16:0);}
  if(targets.length)Core.sendFleet(state,[src.id],targets[0].id,side);
}
return {create,think};
});