'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
function crc32(buf){let c,crc=0xffffffff;for(let n=0;n<buf.length;n++){c=(crc^buf[n])&0xff;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crc=(crc>>>8)^c;}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
function png(size){
 const w=size,h=size,raw=Buffer.alloc((w*4+1)*h);
 const bg=[9,19,34],cy=[86,216,230],wh=[245,249,255];
 const cx=size/2,cyy=size/2,R=size*0.36,th=size*0.045;
 for(let y=0;y<h;y++){const off=y*(w*4+1);raw[off]=0;
  for(let x=0;x<w;x++){const dx=x-cx,dy=y-cyy,d=Math.hypot(dx,dy);let c=bg;
   if(Math.abs(d-R)<th)c=cy;
   // N: two vertical bars + diagonal
   const bw=size*0.055, top=size*0.30, bot=size*0.70, lx=size*0.34, rx=size*0.66;
   if((Math.abs(x-lx)<bw&&y>top&&y<bot)||(Math.abs(x-rx)<bw&&y>top&&y<bot))c=wh;
   const t=(y-top)/(bot-top);if(t>=0&&t<=1){const xd=lx+(rx-lx)*t;if(Math.abs(x-xd)<bw*0.9)c=wh;}
   const o=off+1+x*4;raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;
  }}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const dir=path.join(__dirname,'..','icons');fs.mkdirSync(dir,{recursive:true});
for(const s of [192,512]){const f=path.join(dir,'icon-'+s+'.png');fs.writeFileSync(f,png(s));console.log(f,fs.statSync(f).size);}
