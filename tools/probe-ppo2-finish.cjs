'use strict';
const fs=require('fs'),P=require('./train-ppo2-finish.cjs');const base=process.argv[2]||'tools/ppo-v2-pilot-checkpoint.json',m=JSON.parse(fs.readFileSync(base)),w=Float64Array.from(m.weights);const es=Array.from({length:180},(_,i)=>P.episode(w,i,3700000501,false,m.config));console.log(JSON.stringify({games:m.trainedGames,...P.stats(es)}));
