# 卡包保底持久化实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复 `sekai` 账号卡包保底保存失败的问题，并让抽卡结果在服务器同步完成后再展示。

**架构：** 服务端继续以 MySQL 的 `sekai_game_users.pity_counters_json` 作为登录用户的保底持久化来源；`sekai` 账号只保留全卡三张的特殊卡牌初始化，随后复用通用用户元数据保存逻辑。前端先写 `localStorage`，再等待现有收藏 PUT 请求完成，刷新时继续从服务器恢复状态。

**技术栈：** Spring Boot 4.0.5、Spring Data JPA、JUnit 5、Mockito、原生 ES modules、Node `node:test`、Maven。

---

## 文件清单

- 修改：`src/main/java/com/sekai/game/service/CollectionService.java` — 移除 `sekai` 收藏分支提前返回，让保底和经济数据继续保存。
- 创建：`src/test/java/com/sekai/game/service/CollectionServiceTest.java` — 验证 `sekai` 账号保存收藏时仍写入保底、抽卡次数和货币。
- 修改：`src/main/resources/static/js/app.js` — 让 `openPacks` 等待收藏同步完成后再显示抽卡动画，并返回同步结果。
- 修改：`src/main/resources/static/index.html` — 递增入口脚本版本号，避免线上浏览器继续使用旧的前端模块缓存。
- 创建：`src/main/resources/static/test/pack-persistence.test.js` — 验证抽卡流程会等待服务器同步 Promise。
- 修改：`docs/superpowers/specs/2026-08-09-pack-pity-persistence-design.md` — 保存已确认的设计和验证标准。
- 创建：`docs/superpowers/plans/2026-08-09-pack-pity-persistence.md` — 保存本实现计划。

### 任务 1：为服务端特殊账号路径编写失败测试

**文件：**
- 创建：`src/test/java/com/sekai/game/service/CollectionServiceTest.java`

- [ ] **步骤 1：编写测试**

使用 Mockito 注入 `CollectionService` 的三个仓库。准备用户名为 `sekai` 的 `User`、一个启用的 `Card` 和包含下列字段的请求体：`duelCoins=1234`、`packsOpened=7`、`shards={"UR":200}`、`pityCounters={"nightcord_pack_001":{"packsSinceUR":7}}`。调用 `saveCollection(1L, body)`，断言保存后的用户字段和 JSON 字符串包含这些值，并验证 `userRepository.save(user)` 被调用。

- [ ] **步骤 2：运行测试验证红灯**

运行：

```powershell
mvn -Dtest=CollectionServiceTest test
```

预期：FAIL，因为当前 `sekai` 分支在公共元数据保存逻辑之前返回，用户的保底和抽卡次数不会更新。

### 任务 2：修复服务端保存路径

**文件：**
- 修改：`src/main/java/com/sekai/game/service/CollectionService.java:35-83`

- [ ] **步骤 1：实施最小修复**

删除 `sekai` 分支内的提前 `return`，保留全卡三张的删除和重建逻辑；让该分支在卡牌保存后跳过普通 `body.cards` 重建，但继续执行现有的 `duelCoins`、`packsOpened`、`shards`、`pityCounters` 和 `userRepository.save(user)` 逻辑。返回结果中的卡牌数量使用 `ownerCards.size()`，普通账号继续使用 `savedCards.size()`。

- [ ] **步骤 2：运行服务端测试验证绿灯**

运行：

```powershell
mvn -Dtest=CollectionServiceTest test
```

预期：PASS，且没有新增编译警告。

### 任务 3：为前端同步等待编写失败测试

**文件：**
- 创建：`src/main/resources/static/test/pack-persistence.test.js`

- [ ] **步骤 1：编写测试**

在导入 `CardGameApp` 前提供最小 DOM stub，使用 `Object.create(CardGameApp.prototype)` 构造测试对象，注入拥有足够决斗币的集合、一个尚未完成的同步 Promise，以及 `collectPulledCard`、`renderTopbar`、`showPackAnimation` 和 `toast` stub。调用 `openPacks(1)` 后，在释放同步 Promise 前断言动画没有显示；释放 Promise 后等待调用完成，断言动画显示一次。

- [ ] **步骤 2：运行测试验证红灯**

运行：

```powershell
node --test test/pack-persistence.test.js
```

预期：FAIL，因为当前 `openPacks` 没有等待 `syncCollectionToServer()`，会立即调用 `showPackAnimation`。

### 任务 4：修复前端同步时序

**文件：**
- 修改：`src/main/resources/static/js/app.js:255-285` — 将 `openPacks` 声明为 `async` 并等待同步。
- 修改：`src/main/resources/static/js/app.js:402-414` — 让 `syncCollectionToServer` 返回服务器请求结果，同时保留失败提示。

- [ ] **步骤 1：实施最小修复**

将 `openPacks(count)` 改为 `async openPacks(count)`；保留本地 `saveData(this.collection)`，把同步调用改为 `await this.syncCollectionToServer()`，然后再刷新顶部栏和显示动画。让 `syncCollectionToServer` 在无登录用户时返回 `null`，在已登录用户时返回 `saveUserCollection` 的结果。

- [ ] **步骤 2：运行前端测试验证绿灯**

运行：

```powershell
node --test test/pack-persistence.test.js
npm test
npm run check
```

预期：新增测试和全部既有 Node 测试通过，JavaScript 语法检查通过。

### 任务 5：构建并部署线上服务

**文件：**
- 使用：`target/sekai-game-1.0.0.jar`
- 线上目标：`/opt/sekai/sekai-game.jar`
- 线上服务：`sekai-game.service`

- [ ] **步骤 1：执行完整本地验证**

运行：

```powershell
mvn test
Push-Location src/main/resources/static
npm test
npm run check
Pop-Location
```

预期：所有测试通过，Maven 构建完成且前端语法检查无错误。

- [ ] **步骤 2：打包服务端**

运行：

```powershell
mvn clean package -DskipTests
```

预期：生成新的 `target/sekai-game-1.0.0.jar`。

- [ ] **步骤 3：备份并替换线上 JAR**

先将线上当前 JAR 复制为带时间戳的备份，再通过 `scp` 上传新 JAR 到临时路径，校验文件大小后原子替换 `/opt/sekai/sekai-game.jar`，最后执行 `systemctl restart sekai-game`。

- [ ] **步骤 4：验证线上服务**

运行：

```bash
systemctl is-active sekai-game
curl -fsS http://127.0.0.1:8091/api/health
```

预期：服务状态为 `active`，健康接口返回 `status=ok`。

- [ ] **步骤 5：验证保底字段落库**

使用已有账号执行一次收藏保存请求，随后读取 `/api/users/{userId}` 和 MySQL 中对应用户的 `pity_counters_json`、`packs_opened`，确认保存值一致；不修改其他用户数据。

## 完成检查

- [ ] 服务端回归测试在修复前确实失败、修复后通过。
- [ ] 前端时序回归测试在修复前确实失败、修复后通过。
- [ ] 全量 Maven 与 Node 测试通过。
- [ ] 线上服务健康检查通过。
- [ ] 线上 `sekai` 账号保底数据刷新后保持不变。
