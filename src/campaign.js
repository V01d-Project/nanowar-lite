/* Session-only campaign economy. Game.as:40,47-50,2292-2312. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./levels.js'));else root.NanoCampaign=factory(root.NanoCore,root.NanoLevels);})(globalThis,function(Core,Levels){
'use strict';
const keys=['speed','time','shield','special'],tutorials=[1,2,3,4,9,19],difficulties=[0,1,2];
// 默认发放：原版全部非教学关卡 × 三个难度首次通关的升级点。
function rewardTable(){const out={};for(const k of Object.keys(Levels.levels)){const n=Number(k);if(!n||tutorials.includes(n))continue;const d=Levels.levels[n];if(!d||!d.enemyUpgrades)continue;for(const df of difficulties)out[n+':'+df]=(d.enemyUpgrades[df]&&d.enemyUpgrades[df].reward)||0;}return out;}
function create(options){const pregrant=!options||options.pregrant!==false;const completed={},table=rewardTable();let points=0;if(pregrant)for(const id in table){completed[id]=true;points+=table[id];}return {points,upgrades:{speed:0,time:0,shield:0,special:0},completed};}
function cost(c,key){if(!keys.includes(key)||c.upgrades[key]>=4)return null;return Core.UPGRADES[key+'Upg'][c.upgrades[key]+1];}
function buy(c,key){const price=cost(c,key);if(price===null||c.points<price)return false;c.points-=price;c.upgrades[key]++;return true;}
function award(c,level,difficulty){const d=Levels.levels[level],id=level+':'+difficulty;if(!level||!d||c.completed[id])return 0;c.completed[id]=true;const reward=tutorials.includes(level)?0:d.enemyUpgrades[difficulty].reward;c.points+=reward;return reward;}
return {create,cost,buy,award,tutorials};
});
