# Nano War 2 behavior parity audit

This is a clean-room Canvas implementation of numerical rules, not a distribution of Flash code or art. Source citations refer to the local FFDec output under as3/scripts/com/game/ (not committed). No original images, audio, SWF or decompiler files are published.

## Important corrections to the previous Lite/spec assumptions

1. **Production depends on fixed map SIZE, not energy.** WhiteBloodCell.as:53 uses (powerMax - size) / powerMax. Energy only changes the inner graphic size (65-69). The implementation now follows the actual source: size100 gives1000ms, size0 gives3200ms. The interval is an int in milliseconds. Antibody divides it by1.5 with int truncation, then the time upgrade applies (185-195).
2. **Specials do not auto-fire.** SpecialCell.as:121 sets selectable=true when the load finishes. They must be selected and sent at a target. Initially selectable=false (29). Launch subtracts powerMax (186), rather than discarding an overcharge. At exactly full capacity this leaves zero; at150 energy and capacity100 it leaves50.
3. **Local SWF header is25fps, not30fps.** FrameTimer.as:11 also says25. Main.as:20 explicitly declares25fps, and Main.as:490,564 sets stage.frameRate=25. This build deliberately uses the explicitly requested30fps clock: fat240frames=8s and antibody360frames=12s. At the original header rate those are9.6s/14.4s. Therefore this build is NOT wall-clock1:1 with that particular SWF. Unit frame speeds are likewise expressed per requested30fps. This is an explicit compatibility override, not a claim that the original ran30fps.
4. **LevelDesign.as contains upgrade levels only**, not geometry. LEVEL1-3 (6-64) are all zero upgrades for each difficulty. Real map geometry lives in Game symbol330 timeline frames1-3. The included local-only tools/read-map.cjs recovered PlaceObject2 coordinates/scales without exporting any graphics. Game.as:1826/createCell:1348 converts x/y/size to int; e.g. scale0.79998779 becomes size79, not80.
5. **All cell types count toward victory** (Game.as:1986-2044); enemy empty special cells prevent victory. Ordinary packets are not one-soldier dotted streams: they assemble from the source over several frames, fly as a packet and burst into minis on impact.

## Aligned numerical constants and order of operations

| Feature | Values / behavior | Decompiled source |
|---|---|---|
| Ordinary cell | powerMax100, diam88 | WhiteBloodCell.as:43-47 |
| Geometry | collision radius=floor(44*size/100*.83); inner scale=clamp(.5+power/200,.5,1.1); inner hit radius=uint(ray*scale*.95) | Cell.as:14,461-464; WhiteBloodCell.as:65-69 |
| Growth | int(1000+2200*(100-size)/100)ms; one energy per tick; no unshielded neutral growth; over100 decays; hostile fat drains; clamp0..1000 after uint assignment | WhiteBloodCell.as:31-37,51-54,156-201 |
| Antibody growth | interval /1.5; time reduction applied afterward | WhiteBloodCell.as:185-195 |
| Neutral capture bonus | int(25*size/100); ordinary-mini overwrite behavior preserved; neutral antibody infection keeps the bonus | WhiteBloodCell.as:80-92; Cell.as:384-410 |
| Dispatch | default50%; source energy>=2; int(power*percentage/100); split packets every100 | WhiteBloodCell.as:96-143 |
| Assembly | transfer int((wanted-power)/3), minimum1 each frame; source energy removed incrementally | WhiteBloodUnit.as:114-156 |
| Ordinary packet | vmax2.3+2.7*power/100, vmin.6, acceleration.5, slowdown.94; scale clamp(.25+.75*power/100,.25,1); ray=int(11.5*scale) | WhiteBloodUnit.as:17-25,33-40,78-96 |
| Speed upgrade | vmax and acceleration multiplied by(1+upgrade); slowdown reduced by slowdown*upgrade/3 | WhiteBloodUnit.as:92-96 |
| Pulse flight | acceleration added twice each accelerating frame; coast until vmin then reacquire heading | Unit.as:259-288 |
| Collision | integer distances, cell ray+packet ray; non-target displacement1/1.5; fat bounce3.5+velocities; attenuation.85 | Unit.as:18-20,326-333,379-449,517-543 |
| Unit lifetime |60seconds, source timer500ms decrements.5 | Unit.as:22,185-199 |
| Fat packet | vmax3, vmin.8, acceleration.5, slowdown.94, ray18 | FatUnit.as:13-19 |
| Antibody packet | vmax3.3, vmin.8, acceleration.5, slowdown.96, ray18 | AntibodyUnit.as:13-18; SpecialUnit.as:13 |
| Special collision | non-target ray sum; target impact distance<int2 rather than outer edge | SpecialUnit.as:30-50 |
| Minis | initial randomized burst, slowdown.83; home acceleration1 to max10; shield check ray*1.2 then power hit at ray2; bounced lifetime20frames | WhiteBloodUnitMini.as:34-44,83-140,159-186 |
| Special cells | ray24, ray2=15, capacity100*specialUpgrade, unselectable until ready | SpecialCell.as:26-29,61-64,121 |
| Loading |fat240frames; antibody360frames; interrupted if power drops under capacity | FatCell.as:27; AntibodyCell.as:27; SpecialCell.as:35-55,99-111 |
| Fat effects | hostile antibody removal first; else apply shield; else remove different-side shield; identical shield unchanged; hostile shield blocks ordinary dispatch | Cell.as:312-319,413-440 |
| Fat restrictions | cannot target either special-cell class; FatCell ignores incoming fat | FatCell.as:40-52 |
| Infection | no hostile fat or fat matching attacker required; set antibody, switch allegiance, retain energy; matching fat retained | Cell.as:442-457,556-575 |
| Normal minis | friendly or antibody +1, else -1; zero becomes neutral, negative becomes enemy with abs(power) | Cell.as:384-410 |
| Shield filtering | every ceil(shieldUpgrade*10)th foreign mini penetrates; non-hostile hits also update/reset hit counter as source does | Cell.as:373-381 |
| Packet infection | antibody unit converts enemy ordinary packet, retains packet energy | WhiteBloodUnit.as:203-215 |
| Victory | total cell power+packet power and ownership of ALL cell types; wait for minis; zero-power owned cell keeps side alive | Game.as:1986-2044 |
| Difficulty | enemy normal initial energy*1.5 or*2, int truncated | Game.as:370-372,1393-1404 |
| Speed levels |[0,.04,.12,.18,.25] | Game.as:43 |
| Time levels |[0,.02,.06,.09,.12] | Game.as:44 |
| Shield levels |[.4,.45,.5,.55,.6] | Game.as:45 |
| Special levels |[1,.95,.9,.85,.8] | Game.as:46 |
| Upgrade costs |speed/time[0,3,4,6,7], shield/special[0,4,5,7,8] (tables available, purchasing not implemented) | Game.as:47-50 |
| AI |Normal priority chain: weak-side attack, large-cell reinforcement, antibody investment/launch, fat investment/launch, combined attacks and neutral expansion; same80/75/85/100% orders and250/300/350distance thresholds | ai/Normal.as:17-167 |
| AI scheduling |initial1000ms delay; default5000ms becomes125frames via FrameTimer25fps, then repeated; Normal does NOT call super.decision(), so no random jitter is added | Game.as:1278; ai/AI.as:17,101-105,429-432; com/my/FrameTimer.as:11,34-37 |

