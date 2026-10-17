/* Composition root: clock, lifecycle and DOM HUD only. */
(function(){'use strict';
const Core=NanoCore,canvas=document.getElementById('c');
const renderer=NanoRender.create(canvas);let state=Core.createState(),brain=NanoAI.create(),speed=1,last=performance.now();
const ui=NanoInput.create(canvas,renderer,()=>state);
function reset(){state=Core.createState();brain=NanoAI.create();ui.reset();last=performance.now();document.getElementById('msg').hidden=true;render();}
function render(){
 for(const id of ui.selected)if(!Core.selectable(state.cells[id],1))ui.selected.delete(id);
 for(const side of [1,2])document.getElementById(side===1?'pCount':'eCount').textContent=state.cells.filter(c=>c.own===side).reduce((s,c)=>s+Math.floor(c.u),0);
 if(state.over){document.getElementById('msg').hidden=false;document.getElementById('mtitle').textContent=state.over===1?'赢了':state.over===2?'输了':'平局';document.getElementById('msub').textContent='敌我普通细胞与在途普通兵决定胜负；特殊细胞不计入。';}
 renderer.draw(state,ui);
}
const app={get state(){return state;},ui,renderer,reset,render,paused:false};window.NanoApp=app;
function frame(now){const dt=Core.clampFrame((now-last)/1000);last=now;
 if(!document.hidden&&!app.paused&&!state.over){let remaining=dt*speed;while(remaining>1e-9){const d=Math.min(.05,remaining);Core.step(state,d);NanoAI.think(state,brain,d);remaining-=d;}}
 render();requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>{ui.reset();renderer.resize();render();});
document.addEventListener('visibilitychange',()=>{last=performance.now();ui.drag=null;});
document.getElementById('restart').onclick=reset;document.getElementById('again').onclick=reset;
document.getElementById('speed').onclick=e=>{speed=speed===3?1:speed+1;e.target.textContent='速度 x'+speed;};
reset();document.documentElement.dataset.ready='true';requestAnimationFrame(frame);
})();
