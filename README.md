# Nano War Lite

无构建、无 npm 依赖的静态网页：[开始游戏](https://v01d-project.github.io/nanowar-lite/)。

玩法致敬 Benoit Freslon 的 *Nano War 2*（2011）。本项目不分发原作素材或反编译产物。许可：MIT。

手指画圈 / 鼠标拖框选中多个自己的普通细胞；也可点选单个细胞。再点任意其他目标，从每个选中细胞派出 50% 兵力。特殊细胞不可选中，只能接收兵力充能。

## 固定基座

- `index.html`：仅页面结构与脚本装配。
- `src/core.js`：纯逻辑 UMD 模块，可由浏览器或 Node 直接加载；不读 DOM、真实时间、随机数、屏幕尺寸。
- `src/ai.js`：只通过内核公开派兵接口下达命令；会抢特殊细胞、给己方特殊细胞充能、增援受威胁细胞。
- `src/render.js`：只读取状态绘制；窗口尺寸不改变战斗与飞行时间。
- `src/input.js`：鼠标框选、触屏闭合圈选、点选与目标命令；特殊细胞永不作为出兵源。
- `src/app.js`：时钟、生命周期、HUD 装配。原始 dt 限制为 0–50ms，倍速后再拆为最多 50ms 的逻辑步；后台暂停，不追赶离线时间。
- `src/style.css`：布局及触屏系统菜单/选区抑制。

## 规则约定

1. 普通细胞上限 100；每次产一个兵，产兵间隔按当前能量从 3.2 秒线性缩短到 1 秒。中立细胞及特殊细胞不自然产兵。
2. 普通细胞派一半整数兵力；每个兵独立飞行/命中，发射间隔 65ms。因此抗体吸收每次命中恰好 +1，而非一次吞下一整队。
3. 脂肪/抗体细胞充满 100 后分别读条 8/12 秒，自动攻击最近的异阵营目标；发射后清空。脂肪不能攻击特殊细胞。青环是充能，外侧金环是发射进度。
4. 脂肪依次拆抗体、上罩或拆其他阵营的罩；敌方脂肪罩阻止出兵，但不停止产兵。
5. 抗体仅在没有罩或罩属攻击方时生效；普通目标被感染后能量保留、获得抗体，兼容脂肪罩保留。普通攻击被抗体逐兵吸收，上限仍为 100。
6. 特殊细胞所有权改变时，电池和读条清零（包括抗体感染的特殊目标）；普通目标抗体感染仍保留能量。
7. 胜负采用“普通基地消灭”：某方没有普通细胞、也没有可反攻的在途普通兵即失败。中立普通细胞及任何特殊细胞不阻止胜利；双方都没有则平局。不会因中立特殊细胞卡局，也不在最后一队普通兵尚在飞行时过早结束。

## 自动验证

需要 Node 22+；核心测试不需要浏览器：

    node tools/test-core.cjs

26 项确定性回归覆盖普通产兵、充满读条、脂肪上/拆罩/拆抗体、抗体感染与逐兵吸收、脂肪封锁、占领重置、特殊充能、AI、dt、胜负以及重复 120 秒模拟一致性。

Chrome 浏览器集成测试：

    node tools/test-browser.cjs

默认使用 Windows 标准 Chrome 路径；其他系统通过 CHROME_PATH 环境变量指定可执行文件。脚本临时启动本地静态服务器和 Chrome，使用 Node 自带 WebSocket/CDP，无第三方依赖。两组 Chrome 参数包含：

    --headless=new --disable-gpu --hide-scrollbars --window-size=430,932
    --headless=new --disable-gpu --hide-scrollbars --window-size=1280,800

同时设置精确 viewport；检查 HUD/细胞环无重叠、无裁切、资源齐全、无 JS 异常，以及己方特殊细胞充能、脂肪阻止派兵、闭合触屏圈选、contextmenu 与 touch-action。每个尺寸保存 initial 和 rings 两张截图到 tools/shots/。rings 为确定性可视化测试夹具，不改变游戏开局。

最近本地验收：

    PASS 26/26 core + AI tests (0 dependencies)
    PASS 430x932: layout, friendly charge, fat block, closed touch lasso, context menu, ring screenshots; no JS errors
    PASS 1280x800: layout, friendly charge, fat block, closed touch lasso, context menu, ring screenshots; no JS errors
    PASS browser verification (2 viewports, 4 screenshots)

GitHub Actions 在 push/PR 时执行同样的内核回归。反编译产物仅保留在本机，不属于网页发布内容。
