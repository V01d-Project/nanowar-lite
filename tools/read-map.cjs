/* Reads only placement/label data; never exports SWF artwork or executable code. */
'use strict';
const fs=require('node:fs'),z=require('node:zlib');
function readTimeline(file='Nano_War_2.swf',symbol=330){
 let b=fs.readFileSync(file);if(b[0]===67)b=Buffer.concat([b.subarray(0,8),z.inflateSync(b.subarray(8))]);
 function bits(buf,start){let p=start*8;return {u(n){let v=0;while(n--)v=v*2+((buf[p>>3]>>(7-(p++%8)))&1);return v;},s(n){const v=this.u(n);return v>=2**(n-1)?v-2**n:v;},end(){return Math.ceil(p/8);}};}
 function matrix(buf,p){const q=bits(buf,p);let sx=1,sy=1,rx=0,ry=0;if(q.u(1)){const n=q.u(5);sx=q.s(n)/65536;sy=q.s(n)/65536;}if(q.u(1)){const n=q.u(5);rx=q.s(n)/65536;ry=q.s(n)/65536;}const n=q.u(5),x=q.s(n)/20,y=q.s(n)/20;return {x,y,sx,sy,rx,ry,end:q.end()};}
 const sprites={},classes={};function tags(buf,p,end,collect){const out=[];while(p<end){const h=buf.readUInt16LE(p);p+=2;const code=h>>6;let len=h&63;if(len===63){len=buf.readUInt32LE(p);p+=4;}const d=buf.subarray(p,p+len);p+=len;if(code===39)sprites[d.readUInt16LE(0)]=tags(d,4,d.length,true);if(code===76){let q=2;for(let i=0;i<d.readUInt16LE(0);i++){const id=d.readUInt16LE(q);q+=2;const stop=d.indexOf(0,q);classes[id]=d.subarray(q,stop).toString();q=stop+1;}}if(collect)out.push({code,d});if(code===0)break;}return out;}
 const r=bits(b,8),nb=r.u(5);for(let i=0;i<4;i++)r.s(nb);const fps=b.readUInt16LE(r.end())/256;tags(b,r.end()+4,b.length,false);
 const display={},frames=[];let frame=1,label=null;const counts={};for(const t of sprites[symbol]){const d=t.d;counts[t.code]=(counts[t.code]||0)+1;
 if(t.code===26||t.code===70){const flags=d[0],flags2=t.code===70?d[1]:0;let p=t.code===70?2:1;const depth=d.readUInt16LE(p);p+=2;const o=flags&1?{...(display[depth]||{})}:{};if(t.code===70&&((flags2&8)||((flags2&16)&&(flags&2))))p=d.indexOf(0,p)+1;if(flags&2){o.symbol=d.readUInt16LE(p);p+=2;}if(flags&4){const m=matrix(d,p);Object.assign(o,m);p=m.end;}if(flags&8){const q=bits(d,p),a=q.u(1),c=q.u(1),n=q.u(4);if(a)for(let j=0;j<4;j++)q.s(n);if(c)for(let j=0;j<4;j++)q.s(n);p=q.end();}if(flags&16)p+=2;if(flags&32){const end=d.indexOf(0,p);o.name=d.subarray(p,end).toString();p=end+1;}display[depth]={...o,depth};}
 else if(t.code===28)delete display[d.readUInt16LE(0)];else if(t.code===43)label=d.subarray(0,d.indexOf(0)).toString();else if(t.code===1){frames.push({frame,label,objects:Object.values(display).map(o=>({...o,className:classes[o.symbol]}))});frame++;label=null;}}
 return {fps,frames,counts};
}
module.exports={readTimeline};if(require.main===module){const data=readTimeline();console.log(JSON.stringify({fps:data.fps,frames:data.frames.map(f=>({frame:f.frame,label:f.label,objects:f.objects.filter(o=>o.name&&o.name.startsWith('__id'))})),counts:data.counts},null,2));}
