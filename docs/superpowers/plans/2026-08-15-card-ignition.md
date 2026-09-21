# 卡牌爆裂启动实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有 Sekai Game 改造成以真实卡图驱动的三段演出系统：A 首页卡牌爆裂启动、B 卡包过载、C 召唤落场，并让 Godot 本地入口复刻 C 的落场节奏。

**架构：** 保留 `CardGameApp` 的业务路由与对局回调，只替换 `renderHome()` 的首页标记并新增独立的 `card-ignition.js` 动画模块。静态 CSS 采用追加式主题层，避免重排现有对局和收藏样式；Godot 只包装现有 `main.gd` 的决斗入口，不接触规则引擎。

**技术栈：** 原生 HTML/CSS/ES Module、anime.js v4 WAAPI 与 timeline、Godot 4.7 Tween、Node test、Godot headless test。

---

## 文件职责

- 创建：`SekaiGame/src/main/resources/static/js/card-ignition.js` —— Web 启动演出时序、卡包过载、可访问降级和短版落场动效。
- 创建：`SekaiGame/src/main/resources/static/test/card-ignition.test.js` —— 动效时序和卡牌数量纯函数测试。
- 修改：`SekaiGame/src/main/resources/static/package.json`、`package-lock.json` —— 添加 anime.js v4。
- 修改：`SekaiGame/src/main/resources/static/index.html` —— 将认证界面和左侧导航换成卡牌启动语言。
- 修改：`SekaiGame/src/main/resources/static/js/app.js` —— 用真实卡图生成启动舞台，绑定重播、导航和对局入口。
- 修改：`SekaiGame/src/main/resources/static/css/style.css` —— 追加启动场、卡牌飞掠、舞台响应式和 reduced-motion 样式。
- 修改：`SekaiGame/src/main/resources/static/js/main.js` —— 在认证页调用短启动演出，不改变认证流程。
- 修改：`SekaiGameGodot/scenes/main.tscn` —— 增加启动场节点和动画播放器，保留现有 `%` 节点名称。
- 修改：`SekaiGameGodot/scripts/main.gd` —— 播放启动演出后再启动现有 demo duel，增加跳过入口。

## 任务 1：添加可测试的动效时序模块

**文件：**
- 创建：`SekaiGame/src/main/resources/static/js/card-ignition.js`
- 创建：`SekaiGame/src/main/resources/static/test/card-ignition.test.js`

- [x] **步骤 1：编写失败测试**

测试 `getIgnitionTiming()` 返回 `1100ms` 的完整演出、`35ms` 的卡牌间隔和 reduced-motion 的零时长；测试 `selectIgnitionCards()` 最多返回 8 张且不重复卡牌。

- [x] **步骤 2：运行测试验证失败**

运行：`npm test -- --test-name-pattern="card ignition"`

预期：因为模块尚不存在而失败。

- [x] **步骤 3：编写最少实现**

导出 `getIgnitionTiming(reducedMotion)`、`selectIgnitionCards(cards, limit)`、`playCardIgnition(root, options)` 和 `playDuelLaunch(root, options)`；CSS 变换使用 `waapi.animate()`，组合阶段使用 `createTimeline()`，所有动画返回可取消句柄。

- [x] **步骤 4：运行测试验证通过**

运行：`npm test -- --test-name-pattern="card ignition"`

预期：时序和去重测试通过。

## 任务 2：实现 Web 首页启动场

**文件：**
- 修改：`SekaiGame/src/main/resources/static/js/app.js`
- 修改：`SekaiGame/src/main/resources/static/index.html`
- 修改：`SekaiGame/src/main/resources/static/css/style.css`

- [x] **步骤 1：安装 anime.js 并保留现有 `ws` 依赖**

运行：`npm install animejs@^4.0.0`

验证：`package.json` 和 `package-lock.json` 出现 `animejs`，`ws` 仍然存在。

- [x] **步骤 2：替换首页标记**

在 `renderHome()` 中从当前封面、最近拥有卡牌和固定 fallback 卡牌中构造最多 8 张不重复卡图，输出 `data-ignition-root`、主卡、飞掠卡、标题、重播和现有业务按钮；保留 `bindJumpButtons()`、`bindCardDetailClicks()` 和所有对局回调。

- [x] **步骤 3：追加启动场 CSS**

实现舞台黑底、纸张边缘、金色冲击线、卡牌飞掠层、主卡 3D 透视、底部状态坞和移动端 4 卡 fallback；只使用 CSS 负责稳定态，动画交给 `card-ignition.js`。

- [x] **步骤 4：绑定交互**

重播按钮调用完整 1100ms 演出；挑战关卡和练习决斗调用短版落场后再进入现有流程；飞掠卡跳转收藏页；首页首次进入自动播放一次。

- [x] **步骤 5：运行静态检查**

运行：`npm run check`

预期：`main.js`、`app.js`、`ui.js`、`controller.js` 和 `engine.js` 全部通过 Node 语法检查。

## 任务 3：重做认证入口但不改变认证逻辑

**文件：**
- 修改：`SekaiGame/src/main/resources/static/index.html`
- 修改：`SekaiGame/src/main/resources/static/js/main.js`
- 修改：`SekaiGame/src/main/resources/static/css/style.css`

