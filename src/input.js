/* Pointer input is independent of simulation and continues charging while stationary. */
(function(){'use strict';
window.NanoInput={create(canvas,renderer,getState,adapter={}){
 const START_PERCENT=50,INCREASE_PERCENT=5,DELAY_PERCENT=4,FRAME_MS=1000/NanoCore.FPS;
 const side=()=>adapter.side?adapter.side():1,enabled=()=>!(adapter.enabled&&!adapter.enabled())&&!getState().over;
 const ui={selected:new Set(),drag:null,percent:START_PERCENT};
 if(canvas.style)canvas.style.touchAction='none';
 const clock=()=>globalThis.performance?.now?.()??Date.now();
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 // Actual bodies win over halos; 44px minimum touch diameter without stealing neighbouring cells.
 const hit=(p,touch=false)=>getState().cells.map(c=>{const q=renderer.point(c),r=Math.max(1,renderer.radius(c)),d=Math.hypot(p.x-q.x,p.y-q.y);return {c,d,r,body:d<=r};}).filter(h=>h.d<=(touch?Math.max(22,h.r+10):h.r+7)).sort((a,b)=>Number(b.body)-Number(a.body)||a.d/a.r-b.d/b.r||a.c.id-b.c.id)[0]?.c;
 function inside(p,pts){let yes=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
 function charge(now=clock()){const d=ui.drag;if(d&&(d.source!==undefined||d.chargeTarget!==undefined)){const elapsed=Math.max(0,now-d.started);ui.percent=Math.min(100,START_PERCENT+INCREASE_PERCENT*Math.floor(elapsed/(FRAME_MS*DELAY_PERCENT)));}return ui.percent;}
 ui.update=charge;
 function cancel(){const d=ui.drag;ui.drag=null;ui.percent=START_PERCENT;if(d&&canvas.hasPointerCapture?.(d.pointerId))canvas.releasePointerCapture(d.pointerId);}
 function send(state,ids,target){return adapter.send?adapter.send(ids,target,ui.percent):NanoCore.sendFleet(state,ids,target,side(),ui.percent);}
 canvas.addEventListener('pointerdown',e=>{
  if(!enabled()||ui.drag||e.isPrimary===false||e.button!==0)return;e.preventDefault();
  const p=point(e),touch=e.pointerType==='touch',c=hit(p,touch);ui.percent=START_PERCENT;
  const chargeTarget=!!(c&&ui.selected.size&&!ui.selected.has(c.id));ui.drag={pointerId:e.pointerId,start:p,end:p,path:[p],moved:0,started:clock(),touch,source:!chargeTarget&&c&&NanoCore.selectable(c,side())?c.id:undefined,chargeTarget:chargeTarget?c.id:undefined,type:touch?'lasso':'box'};
  canvas.setPointerCapture(e.pointerId);
 },{passive:false});
 canvas.addEventListener('pointermove',e=>{const d=ui.drag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();const p=point(e);d.end=p;d.moved=Math.max(d.moved,Math.hypot(p.x-d.start.x,p.y-d.start.y));const last=d.path[d.path.length-1];if(Math.hypot(p.x-last.x,p.y-last.y)>5)d.path.push(p);charge();},{passive:false});
 canvas.addEventListener('pointerup',e=>{
  const d=ui.drag;if(!d||d.pointerId!==e.pointerId)return;e.preventDefault();charge();ui.drag=null;
  if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(!enabled()){ui.percent=START_PERCENT;return;}
  const state=getState(),p=point(e);d.end=p;d.moved=Math.max(d.moved,Math.hypot(p.x-d.start.x,p.y-d.start.y));
  if(d.chargeTarget!==undefined){const target=hit(p,d.touch);if(target&&target.id===d.chargeTarget&&send(state,ui.selected,target.id))ui.selected.clear();return;}
  if(d.moved<10){
   const c=hit(p,d.touch);if(!c){ui.selected.clear();return;}
   if(ui.selected.size&&(!NanoCore.selectable(c,side())||!ui.selected.has(c.id))){if(send(state,ui.selected,c.id))ui.selected.clear();return;}
   ui.selected.clear();if(NanoCore.selectable(c,side()))ui.selected.add(c.id);return;
  }
  if(d.source!==undefined){const target=hit(p,d.touch);if(target&&target.id!==d.source){if(!ui.selected.has(d.source))ui.selected=new Set([d.source]);if(send(state,ui.selected,target.id))ui.selected.clear();}return;}
  ui.selected.clear();for(const c of state.cells){if(!NanoCore.selectable(c,side()))continue;const q=renderer.point(c);if(d.type==='lasso'?inside(q,d.path):q.x>=Math.min(d.start.x,p.x)&&q.x<=Math.max(d.start.x,p.x)&&q.y>=Math.min(d.start.y,p.y)&&q.y<=Math.max(d.start.y,p.y))ui.selected.add(c.id);}
 },{passive:false});
 canvas.addEventListener('pointercancel',e=>{if(ui.drag?.pointerId===e.pointerId){e.preventDefault();cancel();}},{passive:false});
 canvas.addEventListener('lostpointercapture',e=>{if(ui.drag?.pointerId===e.pointerId)cancel();});
 window.addEventListener?.('blur',cancel);if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 for(const event of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(event,e=>e.preventDefault());
 ui.cancel=cancel;ui.reset=()=>{ui.selected.clear();cancel();};return ui;
}};
})();
