/* Rendering reads simulation state; it never applies game rules. */
(function(){'use strict';
window.NanoRender={create(canvas){
 const ctx=canvas.getContext('2d');let W=0,H=0,board;
 const colors=['#8b93a7','#60a5fa','#fb7185'];
 function resize(){W=innerWidth;H=innerHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const width=Math.min(900,W-84);board={x:(W-width)/2,y:95,w:width,h:Math.max(130,H-270)};}
 function point(c){return {x:board.x+c.x*board.w,y:board.y+c.y*board.h};}
 function radius(c){return c.r*Math.min(board.w,board.h);}
 function ring(x,y,r,f,color,width=3){ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(.0001,Math.min(1,f)));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function label(text,x,y,color='#dce6f5',size=12){ctx.fillStyle=color;ctx.font='600 '+size+'px -apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);}
 function draw(state,ui){
  ctx.fillStyle='#0b1220';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(120,160,255,.045)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(const c of state.cells){
   const {x,y}=point(c),r=radius(c),col=colors[c.own];
   const gradient=ctx.createRadialGradient(x,y,r*.1,x,y,r);gradient.addColorStop(0,col+'bb');gradient.addColorStop(1,col+'22');
   ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle=ui.selected.has(c.id)?'#fbbf24':col;ctx.lineWidth=ui.selected.has(c.id)?3:1.8;ctx.stroke();
   if(c.type==='n')label(Math.floor(c.u),x,y,'#f1f5fb',Math.max(14,r*.58));
   else{
    ctx.beginPath();ctx.strokeStyle='#eff6ff';ctx.lineWidth=1.7;
    if(c.type==='f'){ctx.arc(x,y,r*.54,0,Math.PI*2);ctx.moveTo(x+r*.28,y);ctx.arc(x,y,r*.28,0,Math.PI*2);}
    else{for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,rr=r*(i%2?.33:.64);if(i)ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();}ctx.stroke();
    // Separate tracks: cyan = battery energy, gold = timed launch progress.
    ring(x,y,r+5,1,'#20374b',3);ring(x,y,r+5,c.u/100,'#22d3ee',3);
    ring(x,y,r+12,1,'#332e22',3);if(c.timer>0)ring(x,y,r+12,c.timer/NanoCore.LOAD[c.type],'#fbbf24',3);
    label((c.type==='f'?'脂肪':'抗体')+' · '+Math.floor(c.u)+'/100',x,y+r+26,'#c4d0e4',11);
    label(c.u>=100?'发射 '+Math.max(0,NanoCore.LOAD[c.type]-c.timer).toFixed(1)+'s':'送兵充能',x,y+r+42,c.u>=100?'#fbbf24':'#7890aa',10);
   }
   if(c.fat!==-1){ring(x,y,r+18,1,colors[c.fat],4);if(c.fat!==c.own)label('封锁',x,y+r+30,'#fbbf24',10);}
   if(c.antibody){ctx.setLineDash([4,4]);ring(x,y,r+23,1,'#22d3ee',2);ctx.setLineDash([]);}
  }
  for(const u of state.units){if(u.t<0)continue;const t=Math.min(1,u.t/u.dur),p=point({x:u.sx+(u.tx-u.sx)*t,y:u.sy+(u.ty-u.sy)*t});ctx.beginPath();ctx.arc(p.x,p.y,u.kind==='w'?2.7:8,0,Math.PI*2);ctx.fillStyle=colors[u.side];ctx.fill();if(u.kind!=='w'){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();label(u.kind==='f'?'脂':'抗',p.x,p.y-17,'#fff',11);}}
  const d=ui.drag;if(d){ctx.strokeStyle='#60a5fa';ctx.fillStyle='#60a5fa20';ctx.lineWidth=1.5;
   if(d.type==='box'){const x=Math.min(d.start.x,d.end.x),y=Math.min(d.start.y,d.end.y),w=Math.abs(d.start.x-d.end.x),h=Math.abs(d.start.y-d.end.y);ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}
   else if(d.path.length>2){ctx.beginPath();ctx.moveTo(d.path[0].x,d.path[0].y);for(const p of d.path)ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.stroke();}
  }
 }
 resize();return {resize,point,radius,draw};
}};
})();
