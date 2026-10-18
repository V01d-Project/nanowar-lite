# Nano War PPO 10k experiment

**Result: PASS**

- Actual training episodes: 10000; maps: all 9; single shared network.
- Fixed-seed frozen holdout: 500 games; 446 wins / 0 losses / 54 draws; win rate 89.20%.
- Descriptive Wilson 95% interval: 86.17% - 91.63%. Fixed maps/seeds are not independent environment samples.
- Training 635.121s; evaluation 0.958s; total 636.094s.
- Both policies decide every 5s, first decision ~6s; no upgrades; 2 seats alternated in 9-map blocks (252/248 holdout games); exact 25fps game engine; 180s cap. Timeouts count as draws, not wins.
- Actor: 58 -> 16 tanh -> scalar per candidate; shared trunk critic on global observation -> scalar; 978 parameters.
- PPO clip .2; GAE gamma .99/lambda .95; Adam lr .0003; rollout batch 64 episodes; minibatch 256 transitions; epochs 3; entropy .015; value .5; grad norm .5; target KL .025; 8 CPU workers.
- Input: 16 global + 42 action features, including force/cell counts, neutrals, time, scale, source/target force/distance/type/ownership, antibody/fat, adjacency, ratios/capture estimate, readiness/loading, incoming force.
- Action space: wait; top 2 legal normal sources separately or grouped; every legal target; 50%/100%; ready specials. No scripted target scoring or automatic special firing.
- Dense potential reward: 1.5 x cell-share advantage + .35 x force advantage + .3 x production advantage; terminal +/-2.
- Greedy final policy is frozen before the holdout; final checkpoint only (no holdout selection).

## Per-map holdout

| Map | Games | Wins | Losses | Draws | Win rate |
|---|---:|---:|---:|---:|---:|
| 镜像实验场 | 56 | 56 | 0 | 0 | 100.00% |
| 镜像决斗 | 56 | 2 | 0 | 54 | 3.57% |
| 镜像扩张 | 56 | 56 | 0 | 0 | 100.00% |
| 开阔前哨 | 56 | 56 | 0 | 0 | 100.00% |
| 星环回廊 | 56 | 56 | 0 | 0 | 100.00% |
| 十字枢纽 | 55 | 55 | 0 | 0 | 100.00% |
| 双线走廊 | 55 | 55 | 0 | 0 | 100.00% |
| 抗体王座 | 55 | 55 | 0 | 0 | 100.00% |
| 繁星蜂巢 | 55 | 55 | 0 | 0 | 100.00% |

## Remaining limitations

- Observed sub-65% maps: 镜像决斗 2/56 wins, 54 draws
- Only 2-player Normal opponents; not validated in 3/4-player games, campaigns, or self-play.
- Restricted top-two-source/action-percent space and 16-unit hidden layer limit coordinated defense and routing.
- Capturable is a local estimate, not a forward simulation; antibody/shield interactions and travel-time growth remain partly implicit.
- 180s timeouts can hide late victories/defeats. Fixed layouts + deterministic Normal provide limited diversity.
- One training seed/run is not evidence of stability across seeds.
- Production features/reward use an unshielded-normal proxy, undercounting friendly-fat growth; force features follow Core.powerBySide (packet energy included, burst minis excluded).
- No paired rerun of the old REINFORCE/CEM baseline under this identical protocol; do not attribute score differences solely to PPO.
- Existing tools/test-net-maps.cjs fails at line 40: distinct new-layout cell counts expected 6, actual 5. This trainer does not edit maps or that test.
- Core regression: 86/86 passed. PPO observation/gradient/determinism tests: passed.

## Reproduce

node tools/train-ppo.cjs --games 10000 --eval 500 --workers 8 --out tools/ppo-10k
node tools/eval-ppo.cjs tools/ppo-10k
node tools/report-ppo.cjs tools/ppo-10k

Artifacts: *-model.json, *-results.json, *-evaluation.json, *-replay.json, *-curve.json/.csv/.svg.
No src/server/game changes; no push; not integrated.