- [x] **步骤 1：把居中空卡片改成启动卡套布局**

添加静态卡套、卡图层和“激活卡组”文案，表单仍使用现有 `#auth-form`、`#auth-username`、`#auth-password`、`#auth-nickname` 和 `#auth-error`。

- [x] **步骤 2：接入短启动演出**

认证页播放 650ms 的卡套入场；切换登录/注册只改变表单状态，不重新请求或改变认证接口。

- [x] **步骤 3：运行页面级语法检查**

运行：`npm run check`

预期：认证入口的新增 import 不产生模块解析错误。

## 任务 4：实现 B 卡包过载演出

**文件：**
- 修改：`SekaiGame/src/main/resources/static/js/app.js`
- 修改：`SekaiGame/src/main/resources/static/js/card-ignition.js`
- 修改：`SekaiGame/src/main/resources/static/css/style.css`

- [x] **步骤 1：保持抽卡业务结果不变**

保留 `openPacks()` 的扣币、保底、保存和服务器同步逻辑，只将 `showPackAnimation()` 和 `showPackResults()` 之间的展示替换为卡包撕开和结果卡甩出。

- [x] **步骤 2：接入稀有度驱动的卡包演出**

以最高稀有度选择 `N/R/SR/SSR/UR` 的主题色；使用 42ms stagger 展示最多 8 张卡，最高稀有度卡延迟到最后，避免覆盖结果文字。

- [x] **步骤 3：提供跳过按钮并验证结果一致**

跳过只结束动画，不改变 `reveals` 数组；同一组结果可以通过“揭晓结果”进入现有结果视图。

## 任务 5：实现 C 召唤落场转场

**文件：**
- 修改：`SekaiGame/src/main/resources/static/js/app.js`
- 修改：`SekaiGame/src/main/resources/static/js/card-ignition.js`
- 修改：`SekaiGame/src/main/resources/static/css/style.css`

- [x] **步骤 1：在对局回调前插入短版落场**

挑战关卡、练习决斗和 PvP 成功入口统一调用 `playDuelLaunch()`，动画完成后只调用一次原有 `onStartDuel`。

- [x] **步骤 2：处理跳过和 reduced-motion**

跳过按钮、设置中的减少动画和系统 reduced-motion 都直接执行完成回调；若回调已执行，后续动画完成事件不得再次创建对局。

- [x] **步骤 3：验证 Web 对局入口**

通过本地登录、合法卡组、练习决斗和挑战关卡，确认进入现有 battle-screen 且对局逻辑不变。

## 任务 6：包装 Godot 本地入口

**文件：**
- 修改：`SekaiGameGodot/scenes/main.tscn`
- 修改：`SekaiGameGodot/scripts/main.gd`

- [x] **步骤 1：增加启动层节点**

增加 `IgnitionOverlay`、中心 `CardSeal`、标题、跳过按钮和 `AnimationPlayer`；不要重命名现有 `PlayerLP`、`OpponentLP`、`HandList` 等唯一节点。

- [x] **步骤 2：播放启动后进入现有 demo duel**

`_ready()` 先播放 1100ms 启动动画，动画完成后调用现有 `start_demo_duel()`；跳过按钮直接隐藏 overlay 并开始对局。

- [x] **步骤 3：运行 Godot headless 规则测试**

运行：`Godot_v4.7.1-stable_win64.exe --headless --path D:\Sekai_two\memory-11\SekaiGameGodot --script res://tests/test_duel_engine.gd`

预期：现有规则测试继续通过；启动层不改变规则结果。

## 任务 7：浏览器视觉验证与服务器同步

**文件：**
- 修改：`SekaiGame/src/main/resources/static/index.html` 的版本查询参数。

- [x] **步骤 1：启动静态服务器并检查首页**

运行：`npm start`，打开 `http://127.0.0.1:8080/login`，使用离线用户 `sekai / 123456520baba` 登录，检查首页启动演出、重播、挑战关卡、收藏跳转和移动端布局。

- [~] **步骤 2：运行完整 Web 测试**

运行：`npm test`、`npm run check`、`npm run selftest`

结果：`npm run check` 与 `npm run selftest` 退出码为 0；完整 `npm test` 仍有 24 个既有业务/数据测试失败，新增 `card ignition` 测试全部通过。

- [x] **步骤 3：运行 Impeccable detector**

运行：`node C:\Users\administration\.agents\skills\impeccable\scripts/detect.mjs --json D:\Sekai_two\memory-11\SekaiGame\src\main\resources\static\index.html D:\Sekai_two\memory-11\SekaiGame\src\main\resources\static\css\style.css D:\Sekai_two\memory-11\SekaiGame\src\main\resources\static\js\app.js`

记录 detector 输出；若发现可访问性或动效反模式，修正后重新运行。

- [~] **步骤 4：构建 Spring Boot 并同步服务器**

使用项目已有 `mvn clean package` 和部署脚本将静态资源打入 jar，确认服务器进程重启后 `http://121.40.26.107/login` 返回新的版本查询参数和启动场；不修改数据库结构。

结果：本地 Spring Boot jar 已构建并确认包含新静态资源；远端 SSH 对现有密钥和常用登录用户均返回 `Permission denied`，尚未覆盖服务器，等待可用的 SSH 用户/授权公钥。
