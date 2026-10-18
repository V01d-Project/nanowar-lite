/* Read-only Canvas renderer. Every shape is generated; no external artwork. */
(function(){'use strict';
window.NanoRender={create(canvas){
 const ctx=canvas.getContext('2d'),colors=['#8392a7','#68b5ff','#ff7d88','#87cd77','#edca63'];let W,H,camera={x:0,y:0,s:1,left:0,top:0};
 function resize(){W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);ctx.setTransform(d,0,0,d,0,0);}
 function fit(state){const cells=state.cells;let minx=Math.min(...cells.map(c=>c.x-c.ray))-48,maxx=Math.max(...cells.map(c=>c.x+c.ray))+48,miny=Math.min(...cells.map(c=>c.y-c.ray))-65,maxy=Math.max(...cells.map(c=>c.y+c.ray))+76;const w=maxx-minx,h=maxy-miny,top=Math.min(124,H*.2),bottom=H-Math.min(205,H*.27);const scale=Math.min((W-32)/w,(bottom-top)/h,1.9);camera={x:minx,y:miny,s:scale,left:(W-w*scale)/2,top:top+(bottom-top-h*scale)/2};}
 function point(c){return {x:camera.left+(c.x-camera.x)*camera.s,y:camera.top+(c.y-camera.y)*camera.s};}
 function radius(c){return c.ray*camera.s;}
 function ring(x,y,r,f,color,width=2){ctx.beginPath();ctx.arc(x,y,Math.max(.5,r),-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.00001,Math.min(1,f)));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function label(text,x,y,color='#dfebfa',size=12){ctx.fillStyle=color;ctx.font='600 '+size+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);}
 function shape(x,y,r,kind){ctx.beginPath();if(kind==='a'){for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=r*(i%2?.72:1);if(i)ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else ctx.moveTo(x+rr,y);}ctx.closePath();}else ctx.arc(x,y,r,0,Math.PI*2);}
 function draw(state,ui){fit(state);ctx.fillStyle='#091322';ctx.fillRect(0,0,W,H);const bg=ctx.createRadialGradient(W*.5,H*.43,20,W*.5,H*.43,W*.8);bg.addColorStop(0,'#142b40');bg.addColorStop(1,'#091322');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle='#7898b719';for(let x=18;x<W;x+=32)for(let y=120;y<H-180;y+=32){ctx.beginPath();ctx.arc(x,y,1,0,7);ctx.fill();}
 const dense=state.cells.length>10||state.level>=9;
 for(const c of state.cells){const {x,y}=point(c),r=radius(c),col=colors[c.own],inner=r*(c.type==='n'?Math.max(.5,Math.min(1.1,.5+c.u/200)):1);
 ring(x,y,r,1,col+'45',1);const g=ctx.createRadialGradient(x-inner*.3,y-inner*.3,1,x,y,inner);g.addColorStop(0,col+'a0');g.addColorStop(1,col+'27');shape(x,y,inner,c.type);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.stroke();
 // Selection lives outside every status ring, including charged specials.
 if(ui.selected.has(c.id))ring(x,y,r+23,1,'#ffd275',3);
 if(c.type==='n'){label(c.u+(c.antibody?'*':''),x,y,'#f5f9ff',Math.max(13,Math.min(23,r*.7)));if(c.own)ring(x,y,r+3,c.growth/c.delay,col+'80',1.5);}
 else{if(dense){label(c.u,x,y,'#e9f7ff',Math.max(9,Math.min(13,r*.6)));ring(x,y,r-3,1,'#203d50',2);ring(x,y,r-3,c.u/c.powerMax,'#56d8e6',2);ring(x,y,r+2,1,'#34382f',2);if(c.timer)ring(x,y,r+2,c.timer/NanoCore.LOAD[c.type],'#ffd275',2);}else{if(c.type==='f'){ring(x,y,r*.45,1,col,2);ring(x,y,r*.22,1,col,1);}else{label('+',x,y,'#e9f7ff',Math.max(15,r));}ring(x,y,r-4,1,'#203d50',3);ring(x,y,r-4,c.u/c.powerMax,'#56d8e6',3);ring(x,y,r+3,1,'#34382f',2);if(c.timer)ring(x,y,r+3,c.timer/NanoCore.LOAD[c.type],'#ffd275',2);label((c.type==='f'?'脂肪':'抗体')+' '+c.u+'/'+c.powerMax,x,y+r+(ui.selected.has(c.id)?34:25),'#bdcedf',Math.max(9,Math.min(12,11*camera.s)));label(c.ready?'就绪 · 点选发射':c.loading?'准备 '+(NanoCore.LOAD[c.type]-c.timer).toFixed(1)+'s':'送兵充能',x,y+r+(ui.selected.has(c.id)?49:40),c.ready?'#ffd275':'#7590a8',10);}}
 if(c.fat!==-1){ring(x,y,r+(dense?4:11),1,colors[c.fat],dense?2:4);if(c.fat!==c.own)label('封锁',x,y-r-20,'#ffd275',10);}if(c.antibody){ctx.setLineDash([3,4]);ring(x,y,r+(dense?7:17),1,'#75e7df',2);ctx.setLineDash([]);}}
 for(const u of state.units){const p=point(u),r=Math.max(3,u.ray*camera.s);shape(p.x,p.y,r,u.kind);ctx.fillStyle=colors[u.side]+'c0';ctx.fill();ctx.strokeStyle=colors[u.side];ctx.lineWidth=1.2;ctx.stroke();if(u.kind==='w'&&u.power)label(u.power,p.x,p.y-r-8,colors[u.side],10);}
 for(const u of state.minis){const p=point(u);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.3,1.8*camera.s),0,7);ctx.fillStyle=colors[u.side]+(u.mode==='bounce'?'55':'dd');ctx.fill();}
 const d=ui.drag;if(d){ctx.strokeStyle='#75c9ff';ctx.fillStyle='#75c9ff18';ctx.lineWidth=1.5;if(d.source!==undefined&&d.moved>10){const p=point(state.cells[d.source]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(d.end.x,d.end.y);ctx.stroke();}else if(d.type==='box'){const x=Math.min(d.start.x,d.end.x),y=Math.min(d.start.y,d.end.y);ctx.fillRect(x,y,Math.abs(d.start.x-d.end.x),Math.abs(d.start.y-d.end.y));ctx.strokeRect(x,y,Math.abs(d.start.x-d.end.x),Math.abs(d.start.y-d.end.y));}else if(d.path.length>2){ctx.beginPath();ctx.moveTo(d.path[0].x,d.path[0].y);for(const p of d.path)ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.stroke();}}
 }
 resize();return {resize,point,radius,draw};
}};
})();
