/* Pointer-only input adapter: selection/UI state is separate from simulation. */
(function(){'use strict';
window.NanoInput={create(canvas,renderer,getState){
 const ui={selected:new Set(),drag:null,percent:50};
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 // Prefer an actual cell body over another cell's enlarged touch halo.
 const hit=p=>getState().cells.map(c=>{const q=renderer.point(c),r=Math.max(1,renderer.radius(c)),d=Math.hypot(p.x-q.x,p.y-q.y);return {c,d,r,body:d<=r};}).filter(h=>h.d<=h.r+7).sort((a,b)=>Number(b.body)-Number(a.body)||a.d/a.r-b.d/b.r||a.c.id-b.c.id)[0]?.c;
 function inside(p,pts){let yes=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
 canvas.addEventListener('pointerdown',e=>{
  if(getState().over||ui.drag||!e.isPrimary||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const p=point(e),c=hit(p);ui.drag={pointerId:e.pointerId,start:p,end:p,path:[p],moved:0,source:c&&NanoCore.selectable(c,1)?c.id:undefined,type:e.pointerType==='touch'?'lasso':'box'};
 });
 canvas.addEventListener('pointermove',e=>{const d=ui.drag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();const p=point(e);d.end=p;d.moved=Math.max(d.moved,Math.hypot(p.x-d.start.x,p.y-d.start.y));const last=d.path[d.path.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>5)d.path.push(p);});
 canvas.addEventListener('pointerup',e=>{
  const d=ui.drag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();ui.drag=null;
  const state=getState(),p=point(e);d.end=p;d.moved=Math.max(d.moved,Math.hypot(p.x-d.start.x,p.y-d.start.y));
  if(d.moved<10){
   const c=hit(p);if(!c){ui.selected.clear();return;}
   // Unready friendly batteries accept charge; ready batteries can be selected as sources.
   if(ui.selected.size&&(!NanoCore.selectable(c,1)||!ui.selected.has(c.id))){
    if(NanoCore.sendFleet(state,ui.selected,c.id,1,ui.percent))ui.selected.clear();return;
   }
   ui.selected.clear();if(NanoCore.selectable(c,1))ui.selected.add(c.id);return;
  }
  if(d.source!==undefined){const target=hit(p);if(target&&target.id!==d.source){if(!ui.selected.has(d.source))ui.selected=new Set([d.source]);if(NanoCore.sendFleet(state,ui.selected,target.id,1,ui.percent))ui.selected.clear();}return;}
  ui.selected.clear();
  for(const c of state.cells){if(!NanoCore.selectable(c,1))continue;const q=renderer.point(c);
   if(d.type==='lasso'?inside(q,d.path):q.x>=Math.min(d.start.x,p.x)&&q.x<=Math.max(d.start.x,p.x)&&q.y>=Math.min(d.start.y,p.y)&&q.y<=Math.max(d.start.y,p.y))ui.selected.add(c.id);
  }
 });
 const cancel=()=>{ui.drag=null;};
 canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
 for(const event of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(event,e=>e.preventDefault());
 ui.reset=()=>{ui.selected.clear();cancel();};return ui;
}};
})();