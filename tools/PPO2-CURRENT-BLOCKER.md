# Parent handoff: removed duel persists under expansion name

Requester7257 removed镜像决斗; I did NOT restore it or edit src. Currentsrc/arena-maps.js has8names,镜像扩张 moved from index2 to1. But src/arena.js still uses halves[level] and its level===1 3/4-seat sector branch. Thus current镜像扩张 actually builds the OLD DUEL(bluebase240,240),rather than original expansion(bluebase120,160). This is confirmed from current actualArena.map plus source,not an AI hypothesis.

Run node tools/audit-map-catalogue-identity.cjs to reproduce strict failure. Fix arena.js classic lookup using stable definition ID/name,or remove matching halves/sector mapping as part of map removal; test-net-maps level>=3 threshold also needs updating to>=2 to include ALL six new sector maps. No assertion weakening needed for identity.

Own old9-map continuation and final watcher stopped; no running PPO processes remain. Frozen pure65D tempo model complete(10kextra,377.09s),weights156e0dcdd86d78f13b0ab26bdd2108dca9cd162cce1b6d709d41b57261f36725. Current8 adapter3x500 completed:1380W4L116D(92.0%,draw7.733%),but mislabeledexpansion69/189=36.51%wins/61.38%draw; seven other maps100%. Therefore NOT accepted,do NOT present this as valid8-map pass.

Artifacts tools/ppo2-current8-1500-results.json,tools/ppo2-current8-1500-evaluation.json,tools/eval-ppo2-current8.cjs,current8modelJSON. Inference uses pure learnedweights+correct friendly-fat/minis observation (no tactical priors). After source identity fix,re-run same frozen eval adapter; no new training needed to get valid currentmap measurement.
