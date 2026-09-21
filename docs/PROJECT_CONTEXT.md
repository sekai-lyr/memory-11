# Sekai Duel（夜曲决斗）项目上下文地图

> 审计日期：2026-08-15  
> 用途：后续整体改造前的项目基线。本文记录当前真实代码结构、数据流、特效链路、运行边界和已知耦合点；它不是新的产品规格。

## 1. 项目定位

这是一个二次元卡牌对战项目，产品名为 Sekai Game / Sekai Duel，核心体验是：

- 收集带有角色插画的卡牌；
- 抽取主题卡包、解锁卡牌、编辑卡组；
- 进行类似游戏王的回合制决斗；
- 支持本地 AI 对战、在线房间/PvP 转发；
- Web 端负责完整的视觉体验，Godot 端提供原生客户端和迁移中的对战能力；
- Spring Boot 服务端负责账号、收藏、卡组、战绩和 PvP 房间消息。

项目不是单一前端页面，而是三套运行层：

1. Web 客户端：HTML/CSS/ES Module、Anime.js、DOM 战斗场；
2. Java 服务端：Spring Boot、JPA/MySQL、REST、WebSocket；
3. Godot 客户端：Godot 4.7、GDScript、独立决斗引擎和 PvP 客户端。

## 2. 顶层目录

| 路径 | 作用 |
| --- | --- |
| SekaiGame/ | Java 服务端、Web 静态资源、卡牌源数据、Node 工具 |
| SekaiGame/src/main/resources/static/ | Web 入口、页面、CSS、JS、图片和前端测试 |
| SekaiGame/src/main/java/com/sekai/game/ | Spring Boot 配置、实体、仓库、服务、控制器、WebSocket |
| SekaiGameGodot/ | Godot 项目、原生场景、规则引擎、AI、迁移数据和测试 |
| docs/ | 项目说明、视觉方案、计划和本上下文地图 |
| pricture/ | 原始图片及素材目录，名称沿用项目已有拼写 |
| analysis-contact-sheets/、audit-70-large/、.tmp-* | 审计/临时/素材分析产物，不是运行时主代码 |
| .tools/ | 本地工具，例如 Godot 运行时 |

## 3. 总体数据流

~~~text
卡牌源数据 / 图片目录
        │
        ├─ catalog.js 归一化、去重、合并卡池
        │       │
        │       ├─ card-rules.js：基础可玩性与兼容规则
        │       └─ rarity-rules.js：稀有度预算、角色原型、签名效果
        │
        ├─ Web engine.js：规则结算、目标、触发器、伤害、回合
        │       │
        │       └─ controller.js：玩家/AI/PvP动作编排、锁、排队、快照
        │               │
        │               ├─ ui.js：字段、手牌、日志、按钮和弹窗
        │               └─ effects.js：规则事件到 DOM/粒子/镜头/卡面演出
        │
        ├─ export_godot_cards.mjs
        │       └─ Godot data/cards.json
        │               └─ duel_engine.gd：原生决斗规则子集
        │
        └─ Java DataInitializer：服务端数据库初始卡牌
                └─ REST 收藏/卡组/战绩 + WebSocket 房间转发
~~~

当前最重要的事实：Web 引擎、Godot 引擎和服务端并没有共享同一个权威规则实现。服务端主要保存和转发，Web 与 Godot 各自维护决斗逻辑。因此以后整体改造必须先定义“规则事件协议”，不能只改页面或只改特效。

## 4. Web 客户端

### 4.1 页面与应用壳

入口是 static/index.html。它同时包含：

- 登录/注册认证屏；
- 顶部资源栏、用户资料和状态；
- 左侧首页、卡包、收藏、卡组、规则、设置导航；
- 首页 Hero、推荐卡牌、最近对局、快捷操作；
- 卡包抽取页、收藏页、卡组编辑页、规则页、设置页；
- 战斗场 DOM：对手区、手牌、牌组、墓地、场地、控制区、日志和覆盖层；
- 战斗启动、抽卡、召唤、攻击、陷阱、破坏、胜负等动画容器。