SpecialUnit.as:25-28 assigns _power=power (the getter), not the setter parameter. Consequently special-unit statistical power stays0; this source quirk is retained. Another retained quirk: a hostile fat drain at zero wraps the uint before the0..1000clamp and yields1000 (WhiteBloodCell.as:198-201, Cell.as:477-480). These are intentionally covered by tests rather than silently corrected.

## Original maps1-3

- L1: enemy(421,131,size64,power1); player(247,131,size100,power30).
- L2: enemy(461,124,size80,power20); player(175,135,size79,power20); neutral(286,67,size100,power5).
- L3: enemy(334,112,size64,power100); four players(257,57),(405,57),(410,162),(263,160), each size79,power26.
- Starting fields: Game.as:2480-2556,2910-2986,3248-3298,3612-3662. Timeline symbol330 provides positions/scales.
- These are tutorial levels and their timelines have NO AI instances. No invented enemy AI was inserted. A separately labeled, hand-designed mechanism sandbox exposes both special types and Normal AI.
- Registry in src/levels.js supports additional levels without changing core/render/input.

## Remaining gaps / limits (do not call this a complete1:1 port)

- Requested30fps rather than the25fps local SWF header; source frame-based timing is sped up accordingly. No selectable original25fps mode yet.
- Flash ENTER_FRAME event/display-list order and9-tile collision traversal are not fully recreated. This engine uses a deterministic per-frame all-pairs collision pass once per pair, so crowded packet trajectories/bounces can diverge. Source packet lifetime explosion becomes removal rather than a visual mini explosion.
- Source Timer callbacks are quantized to simulation frames, not Flash real-time Timer dispatch. Fast-forward speeds all simulation systems uniformly; original Game's coefSpeed and Flash timers need not scale identically.
- Seeded LCG replaces Flash Math.random; random distributions match but random sequences cannot be identical. Mini bounce fades and non-counting production/death particles are omitted.
- Original animation inertia/blob deformation, audio, tutorials, camera pans, multiplayer, achievements, campaign save/progression and scoring are not reproduced. All art is newly drawn; originals are not used.
- Upgrade effects/tables and difficulty initial-power effects work, but the dialog is a free rule-experiment selector, not the original point-cost purchase/progression screen.
- Only Normal AI is ported; Easy and other variants are not. First3original tutorial levels have no AI, sandbox does. AI null targets are safely ignored rather than causing Flash-style null errors. The original cellsSide(side,false) helper accidentally includes friendly cells too; this quirk is retained, including possible self-target no-op branches.
- Browser controls provide click/drag, box/lasso and25/50/75/100% buttons rather than the original hold-to-adjust percentage UI/Shift selection.
- First3maps only. Sandbox is explicitly NOT an original level.

## Verification

Run node tools/test-core.cjs (47tests) and node tools/test-browser.cjs (Chrome CDP, no npm dependencies).
Browser suite checks430x932 and1280x800, all4maps, cell/ring clipping and overlaps, touch closed lasso, friendly charging, fat blockade, manual special launch and level1play-through to victory. Screenshots are local tools/shots/* and are not original artwork.
