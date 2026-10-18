/* Dedicated rotationally symmetric arenas; no campaign resource multipliers. */
'use strict';
const Core=require('./core.js');
const {definitions,names}=require('./arena-maps.js');
function resolveLevel(level,seed){return level===-1?(seed>>>0)%names.length:level;}
const halves=[
 [{x:110,y:130,size:100,own:1,u:60},{x:220,y:350,size:80,own:1,u:40},{x:110,y:280,type:'f',own:1,u:100},{x:270,y:100,type:'a',own:0,u:0}],
 [{x:240,y:240,size:100,own:1,u:60},{x:190,y:150,size:48,own:0,u:12},{x:300,y:170,size:42,own:0,u:8}],
 [{x:120,y:160,size:100,own:1,u:60},{x:240,y:120,size:80,own:0,u:15},{x:220,y:320,size:80,own:0,u:15}]
];
function map(level,count=2){
 if(!Number.isInteger(count)||count<2||count>4)throw RangeError('Invalid player count');
 if(!Number.isInteger(level)||!definitions[level])throw RangeError('Invalid arena');
 const definition=definitions[level];
 if(definition.sector){
  // Build one sector per seat with true world-space rotations, never an ellipse.
  // Seat-major ordering keeps every cell editable without changing simulation rules.
  const cells=Array.from({length:count},(_,i)=>definition.sector.map(c=>{
   const a=Math.PI*2*i/count,cos=Math.cos(a),sin=Math.sin(a);
   return {...c,x:320+c.x*cos-c.y*sin,y:240+c.x*sin+c.y*cos,own:c.own?i+1:0};
  })).flat();
  if(definition.center)cells.push({...definition.center,x:320,y:240});
  return cells;
 }
 if(count>2){
  // A regular polygon in world space: every seat has an isometric rotated sector.
  const sector=level===0?[{x:152,y:0,size:80,own:1,u:60},{x:126,y:68,size:60,own:1,u:40},{x:200,y:74,type:'f',own:1,u:100},{x:82,y:0,type:'a',own:0,u:0}]:level===1?[{x:140,y:0,size:100,own:1,u:60},{x:90,y:62,size:44,own:0,u:10},{x:90,y:-62,size:44,own:0,u:10}]:[{x:140,y:0,size:100,own:1,u:60},{x:85,y:45,size:65,own:0,u:15}];
  return Array.from({length:count},(_,i)=>sector.map(c=>{const a=Math.PI*2*i/count;return {...c,x:320+c.x*Math.cos(a)-c.y*Math.sin(a),y:240+c.x*Math.sin(a)+c.y*Math.cos(a),own:c.own?i+1:0};})).flat();
 }
 const pairs=halves[level].map(c=>[Object.assign({},c),Object.assign({},c,{x:640-c.x,y:480-c.y,own:c.own===1?2:0})]);
 if(level===0)return [pairs[0][0],pairs[0][1],pairs[1][0],pairs[1][1],{x:320,y:240,size:75,own:0,u:15},pairs[2][0],pairs[2][1],pairs[3][0],pairs[3][1]];
 return pairs.flat();
}
function create(level,upgrades,seed,count=2,ai=[]){level=resolveLevel(level,seed);const s=Core.createState(map(level,count),{level,difficulty:0,seed,upgrades:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{...upgrades}])),ai,pvp:true});s.playerCount=count;return s;}
module.exports={names,map,create,resolveLevel};