main.js 是 Web 入口控制器，负责模块装配、路由启动、认证状态、离线模式、服务端同步、创建新局、结算对局和 PvP 监听。

app.js 管理应用路由和非战斗页面：

- home：Hero 场景、真实卡图、速度线、飞卡、仪式/徽记、操作入口、最近对局；
- shop：卡包展示、概率说明、抽取结果；
- collection：卡牌筛选、详情、分解、制作、插画；
- decks：卡组编辑、验证、统计和建议；
- rules/settings：规则说明和偏好设置；
- battle/PvP：连接战斗控制器和战斗场 UI。

### 4.2 登录与服务端同步

- auth.js 主要使用浏览器本地存档完成登录/注册体验；
- api.js 通过相对路径访问 /api，使用 10 秒 AbortController 超时；
- 服务端可同步用户、收藏、卡组、抽卡和战绩；
- 浏览器端当前不把 JWT 作为完整前端会话主线，离线存档仍是重要路径；
- storage.js 负责 localStorage 版本、迁移、去抖保存和后端同步；
- profile.js 提供默认档案、默认卡组和旧 ID 兼容过滤。

整体改造时要保留“离线可玩 + 在线可同步”的双路径，不能把本地状态假设为只读缓存。

### 4.3 卡牌数据合并

catalog.js 将多组卡池归一化为 ALL_CARDS，主要来源包括：

- ygo-starter：60 张；
- picture-ssr7：59 张；
- picture-extension：119 张；
- 元素卡、Nightcord 卡、图片卡、生成卡等其余源；
- 最终有效卡牌总数：368 张。

卡牌对象包含名称、类型、属性、稀有度、攻击/防御、等级、描述、效果数组、lore、aiHints、series、member、图片路径等字段。旧 effect 单字段会通过兼容层归一化为 effects 数组。

### 4.4 卡牌规则生成层

card-rules.js 是基础规则和旧卡兼容层：

- 约束最低属性、统计值和可玩性；
- 对固定卡 ID 使用明确规则；
- 对 starter_ygo、设计稀有度、图片卡和回退卡按优先级应用规则；
- 兼容旧数据结构。

rarity-rules.js 是当前卡牌设计的主要生成层：

- 使用固定种子/FNV 风格哈希保证同一张卡的规则稳定；
- 按 N、R、SR、SSR、UR 分配效果预算；
- 给怪兽、魔法、陷阱、精英卡分配不同效果协议；
- 根据角色原型、属性、风格和签名生成专属效果；
- 生成 ruleTier、duelPowerTier、ruleSignature、描述和效果；
- 对 SSR/UR、角色卡、特殊主题和完整阶段提供不同演出暗示；
- 不是随机把一组效果塞进 JSON，而是先生成可执行技能协议，再交给引擎解释。

monster-cinematics.js 将角色/卡名匹配到角色风格、签名粒子、召唤演出和攻击演出。N 卡可以没有签名效果，稀有卡会进入更长的运镜层。

### 4.5 收藏、卡组、抽卡和奖励

- collection.js：卡牌数量上限 3，重复卡转碎片；碎片按稀有度计算；制作需要不同稀有度碎片；支持 demo、金币、碎片、插画、奖励和保底；
- deck.js：主卡组 40–60、额外卡组 15、侧卡组 15、同名最多 3 张，高攻击怪兽有额外限制，并提供验证/统计/自动构筑；
- packs.js：每包 8 张，最后一张至少 R；十连保证 SR/SSR/UR；有连续抽取保底和 UR 保底；
- stages.js：生成 50 个 AI 关卡主题，按章节递增强度，前一关解锁后一关；
- rewards.js：根据胜负发放决斗币、PvP 货币和每日奖励；
- storage.js/profile.js：负责持久化、迁移和默认卡组。

## 5. Web 决斗规则链路

### 5.1 model.js

model.js 提供运行时基础对象：

- 洗牌和可注入随机源；
- 运行时卡牌实例和 instanceId；
- Player：牌组、手牌、场地、墓地、除外区、LP、抽牌、弃牌、伤害、回复、回合标记；
- GameState：当前玩家、回合、阶段、选择、AI、胜者和事件日志；
- 基本状态重置和回合生命周期。

