# PPO campaign v2 experiment

CORRECTION: first full20k run is invalid for level19: authored ai:[] meant no enemy brain. Results remain for traceability but not final claims. Fixed trainer derives Normal brains from all present enemy sides, preserving authored timing if present and falling back to default5000ms. Level19 regression proves25 Normal calls/1s. Full20k restarted from initialization with corrected prefix ppo-campaign-v2-20k-fixed-*; runner/direct defaults now fixed prefix. Final report is ppo-campaign-v2-20k-fixed-report.md.

This task writes only tools/. Existing dirty README.md, src/ai.js, src/arena-maps.js, screenshots and other experiment files predate this task and are not reverted or committed.

Scripts: train-ppo-campaign-v2.cjs, eval-ppo-random.cjs, ppo-legacy-inference.cjs (unchanged old math, no worker registration), test-ppo-campaign-v2.cjs, run-ppo-campaign-v2.cjs.

Commands:
- node tools/test-ppo-campaign-v2.cjs
- node tools/run-ppo-campaign-v2.cjs
- node tools/run-ppo-campaign-v2.cjs --resume

Smoke: 200 training games (10 each level), 20 campaign eval, 12 games each random mode completed successfully; smoke is not final strength evidence. Full pipeline is distinct ppo-campaign-v2-20k prefix. Full training uses random initialization, not old-model warm start. Original campaign difficulty0 upgrade rows retained, no harder difficulty upgrades; enemy normal cells x2 manually. Enemy Normal keeps campaign timeDecision intervals. v2 first action time0 then 5s.

Random evaluation uses 2–4 independent sides. Side1 new model, side2 old/Normal, optional 3/4 independent Normal. All enemy ordinary initial cells x2 in Normal mode; no multiplier in old mode. Report includes side-count breakdown, so FFA is explicit. Old model uses exact old candidate construction, features, forward/distribution and greedy action; no retraining. A player eliminated before 400s is loss; a still-alive timeout is draw; only sole survivor is win.

Resume restores Adam moments, step, RNG shuffle state, weights, summaries, curriculum and elapsed time. Checkpoints at exact multiples of 512 training games plus each level end. Runs inside one level are parallel minibatches; levels remain serial.
