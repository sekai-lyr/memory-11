# 卡包保底持久化设计

## 目标

让卡包的 UR 保底计数在抽卡后可靠保存到本地存档和服务器数据库，页面刷新后继续使用已保存的计数，不因 `sekai` 账号的特殊卡牌初始化逻辑而回到 0。

## 已确认的根因

`CollectionService.saveCollection` 对用户名为 `sekai` 的账号先重建全卡三张的收藏，然后在第 49 行提前返回。通用的 `duelCoins`、`packsOpened`、`shards` 和 `pityCounters` 保存逻辑位于后面，因此该账号的保底数据不会写入数据库。

刷新页面时，前端 `syncFromServer` 会读取服务器返回的 `pityCountersJson` 并覆盖当前本地集合。服务器仍是 0 时，本地刚保存的保底计数也会被覆盖，所以用户看到保底归零。

## 方案

### 服务端

保留 `sekai` 账号的全卡三张特殊行为，但不在卡牌重建分支提前返回。卡牌保存完成后继续执行现有的经济数据和保底数据保存逻辑，确保一次请求内将卡牌、货币、抽卡次数和保底计数一起提交。

### 本地前端

将卡包开启流程改为异步流程：本地 `saveData` 仍立即写入 `localStorage`，随后等待 `syncCollectionToServer` 完成，再显示抽卡结果动画。服务器同步失败时保留本地存档，并显示已有的同步失败提示；抽卡规则、概率和保底计算不变。

### 数据流

```text
抽卡
  -> 更新本地 cards / duelCoins / packsOpened / pityCounters
  -> 写入 localStorage
  -> PUT /api/collection/{userId}
  -> 服务端保存 sekai 卡牌与用户元数据
  -> 同步完成后显示抽卡结果
刷新
  -> 读取 localStorage
  -> GET /api/users/{userId}
  -> 以服务器 pityCountersJson 恢复保底计数
```

## 错误处理

- 卡牌保存请求失败时，不回滚本地抽卡结果，继续保留本地存档并提示同步失败。
- 服务端保存请求仍使用现有事务；元数据序列化失败时整个请求返回错误，不写入不完整的保底状态。
- 不新增客户端可修改保底值的管理接口，也不改变账号认证和抽卡概率。

## 验证标准

1. `sekai` 账号调用收藏保存接口后，`pityCountersJson`、`packsOpened` 和 `duelCoins` 均更新。
2. 前端在服务器同步完成之前不结束本次抽卡流程。
3. Java 回归测试和前端 Node 测试先在旧代码上失败，修复后通过。
4. Maven 构建成功，线上服务重启后健康检查正常。
5. 线上抽卡后直接刷新，保底显示保持刷新前的数值。
