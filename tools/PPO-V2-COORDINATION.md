# PPO v2 coordination

The retained original child (5b751ef4) was resumed by sessions_send, while the parent also spawned a second active optimizer (94823014). Avoid concurrent edits to the same trainer. The second optimizer owns the full training/evaluation run.

## Completed map repair
- Branch: experiment/ppo-duel-v2 (no commit/push).
- The failing assertion is tools/test-net-maps.cjs line 40: counts.size must equal 6 across the six new layouts.
- Duplicate counts: 双线走廊 and 繁星蜂巢 both have 10 cells/sector, giving 20/30/40 cells for 2/3/4 seats.
- src/arena-maps.js: 繁星蜂巢 now has a neutral central antibody. Counts become 21/31/41, while 双线走廊 remains 20/30/40. Symmetry, bounds, non-overlap, upgrades, AI modes and all six-distinct-count assertions pass unchanged.
- No test assertions, game engine/rules or server code edited.

## Newly exposed blocker
- Full node tools/test-net-maps.cjs passes the pure catalogue section, then crashes in the existing server compactState(null) path (server.js:11; packet -> broadcast -> detach -> IncomingMessage close).
- The current task prohibits editing server, so this remains a reported blocker. Do not claim the complete HTTP/SSE test passed.

## Duel diagnosis
- Replayed the original frozen greedy policy on mirror duel, seed 12345. It launches 100% at the opposing starting normal cell from the first turn.
- Around 36s the two initial bases swap ownership. The policy then continually sends tiny 100% packets between those same two bases (own 5 vs enemy 3 at the logged decision points) through 180s; all eight neutral cells remain untouched.
- This is not antibody immunity: all cells in the trace have antibody=false, fat=-1. It is an all-in base-trading loop with no economic expansion.
- tools/audit-ppo-v2.cjs reproduces the counts and detailed trace.

## File collision resolved
- Another worker created tools/train-ppo-v2.cjs while this resumed child was preparing a file of the same name. The collision was detected immediately from write.created=false.
- Its original trainer body has been restored (duelGames=3000, timeCost=.02, original 58-dimensional inputs, warm init flag). No training command was launched here.
- An unexecuted alternative was preserved under tools/train-ppo-curriculum-alt.cjs so it cannot overwrite the active trainer. It adds 8 action safety/production features, corrects friendly-fat production and mini force counts, warm-copies old weights, and proposes 2000 duel + 8000 mixed games with terminal +/-6 and draw -6, per-turn -.015. This is only a prototype, not a measured result.

Next: the active second child should train/evaluate its final frozen policy on three fresh fixed 500-game seed groups; report overall and per-map rates with the minimum-map >=50% gate.