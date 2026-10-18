'use strict';const r=require('./ppo2-quarter-results.json');console.log(JSON.stringify({config:r.config,duel:r.evaluation.byMap[1],overall:r.evaluation.winRate,trainSeconds:r.trainedSeconds}));
