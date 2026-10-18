# PPO2 development experiments

All use development base3700000501/180greedy games, not final3x500. Warm start10k, actual game engine unchanged.

- pilot4096:58features,draw-4,time-.02,duel2048then buggy modulo mixer (maps2/5/8 absent); failed duel0/20. Superseded not final.
- explore8192:actor scale.25,entropy.08,correct all-map mixer.
- expansion10000:same plus affordable neutral action reward+.18,single-base enemy attack-.12.
- features10000:62features(remaining power,projected margin,incoming source threat,neutral affordability),actor.7,entropy.04.
- residual10000:features plus explicit tactical logit prior(no forced actions),expansion/single-base attack bias. NOT pure neural PPO.
- conservative10000:residual plus50% neutral dispatch preference.
- quarter10000:add25% legal dispatch.
- finish10000:features plus small-force50% enemy-dispatch prior(+2 when source<24). NOT pure neural PPO.

No final holdout seeds observed before final variant selection. Report these trials including failed ones; do not present engineered residual as learned-only improvement. All output prefixes distinct.