默认规则常量包括：双方 8000 LP、起手 5 张、结束阶段手牌上限 6、怪兽区 5、魔陷区 5，以及通常召唤、攻击、位置和胜负相关枚举。

### 5.2 engine.js

engine.js 约 2384 行，是 Web 规则的核心：

- 普通召唤、祭品召唤、盖放、翻转、表示形式；
- 魔法、陷阱、场地卡和发动限制；
- 目标解析、属性筛选、区域筛选、手牌/墓地/场地/除外；
- 召唤触发、攻击宣言、战斗陷阱、伤害和反射；
- 增益、减益、抽卡、弃牌、回收、回手、回卡组、除外、复活；
- 临时效果、永久效果、直到回合结束、每回合一次和费用；
- 战斗破坏、LP 归零、牌组耗尽、特殊胜利；
- 事件总线和事件日志；
- AI 运行需要的规则入口。

当前规则风险：

- 同文件存在后定义覆盖先定义的处理器，已发现 reviveToHand、directAttackDamage、swapAttackDefense 等重复命名；
- 规则执行结果没有统一的结构化事件结果对象，UI 需要从状态变化和事件日志推断部分信息；
- 目标区域、效果参数和 UI 选择器存在不完全对称；
- effect state、回合重置和临时标记分散在多个路径；
- 规则能力会继续增长时，单文件处理器会成为修改冲突中心。

### 5.3 controller.js

controller.js 约 2332 行，负责把规则动作变成可操作的回合流程：

- 用户出牌、召唤、设置、发动、选择目标、攻击和结束回合；
- AI 抽牌、召唤、盖牌、发动和结束回合；
- 通过 effectQueue 排队；
- 通过锁和动作状态防止重复点击；
- 等待动画结束后继续下一步；
- 处理回合、阶段自动推进和战斗后的主要阶段；
- 序列化/反序列化 PvP 动作和远端状态；
- 将服务器动作、状态快照和本地演出接起来。

关键边界：

- 控制器不是规则引擎，不能在整体改造中把规则判断继续塞进控制器；
- 动画锁、规则锁、网络等待和用户选择等待是不同状态，未来应分开建模；
- _applyRemoteActionQueued 中保留了一段早期 return 后不可达的旧 switch；
- 目前大量演出流程依赖 setTimeout、Promise 和 DOM 结果，取消/跳过/断线恢复不够集中。

## 6. 特效与动效系统

### 6.1 card-ignition.js

这是 Anime.js v4 的页面级入口动画模块，直接使用本地 Anime.js 模块：

- playAuthIgnition：登录/注册认证屏点亮；
- playCardIgnition：首页卡牌、徽记、文案、按钮和仪式层入场；
- playDuelLaunch：进入决斗时的卡牌启动；
- playPackOverload：抽卡/卡包过载演出；
- 支持 reduced motion；
- 使用固定的 full、stagger、hero、copy、UI、pack 等时序；
- 抽卡结果最多选择 8 张独立卡，保留顺序；
- 播放后清理临时 class/style，避免重复进入状态。

### 6.2 effects.js

effects.js 约 4801 行，目前有两套并行特效系统：

第一套是较早的通用演出：

- 属性粒子；
- 横幅；
- 屏幕震动；
- 卡牌飞入、抽卡、出牌、墓地；
- 基础召唤、攻击、命中、破坏；
- 通用 spell/trap 动画。

第二套是后续规则驱动与稀有度演出：

- RULE_VISUALS：规则类型到视觉配置；
- CARD_THEME_RULES：卡牌主题、属性和视觉颜色；
- 卡牌签名粒子；
- 稀有度箔光、UR/SSR cinematic；
- 等级召唤、角色召唤、角色攻击；
- 陷阱紫色爆发、魔法展开、反射、回手、回卡组、除外、复活；
- SVG 碎片、冲击波、光环、镜头偏移和卡牌克隆；
- 对手/己方双边视觉目标映射。

已核对的主要演出链：

