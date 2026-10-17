/* Dedicated 180-degree symmetric PvP maps; never campaign difficulty/AI. */
'use strict';
const Core=require('./core.js');
const names=['镜像实验场','镜像决斗','镜像扩张'];
const halves=[
 [{x:110,y:130,size:100,own:1,u:60},{x:220,y:350,size:80,own:1,u:40},{x:110,y:280,type:'f',own:1,u:100},{x:270,y:100,type:'a',own:0,u:0}],
 [{x:240,y:240,size:100,own:1,u:60}],
 [{x:120,y:160,size:100,own:1,u:60},{x:240,y:120,size:80,own:0,u:15},{x:220,y:320,size:80,own:0,u:15}]
];
function map(level){
 const pairs=halves[level].map(c=>[Object.assign({},c),Object.assign({},c,{x:640-c.x,y:480-c.y,own:c.own===1?2:0})]);
 if(level===0)return [pairs[0][0],pairs[0][1],pairs[1][0],pairs[1][1],{x:320,y:240,size:75,own:0,u:15},pairs[2][0],pairs[2][1],pairs[3][0],pairs[3][1]];
 return pairs.flat();
}
function create(level,upgrades,seed){return Core.createState(map(level),{level,difficulty:0,seed,upgrades:{1:{...upgrades},2:{...upgrades}},ai:[],pvp:true});}
module.exports={names,map,create};
