# Nano War PPO2 — current handoff

**Not accepted / blocked by map-catalogue identity regression.**

## Latest requester correction
Parent removed mirror duel on requester instruction7257. This worker did not restore it,edit game/server,commit,push or integrate PPO. All own training/watch processes stopped.

## Concrete blocker
src/arena-maps.js moved mirror expansion index2→1,but src/arena.js still uses halves[level] and level===1 sector branch. Arena.map(1,2)now returns the old duel(base240,240),not original expansion(base120,160). Therefore the8-map labels do not represent8 intended layouts. tools/audit-map-catalogue-identity.cjs fails strictly. Parent must repair game-map lookup under map-removal task; this optimizer is limited to tools/.

## Frozen3x500 measured results on current actual catalogue
|base|W/L/D|win|draw|map gate|
|---|---|---:|---:|---|
|3100000701|463/0/37|92.60%|7.40%|false|
|3300000901|455/2/43|91.00%|8.60%|false|
|3500001101|462/2/36|92.40%|7.20%|false|

|current map label|games|W/L/D|win|draw|
|---|---:|---|---:|---:|
|镜像实验场|189|189/0/0|100.00%|0.00%|
|镜像扩张|189|69/4/116|36.51%|61.38%|
|开阔前哨|189|189/0/0|100.00%|0.00%|
|星环回廊|189|189/0/0|100.00%|0.00%|
|十字枢纽|186|186/0/0|100.00%|0.00%|
|双线走廊|186|186/0/0|100.00%|0.00%|
|抗体王座|186|186/0/0|100.00%|0.00%|
|繁星蜂巢|186|186/0/0|100.00%|0.00%|

Overall:1380/1500=92.00%,4losses,116draws=7.73%. The mislabeled expansion is69/189=36.51%,so fail even without the identity issue. Seven other maps100%. Per-group/per-map rates and all actual seeds/indices are recorded in tools/ppo2-current8-1500-results.json and -evaluation.json.

## Model and hyperparameters
Pure learned65D PPO(shared16-unit tanh+learned linear actor residual,1155weights),not hybrid fixed tactical-prior trials. Frozen tempo weights plus inference corrections for friendly-fat production,live minis,and normal-only weak all-in flag. No forced targets,scripted opening,or timeout wins.
Tempo phase10000 extra games after original10k; first4000duel then6000mixed all9 prior maps. Per-step-.02,win+4,loss/draw-4,weak<24normal100%dispatch-.15; potential2cell+.35force+1.2production advantage. PPO clip.2,gamma.99,GAE.95,lr.001,epochs3,batch64,minibatch256,entropy.04,gradient.5,KLstop.025,seed20261019.
Historical9-map development180:168W0L12D=93.33%;duel8/20=40% (not accepted under original gate). Decisive continuation had stronger draw-12 but was stopped after catalogue changed; not delivered as completed training.
Final model tools/ppo2-current8-model.json; inference module tools/train-ppo2-decisive.cjs; evaluation adapter tools/eval-ppo2-current8.cjs. Catalog-safe future trainer tools/train-ppo2-current8.cjs is provided but NOT started. Old9-map training scripts are historical and not current-catalogue entrypoints.

## Time and tests
Tempo training377.09s,final1500 evaluation10.069s,task wall approximately1013.4s including concurrent failed trials,diagnosis,and task update.
Before catalogue removal:core86/86 and PPO237gradient/determinism/feature/schema/seed checks passed. Do not claim old9-map unit loops pass after removal. New strict identity audit currently fails as above.
Original6→5 map-count failure was fixed by resumed sibling:central neutral antibody on hive changes20/30/40 to21/31/41,without weakening tests. FullHTTP/SSE test still had existing server.js:11 compactState(null); no server edits and no whole-suite-pass claim.

## Remaining issues and reproduction
Map identity must be fixed first; then rerun frozen evaluation,not training:
```powershell
node tools/audit-map-catalogue-identity.cjs
node tools/eval-ppo2-current8.cjs
```
Do not equate removing a hard map with fixing PPO. Original duel requirement was superseded by requester map deletion,not achieved by pure PPO. Multiple independent training seeds,3/4player,campaign,upgrades,stronger opponents remain unvalidated.

Weight SHA256:156e0dcdd86d78f13b0ab26bdd2108dca9cd162cce1b6d709d41b57261f36725