~~~text
规则事件
  → controller 排入 effectQueue
  → effects.js 创建卡牌克隆/粒子/横幅/镜头状态
  → Anime.js/CSS keyframes 播放
  → timeout/finish 清理
  → controller 解锁并继续结算
~~~

当前最值得整体改造的点：

- 多个旧/新视觉层同时存在，容易出现重复闪光、重复震动和重复 banner；
- battlefield.style.transform 被多个函数直接写入，镜头偏移可能互相覆盖；
- Math.random 用于部分视觉种子，破坏严格的回放确定性；
- 大量 DOM clone、setTimeout 和全局 class，没有统一的取消、跳过和超时调度器；
- animatePlayCard 的 Promise 在部分路径中过早 resolve，可能让规则和演出不同步；
- 特效事件、规则事件、网络事件没有统一事件 ID；
- 角色签名、稀有度、属性和规则类型的优先级分散在多个函数。

后续推荐的目标结构：

~~~text
规则引擎只发出结构化 DuelEvent
  → VisualDirector 按事件 ID 排序、去重、取消和调度
  → 少数稳定的视觉原语（card、beam、burst、shake、banner、camera）
  → CSS 只负责静态皮肤，Anime.js 只负责可编排时序
~~~

这会比继续追加同名 CSS 动画更适合做“动态炸裂”的二次元卡牌风格，同时保留规则可验证性。

### 6.3 CSS

static/style.css 约 6112 行，包含：

- 深色蓝黑背景、面板、稀有度颜色、边框、按钮、圆角；
- 登录、应用壳、顶部栏、侧栏、首页 Hero；
- 战斗区、牌组/墓地/场地/手牌/日志；
- 召唤、攻击、破坏、陷阱、魔法、抽卡、稀有度箔光；
- 场景主题、starter-ygo 框、海洋场景；
- 角色签名、粒子、UR/SSR cinematic；
- Card Ignition A 层和 Pack Overload B 层。

主要技术债：

- 文件后半段存在多版本追加覆盖，旧层仍可能参与渲染；
- 同名 keyframes 重复，例如 flipSummon、particleFloat、trapPurpleBurst；
- 组件样式、战斗视觉原语和页面皮肤混在一个文件；
- CSS 变量、特效状态 class 和 JS 内联 style 没有统一协议；
- 视觉调参会很容易改变另一条战斗演出。

## 7. Java 服务端

### 7.1 技术栈与运行方式

- Spring Boot 4.0.5；
- Java 21；
- Spring Web、WebSocket、Data JPA、MySQL、Validation、Security、JJWT；
- 实际应用端口为 8091；
- 本地/线上由 jar、systemd 和 nginx 组合运行。

SekaiGame/README.md 中仍有旧的 Java 17、Spring Boot 3.2.5、8081 和小卡池描述，不能作为当前运行事实。

### 7.2 数据与 REST

主要模块：

- config：CorsConfig、DataInitializer、SecurityConfig、WebConfig、WebSocketConfig；
- controllers：Auth、Card、Collection、Deck、DuelRecord、Health、User；
- entities：Card、Deck、DeckCard、DuelRecord、User、UserCard；
- repositories：JPA 持久化；
- services：认证、卡牌、收藏、卡组、战绩等业务。

REST 领域：

- /api/auth：登录、注册和认证；
- /api/cards：卡牌查询；
- /api/users：用户资料；
- /api/decks：卡组读取和保存；
- /api/collection：收藏和碎片；
- /api/duels：战绩；
- /api/health：健康检查。

DataInitializer 当前把四组有效来源合并进服务端：

- 解码基础卡 130 张；
- picture-extension 119 张；
- picture-ssr7 59 张；
- ygo-starter 60 张；
- 去重后共 368 张。

### 7.3 WebSocket/PvP

PvpWebSocketHandler 处理房间和动作消息：

- create_room；
- join_room；
- set_deck；
- game_action；
- end_turn；
- game_over；
- chat；
- ping。

服务端负责：

- 创建/加入房间；
- 选择首位玩家；
- 转发动作；
- 转发状态快照；
- 回合结束和房间生命周期。

服务端不负责完整的卡牌战斗裁决，实际规则仍在客户端。整体重构时需要选择明确方向：

