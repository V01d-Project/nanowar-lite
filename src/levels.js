/* LevelDesign.as:6-64 contains upgrades ONLY, not map positions.
 * Positions/scales recovered from Game timeline (symbol330, frames1-3), no art exported.
 * Game.as:1826 converts coordinates/size to int. Values below reflect that truncation.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.NanoLevels=factory(root.NanoCore);})(globalThis,function(Core){
'use strict';
const levels={
 1:{name:'初次接触',source:'Game.as:2480-2504,2910-2934; timeline frame1',cells:[{x:421,y:131,size:64,own:2,u:1},{x:247,y:131,size:100,own:1,u:30}],ai:[]},
 2:{name:'扩张',source:'Game.as:2506-2530,2936-2960,3248-3272; timeline frame2',cells:[{x:461,y:124,size:80,own:2,u:20},{x:175,y:135,size:79,own:1,u:20},{x:286,y:67,size:100,own:0,u:5}],ai:[]},
 3:{name:'联合出击',source:'Game.as:2532-2556,2962-2986,3274-3298,3612-3662; timeline frame3',cells:[{x:334,y:112,size:64,own:2,u:100},{x:257,y:57,size:79,own:1,u:26},{x:405,y:57,size:79,own:1,u:26},{x:410,y:162,size:79,own:1,u:26},{x:263,y:160,size:79,own:1,u:26}],ai:[]},
 0:{name:'机制沙盒 · 非原版关卡',source:'Hand-designed test arena',ai:[{side:2,timeDecision:5000}],cells:[{x:110,y:130,size:100,own:1,u:60},{x:530,y:350,size:100,own:2,u:60},{x:220,y:350,size:80,own:1,u:40},{x:420,y:130,size:80,own:2,u:40},{x:320,y:240,size:75,own:0,u:15},{x:110,y:280,type:'f',own:1,u:100},{x:530,y:200,type:'a',own:2,u:100},{x:270,y:100,type:'a',own:0,u:0},{x:370,y:380,type:'f',own:0,u:0}]}
};
function create(level=1,options={}){const d=levels[level]||levels[1];return Core.createState(d.cells,Object.assign({level,ai:d.ai},options));}
return {levels,create};
});
