# 稳定性扫雷 · 2026-10-17

## 复跑

- `node tools/test-core.cjs`：82/82，原有60项 + 新增22项（21项在修复前源码上失败，另1项验证特殊细胞仍须手动发射）。
- `node tools/test-browser.cjs`：真实Chrome，430×932 / 1280×800，全部25关+沙盒、触摸圈选、封锁、特殊手动发射、第一关胜利；18张截图。
- `node tools/sim-sweep.cjs`：25关 × 3难度 × mixed/easy/normal/noob = 300局，每局上限300秒游戏时间，固定25fps；可追加输出JSON路径。

mixed按现有阵营依次配置Normal/Easy/Noob；不更改地图阵营、数值或规则。所有AI决策间隔统一为3000ms以增加压力，保留Easy/Noob的随机抖动。每局seed由关卡、难度、配对确定，JSON保留首个异常的时间、细胞ID、末态和特殊发射次数。三/四方对战会在玩家失败后继续，直到真正只剩一个阵营；不把UI的“玩家失败=2”误当成阵营2获胜。

## 汇总

| 指标 | 修复前 | 修复后 |
|---|---:|---:|
| 无引擎异常 | 230 | 300 |
| 有引擎异常 | 70 | 0 |
| 特殊细胞就绪后长期不发射 | 70 | 0 |
| NaN/Infinity / 负能量 / 硬卡死 | 0 / 0 / 0 | 0 / 0 / 0 |
| 300秒内真正决出胜者 | 120 | 165 |
| 到300秒尚未分胜负 | 180 | 135 |
| 其中末45秒无新命令 | 28 | 3 |

“无异常”**不等于**“300秒内全部打完”。修复后135局超时里，132局末45秒仍在交战；另外3局是第4关三个难度的Noob镜像，敌我距离超过其原有250px攻击范围。为保留Noob规则没有扩大其射程，不能宣称这3局能够自动收官。主动对称交战也不靠强制判胜结束。

硬卡死判据：无大单位/mini在途，所有存活方都无法合法派兵，且没有可恢复的正常产能/满电充能，持续10秒。特殊停发判据：有可用目标、同一阵营连续就绪超过60秒。超时另列，不混入这些引擎异常计数。异常以“涉及的局数”计数。

完整报告保留在本机忽略的tmp/sim-baseline-full.json与tmp/sim-final.json；不提交大体积临时战局。修复前通过git show 97d4603a31dffccc6e11ece953e331dcffb14bb1的原始模块在内存加载，未回滚工作区。

## 修复清单（症状 → 根因 → 修法 → 回归测试）

1. **AI清零后永久躺平**：把零兵力当成灭族并永久stopped → 按细胞/在途单位/mini判断是否仍存活，暂时没兵不永久停机。测试：`zero energy owned cell does not permanently stop AI`。
2. **镜像/三方AI选自己或已灭绝阵营**：默认weakSide=1、Noob写死阵营1/2 → 只选现存敌方，排除己方，包含3/4方。测试：`Normal and Easy side1 mirror AI never attacks itself`、`Noob targets side3 and never chooses own cells`、`AI selects existing foe when default side1 was eliminated`。
3. **特殊电池充满但永不发射，或抗体打到己方已免疫细胞**：无普通细胞直接return、Easy/Noob漏掉抗体、Normal优先级饿死特殊/strongFoe混入友方 → 所有活跃AI模式先通过公共派兵API处理就绪特殊细胞，选择有效攻防目标；玩家仍手动发射。测试：`every active AI mode fires ready specials without normal cells`、`ready AI antibody never wastes shot on its own immune cell`。
4. **第4关Normal/Easy有兵却永久没命令；最强细胞被封就放弃其他来源**：整条优先级均不匹配或只尝试一个受封来源 → 两次无命令后，从可派兵细胞选合法目标；不绕过脂肪罩。测试：`Normal and Easy escape level4 long range idle loop`、`idle AI can use unblocked second strongest source`。
5. **Noob残局永远忽略最后一个特殊细胞；最强来源太远就不尝试较弱近源**：只看普通目标和最强来源 → 扫描250px内可用来源，允许攻击敌方特殊细胞。测试：`Noob finishes last enemy special instead of ignoring it forever`、`Noob uses nearby weaker source when strongest is out of range`。
6. **在途抗体/脂肪仍可翻盘却已判胜负；最后空特殊细胞永不胜利**：特殊单位power=0被胜负统计忽略，胜利额外要求能量>0 → 按全部在途单位及有效mini判断存活，清场后单方拥有空细胞也胜利。测试：`special flight prevents premature player defeat and victory`、`last empty special wins once no hostile force survives`。
7. **组装中来源被占还偷扣新主兵力**：取消分支未结束，wanted=power后仍最少扣1 → 有载荷则结束组装直接飞行，无载荷取消。测试：`partial assembly stops debiting after source capture`。
8. **组装途中落下敌方脂肪罩仍继续出兵**：只在下单时检查封锁 → 组装每帧复核，取消并退回尚未离开的载荷。测试：`hostile fat arriving during assembly cancels and refunds packet`。
9. **特殊细胞易主后沿用旧主读条**：loading/timer没清零 → 易主先重置，再按新升级容量重新充能。测试：`special capture restarts charge timer with new owner capacity`。
10. **非法能量可传播NaN/Infinity并破坏后续状态**：初始化和setPower缺少有限数验证 → 非有限/负数归零，派兵拒绝非法side/percent。测试：`nonfinite and negative energy cannot poison state`。批量战局未出现天然非有限数；这是可复现的API边界防护，不冒充扫到的随机数值异常。
11. **手机目标点到自己；缺失pointermove时拖动变点击**：逆数组顺序选扩大触控区、pointerup不更新位移 → 实际细胞体优先，再按归一化距离；结束点也计位移。测试：`touch target body wins over friendly expanded hit halo`、`touch release displacement counts even without pointermove event`。
12. **特殊就绪选中圈与读条/充能圈混在一起**：状态圈占相近半径且选中圈夹在中间 → 充能内圈、读条外圈、选中最外圈，与脂肪/抗体状态分离。测试：`special selection stays distinct from charge and loading rings`、`selected special ring never strikes through its status labels`；`ready special is selected by touch then fires manually`保留手动流程。
13. **矮屏/横屏画布报负半径，停止刷新**：上下固定预留高度超过屏幕、内圈半径可为负 → 预留随高度缩小，圈半径下限0.5px。测试：`short landscape viewport retains positive camera and canvas radii`。

另将Chrome测试启动时DevToolsActivePort的Windows短暂文件锁纳入等待重试，避免验证脚本偶发EBUSY。