1. 继续客户端规则 + 服务端 relay，但定义可校验的事件/快照协议；
2. 把规则引擎迁移为服务端权威；
3. 用共享规则核心生成 Web/Godot/服务端三端事件。

在没有做出选择前，不应只重做特效而改变事件字段。

### 7.4 安全边界

当前配置存在明显生产技术债，后续上线前必须处理：

- SecurityConfig 的放行范围较宽；
- WebSocket/CORS 允许范围偏宽；
- 配置文件中存在硬编码数据库/JWT 敏感配置；
- 初始化用户和前端离线种子数据也不应作为生产凭据。

本文不记录任何密码、JWT secret 或可复用凭据。

## 8. Godot 客户端

### 8.1 场景

project.godot 使用 Godot 4.7：

- 设计视口约 1440×900；
- 兼容渲染；
- 深色背景；
- CardCatalog autoload；
- WebSocket PvP 地址；
- 主场景包含顶部标签、对手/玩家牌区、手牌、操作按钮、日志和启动覆盖层。

启动覆盖层使用 duo/impact 资源、标题、副标题、跳过按钮和 Tween 演出。

### 8.2 核心脚本

- card_catalog.gd：读取并归一化 368 张卡，创建运行时实例；
- duel_state.gd：LP、手牌、怪兽区、魔陷区、回合和玩家状态；
- duel_engine.gd：启动决斗、抽牌、召唤、盖放、魔法、战斗、回合和效果分发；
- basic_ai.gd：简单优先级 AI，先用魔法，再召唤怪兽，随后战斗/结束；
- pvp_client.gd：WebSocket 连接、房间消息、动作消息；
- main.gd：启动演出、示例决斗、ItemList UI 和 AI 延迟执行。

Godot 当前是 Web 规则的可运行子集，不是完整复刻：

- 支持 368 张卡和全部效果类型的基础处理器；
- 支持确定性洗牌、起手、抽牌、回合、召唤、魔法、盖放、战斗和部分触发；
- UI 仍是最小 2D/ItemList 形式；
- Web 的复杂目标选择、角色签名演出、全部控制器队列和完整战斗视觉没有迁移。

## 9. 卡牌与效果基线

本次审计得到的有效数据：

| 指标 | 数量 |
| --- | ---: |
| 有效卡牌 | 368 |
| 怪兽 | 218 |
| 魔法 | 105 |
| 陷阱 | 45 |
| N / R / SR / SSR / UR | 61 / 6 / 139 / 125 / 37 |
| 有效效果总数 | 785 |
| 图片缺失 | 0 |
| 重复 ID | 0 |

已核对：

- Web 368 张卡的 785 个效果均能找到处理器；
- 双边视觉目标检查 1570/1570 通过；
- 50 个 AI 关卡的构筑和强度检查通过；
- Godot 368 张卡迁移和规则测试通过；
- 图片路径全量存在。

效果类型覆盖破坏、恢复、抽卡、攻击/防御增减、直伤、治疗、控制攻击、反射、保护、后场破坏、全体伤害、回手、回收、除外、弃牌、复活、交换攻守、双重攻击、最弱者处理、目标保护、临时除外和反击等。

## 10. 生成脚本与数据一致性

关键脚本：

- audit-all-card-effects.mjs：卡牌/效果/处理器/执行/序列化审计；
- audit-bilateral-visual-effects.mjs：己方/对手视觉映射审计；
- test-ai-stages.mjs：50 个 AI 关卡审计；
- export_godot_cards.mjs：Web 卡牌导出 Godot；
- generate-full-card-pool.mjs：从素材目录生成图片卡和后端卡池；
- self-play.mjs：20 局自动试玩；
- extract-cards.mjs：旧路径兼容脚本，路径假设已过时。

需要注意：

- static 的完整 ALL_CARDS 与服务端 DataInitializer 是当前 368 卡运行事实；
- cards.json、full-card-pool.json、cards-base64.txt 等部分文件仍可能是旧的 130 张快照；
- 生成脚本的来源集合和服务端初始化集合没有完全统一；
- 后续若重新生成卡牌，必须同时检查 Web、Godot 和 Java 三份数据，避免只更新一端。

