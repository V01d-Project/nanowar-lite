'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),A=require('../src/arena.js');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const counts=[2,3,4].map(n=>({seats:n,maps:A.names.slice(3).map((name,i)=>({name,cells:A.map(i+3,n).length}))}));
for(const c of counts)assert.equal(new Set(c.maps.map(m=>m.cells)).size,6);
require('./test-net-maps.cjs').pure();
const report={passed:true,counts,sourceHashes:Object.fromEntries(['src/core.js','src/ai.js','src/arena.js','src/arena-maps.js'].map(f=>[f,hash(f)])),rootCause:'Hive lacked center antibody: 2*10 =20 cells collided with double corridor20; for3/4 seats likewise30/40. Existing external source diff adds true center antibody:21/31/41. No tests changed, no src modifications by PPO worker.'};
fs.writeFileSync('tools/ppo-v2-map-regression.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
