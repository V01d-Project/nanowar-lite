# Nano War · 源码规则版

[直接玩](https://v01d-project.github.io/nanowar-lite/) · 无构建、无 npm 依赖的静态 Canvas 游戏。

按 Nano War 2 的反编译行为和数值重新实现；不分发原作代码、美术、音效、SWF 或反编译器。画面均为 Canvas 自绘。

## 操作

- 点选蓝色细胞，再点目标；也可直接拖到目标。
- 鼠标框选、触屏闭合圈选；A 全选、空格取消选择。
- 派兵按钮切换25/50/75/100%。普通兵先在母细胞内组装，再飞行，命中后分裂为逐兵结算的小兵。
- 特殊细胞送兵充能，脂肪读条9.6秒/抗体14.4秒（25fps）；**就绪后手动选择目标发射**，不再自动寻敌。
- 原版25关可切换；机制沙盒包含脂肪、抗体和 Normal AI，明确非原版关卡。
- 升级面板按通关获得的点数购买原版0–4级升级；点数和通关记录仅保留在当前页面会话，刷新后重置。

## 与旧 Lite 的关键差别

产兵间隔按固定地图尺寸(size)插值，不按当前能量；100是产兵软上限，增援可超过100；敌方脂肪罩还会使能量衰减；特殊细胞也计入胜负；抗体感染保留特殊电池能量。

**帧率说明：**模拟使用原始SWF的25fps，240/360帧对应9.6/14.4秒。完整数值、出处与历史对齐审计见[PORTING.md](PORTING.md)；本轮稳定性修复和批量模拟结果见[BUGSWEEP.md](BUGSWEEP.md)。

## 分层

- src/core.js：纯逻辑、固定25fps、种子随机、单位和mini碰撞；不接触DOM。
- src/levels.js：地图注册表和初始数据。
- src/ai.js：原版Normal优先级，只经公共派兵接口下单。
- src/render.js：只读Canvas；保持世界空间比例，窗口不会改变模拟数值。
- src/input.js：选取和Pointer适配。
- src/app.js：DOM、生命周期、计时器装配。

## 验证

    node tools/test-core.cjs
    node tools/test-browser.cjs
    node tools/sim-sweep.cjs

核心82项零依赖测试；Chrome headless自动检查430×932、1280×800，包含全部25关和沙盒的布局、充能、封锁、触摸圈选、特殊手动发射，以及第一关可通关。共18张截图写入tools/shots/。离线sweep覆盖25关×3难度×4种AI配对，每局最多300秒游戏时间，完整JSON默认写入tmp/sim-sweep.json。Windows Chrome默认路径可用CHROME_PATH环境变量覆盖。

反编译资料仅留本地，.gitignore排除；提交清单不包含它们。详见[完整对齐审计与缺口](PORTING.md)。
