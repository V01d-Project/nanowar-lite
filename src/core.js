/* Pure deterministic rules. Browser global + CommonJS; no DOM, clock or randomness. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NanoCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX = 100, LOAD = { f: 8, a: 12 }, EPS = 1e-9;
  const MAP = [
    { x:.17,y:.78,own:1,u:40,type:'n',r:.070 },
    { x:.32,y:.93,own:1,u:20,type:'n',r:.055 },
    { x:.83,y:.22,own:2,u:40,type:'n',r:.070 },
    { x:.68,y:.07,own:2,u:20,type:'n',r:.055 },
    { x:.50,y:.50,own:0,u:30,type:'n',r:.075 },
    { x:.23,y:.52,own:0,u:16,type:'n',r:.050 },
    { x:.77,y:.48,own:0,u:16,type:'n',r:.050 },
    { x:.43,y:.24,own:0,u:0,type:'f',r:.048 },
    { x:.57,y:.76,own:0,u:0,type:'a',r:.048 },
    { x:.12,y:.25,own:0,u:12,type:'n',r:.042 },
    { x:.88,y:.75,own:0,u:12,type:'n',r:.042 }
  ];
  function createState(map = MAP) {
    return { cells: map.map((c,id) => Object.assign({id,x:0,y:0,r:.05,own:0,u:0,type:'n',fat:-1,antibody:false,timer:0,growth:0},c,{id})), units:[], time:0, over:0 };
  }
  function selectable(c, side) { return !!c && c.type === 'n' && c.own === side; }
  function canSend(c,side) { return selectable(c,side) && (c.fat === -1 || c.fat === side) && c.u >= 4; }
  function capture(c,side,remainder=0) {
    c.own=side; c.u=c.type==='n' ? Math.min(MAX,remainder) : 0;
    c.timer=0; c.growth=0; c.antibody=false; c.fat=-1;
  }
  // Every ordinary projectile is ONE soldier: one absorption = +1, never +fleet-size.
  function arriveWhite(c,side) {
    if (c.own===side || c.antibody) { c.u=Math.min(MAX,c.u+1); return; }
    c.u-=1;
    if (c.u<0) capture(c,side,-c.u);
    if (c.type!=='n' && c.u<MAX) c.timer=0;
  }
  function arriveFat(c,side) {
    if (c.type!=='n') return false;
    if (c.fat===-1 && c.antibody) c.antibody=false;
    else if (c.fat===-1) c.fat=side;
    else if (c.fat!==side) c.fat=-1;
    return true;
  }
  function arriveAb(c,side) {
    if (c.fat!==-1 && c.fat!==side) return false;
    if (c.own!==side) {
      c.own=side; c.growth=0;
      // Infection preserves ordinary energy and compatible fat shields.
      // Special ownership changes always reset the battery and launch timer.
      if(c.type!=='n') {c.u=0;c.timer=0;}
    }
    c.antibody=true;
    return true;
  }
  function launch(state,source,target,kind,delay=0) {
    const distance=Math.hypot(target.x-source.x,target.y-source.y);
    state.units.push({kind,side:source.own,target:target.id,sx:source.x,sy:source.y,tx:target.x,ty:target.y,t:delay ? -delay : 0,dur:Math.max(.9,distance*800/107)});
  }
  function sendFleet(state,ids,targetId,side) {
    const target=state.cells[targetId];
    if (!target || state.over || (side!==1 && side!==2)) return 0;
    let sent=0;
    for (const id of new Set(ids)) {
      const c=state.cells[id];
      if (!canSend(c,side) || c.id===target.id) continue;
      const n=Math.floor(c.u*.5); c.u-=n;
      for(let i=0;i<n;i++) launch(state,c,target,'w',i*.065);
      sent+=n;
    }
    return sent;
  }
  function spawnSpecial(state,c) {
    const targets=state.cells.filter(t=>t.id!==c.id && t.own!==c.own && (c.type!=='f' || t.type==='n'));
    targets.sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y) || a.id-b.id);
    if (!targets.length) return false;
    launch(state,c,targets[0],c.type); return true;
  }
  function growthInterval(c) { return 3.2-2.2*Math.min(1,Math.max(0,c.u)/MAX); }
  // Elimination of normal production bases. Neutral / special cells do not block a win.
  // In-flight ordinary soldiers can still recapture a base: resolve them before declaring.
  function winner(state) {
    const alive=side=>state.cells.some(c=>c.type==='n' && c.own===side) || state.units.some(u=>u.kind==='w' && u.side===side);
    const p=alive(1),e=alive(2);
    return p && !e ? 1 : e && !p ? 2 : !p && !e ? 3 : 0;
  }
  function clampFrame(seconds) { return Number.isFinite(seconds) ? Math.max(0,Math.min(.05,seconds)) : 0; }
  // One bounded simulation step. App subdivides accelerated time; no speed multiplier in travel.
  function step(state,seconds) {
    const dt=clampFrame(seconds);
    if (state.over || !dt) return;
    state.time+=dt;
    for (const c of state.cells) {
      if (!c.own) continue;
      if (c.type==='n') {
        if(c.u>=MAX) {c.growth=0;continue;}
        c.growth+=dt;
        const interval=growthInterval(c);
        if(c.growth+EPS>=interval) {c.growth-=interval;c.u=Math.min(MAX,c.u+1);}
      } else if(c.u>=MAX) {
        c.timer+=dt;
        if(c.timer+EPS>=LOAD[c.type]) {
          if(spawnSpecial(state,c)) {c.timer=0;c.u=0;}
          else c.timer=LOAD[c.type];
        }
      } else c.timer=0;
    }
    const pending=[];
    for(const u of state.units) {
      u.t+=dt;
      if(u.t+EPS<u.dur) {pending.push(u);continue;}
      const c=state.cells[u.target];
      if(!c) continue;
      if(u.kind==='w') arriveWhite(c,u.side);
      else if(u.kind==='f') arriveFat(c,u.side);
      else arriveAb(c,u.side);
    }
    state.units=pending;
    state.over=winner(state);
  }
  return {MAX,LOAD,MAP,createState,selectable,canSend,capture,arriveWhite,arriveFat,arriveAb,sendFleet,spawnSpecial,growthInterval,winner,clampFrame,step};
});
