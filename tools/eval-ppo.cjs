'use strict';
// Replays the original 500 fixed-seed holdout without learning or model selection.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const P=require('./train-ppo.cjs');
const base=path.resolve(process.argv[2]||'tools/ppo-10k'),model=JSON.parse(fs.readFileSync(base+'-model.json','utf8'));
const original=JSON.parse(fs.readFileSync(base+'-results.json','utf8')),w=Float64Array.from(model.weights),started=Date.now();
assert.equal(model.trainedGames,model.config.games);assert(w.every(Number.isFinite));
const hash=crypto.createHash('sha256').update(Buffer.from(w.buffer)).digest('hex');assert.equal(hash,original.modelSha256);
const results=Array.from({length:model.config.evaluation},(_,i)=>P.episode(w,i,model.config.evalSeedBase,false,model.config));
const expected=JSON.parse(fs.readFileSync(base+'-evaluation.json','utf8'));assert.deepEqual(results,expected);
const report={reproducedExactly:true,games:results.length,modelSha256:hash,evaluation:P.stats(results),elapsedSeconds:(Date.now()-started)/1000};
fs.writeFileSync(base+'-replay.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
