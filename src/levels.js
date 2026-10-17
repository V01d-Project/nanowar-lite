/* Campaign registry. Geometry, properties, AI and upgrade data are generated from local source. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./levels-data.js'));else root.NanoLevels=factory(root.NanoCore,root.NanoLevelData);})(globalThis,function(Core,data){
'use strict';
const levels=Object.assign({},data.levels,{
 0:{name:'机制沙盒 · 非原版关卡',source:'Hand-designed test arena',ai:[{side:2,timeDecision:5000}],cells:[{x:110,y:130,size:100,own:1,u:60},{x:530,y:350,size:100,own:2,u:60},{x:220,y:350,size:80,own:1,u:40},{x:420,y:130,size:80,own:2,u:40},{x:320,y:240,size:75,own:0,u:15},{x:110,y:280,type:'f',own:1,u:100},{x:530,y:200,type:'a',own:2,u:100},{x:270,y:100,type:'a',own:0,u:0},{x:370,y:380,type:'f',own:0,u:0}]}
});
function create(level=1,options={}){const d=levels[level]||levels[1],difficulty=options.difficulty||0,upgrades=Object.assign({},options.upgrades);const row=d.enemyUpgrades&&(d.enemyUpgrades[difficulty]||d.enemyUpgrades[2]);if(row)for(const side of [2,3,4])upgrades[side]=Object.assign({},row);return Core.createState(d.cells,Object.assign({},options,{level,difficulty,upgrades,ai:d.ai}));}
return {levels,create,totalLevels:data.totalLevels,metadata:data};
});