## 11. 可运行基线

截至 2026-08-15：

- npm run check：通过；
- npm run selftest：20 局全部正常结束，平均 7.5 回合；
- Godot duel tests：0 failure(s)；
- Maven 跳过测试打包：通过；
- 卡牌效果审计：368/368 卡、785/785 效果通过；
- 双边视觉审计：1570/1570 通过；
- AI 关卡审计：50/50 通过；
- Node 完整测试：176 项，152 通过、24 失败。

24 个 Node 失败是本次认知审计前已经存在的测试/代码契约漂移，主要分布在：

- collection/deck 的旧数量和旧卡池预期；
- 旧元素卡数量、旧 Nightcord 卡池数量和类型预期；
- 自动构筑、初始 UI 文案和少量控制器断言；
- 祭品召唤返回结果；
- UR 三段效果旧断言；
- 奖励统计；
- 两个没有 DOM mock 的控制器测试。

本次只做读取、测试和文档化，没有修复这些失败，也没有改变业务行为。

## 12. 后续整体改造的边界

### 优先级 1：先统一事件语义

建立稳定的 DuelEvent：

- eventId、turn、phase、source、owner、targets、zone；
- action、stateBefore、stateAfter 或最小 diff；
- result、damage、destroyed、created、moved；
- visualProfile、rarity、characterSignature；
- network requestId 和 replay seed。

规则、UI、特效、PvP 和 Godot 都围绕这个事件协议工作。

### 优先级 2：收束特效编排

把 effects.js 拆成：

- visual-director：队列、锁、取消、跳过、超时、事件去重；
- visual-primitives：card、beam、burst、particle、banner、camera、sound；
- visual-profiles：属性、稀有度、角色签名、规则效果；
- adapters：DOM Web、Godot 或其他客户端。

避免每个效果函数同时负责规则判断、DOM 查找、镜头写入和清理。

### 优先级 3：建立视觉 token 和层级

保留卡牌图片的插画特色，视觉方向应从真实卡图提炼，而不是继续堆紫色渐变和通用 AI 面板：

- 卡框、属性、稀有度和边缘箔光是身份层；
- 角色签名是中景层；
- 规则类型是战斗动作层；
- 镜头、粒子、冲击和节奏是表现层；
- 页面背景只做舞台，不抢卡面。

CSS 应按 token、组件、战斗原语、页面主题分层，并删除旧/新重复动画的同时运行。

### 优先级 4：决定规则权威

在扩充 PvP、Godot 或服务器校验前，明确使用：

- Web 权威；
- 服务端权威；
- 或共享规则核心。

这不是视觉问题，而是架构决策。否则视觉越丰富，状态不同步越难排查。

### 优先级 5：再处理生产安全和数据生成

- 外置数据库/JWT/初始化配置；
- 收紧 CORS、WebSocket 来源和认证；
- 统一 368 张卡的唯一生成源；
- 自动生成 Web/Godot/Java 数据并做 hash/数量/效果/图片一致性校验；
- 更新 README 和部署文档中的旧版本、旧端口和旧卡池描述。

## 13. 后续修改时的阅读入口

视觉改造优先阅读：

1. static/index.html
2. static/style.css
3. static/js/card-ignition.js
4. static/js/effects.js
5. static/js/controller.js
6. static/js/ui.js
7. static/js/app.js

规则改造优先阅读：

1. static/js/constants.js
2. static/js/model.js
3. static/js/card-rules.js
4. static/js/rarity-rules.js
5. static/js/engine.js
6. static/js/controller.js
7. static/test/

跨端/PvP 改造优先阅读：

1. Web api.js、main.js、controller.js
2. Java PvpWebSocketHandler、WebSocketConfig、相关 controller/service
3. Godot pvp_client.gd、duel_engine.gd、duel_state.gd
4. export_godot_cards.mjs 和三端卡牌数据

这份地图是后续整体修改的共同基线。任何大改都应先更新事件、数据源或视觉层级的对应章节，再修改实现。
