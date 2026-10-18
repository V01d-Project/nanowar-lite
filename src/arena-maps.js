/* Shared static catalogue: only the server builds/simulates arenas. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NanoArenaMaps=factory();})(globalThis,function(){
'use strict';
const definitions=[
 {name:'镜像实验场',description:'经典成对脂肪与抗体实验场'},
 {name:'镜像扩张',description:'经典主基地与双中立点'},
 {name:'开阔前哨',description:'稀疏小规模：长距离交战与低成本前哨',sector:[
  {x:196,y:0,size:94,own:1,u:58},{x:86,y:0,size:50,own:0,u:8},{x:44,y:0,size:34,own:0,u:6},
  {x:140,y:110,type:'f',size:100,own:0,u:0},{x:70,y:-95,type:'a',size:100,own:0,u:0}]},
 {name:'星环回廊',description:'四段中立环带，沿环扩张与侧袭',center:{type:'a',size:100,own:0,u:0},sector:[
  {x:211,y:0,size:82,own:1,u:62},
  ...[-36,-12,12,36].map(deg=>({x:150*Math.cos(deg*Math.PI/180),y:150*Math.sin(deg*Math.PI/180),size:42,own:0,u:11}))]},
 {name:'十字枢纽',description:'双基地轴向推进，十字支路汇入中央',center:{type:'f',size:100,own:0,u:0},sector:[
  {x:202,y:0,size:90,own:1,u:55},{x:142,y:0,size:55,own:1,u:24},
  {x:76,y:0,size:48,own:0,u:12},{x:110,y:55,size:38,own:0,u:9},{x:110,y:-55,size:38,own:0,u:9},{x:172,y:70,size:42,own:0,u:17}]},
 {name:'双线走廊',description:'分兵双基地，内外两线争夺；无地形硬墙',sector:[
  ...[-1,1].flatMap(sign=>[
   {x:193,y:sign*63,size:68,own:1,u:45},{x:128,y:sign*63,size:46,own:0,u:13},
   {x:78,y:sign*32,size:35,own:0,u:5},{x:160,y:sign*105,size:34,own:0,u:8}]),
  {x:140,y:0,type:'f',size:100,own:0,u:0},{x:40,y:0,type:'a',size:100,own:0,u:0}]},
 {name:'抗体王座',description:'绕过双侧哨点，抢占唯一中央抗体',center:{type:'a',size:100,own:0,u:0},sector:[
  {x:202,y:0,size:98,own:1,u:68},{x:123,y:42,size:58,own:0,u:20},{x:123,y:-42,size:58,own:0,u:20}]},
 {name:'繁星蜂巢',description:'三基地密集群岛，大量小型中立点与外缘脂肪',center:{type:'a',size:100,own:0,u:0},sector:[
  {x:208,y:0,size:52,own:1,u:42},{x:174,y:74,size:38,own:1,u:22},{x:174,y:-74,size:38,own:1,u:22},
  {x:112,y:0,size:40,own:0,u:16},{x:106,y:62,size:28,own:0,u:7},{x:106,y:-62,size:28,own:0,u:7},
  {x:64,y:24,size:28,own:0,u:4},{x:64,y:-24,size:28,own:0,u:4},
  {x:156,y:113,type:'f',size:100,own:0,u:0},{x:156,y:-113,type:'f',size:100,own:0,u:0}]}
];
const names=definitions.map(d=>d.name);
function symmetry(count){return count+' 方 · '+(360/count)+'°旋转对称（含中立点） / 同等能量与升级';}
return {definitions,names,symmetry};
});
