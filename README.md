# memory-11 · Sekai Duel（夜曲决斗）游戏项目

基于游戏王规则的二次元卡片决斗游戏，包含 **Java Web 后端** 与 **Godot 4 客户端** 两部分。

## 项目组成

### SekaiGame（Java 后端）

- Spring Boot + WebSocket + Spring Data JPA + MySQL
- 账号系统、收藏系统、PvP 实时对战中继服务
- 采用游戏王（Yu-Gi-Oh!）规则

### SekaiGameGodot（Godot 4 客户端）

- Godot 4.7 原生客户端迁移版本
- 导入 368 张有效卡牌
- 确定性洗牌、起手手牌、抽卡与回合切换
- 怪兽召唤、魔法发动、盖牌、战斗与直接攻击
- 核心效果分发、基础 AI 回合、`/ws/pvp` 消息协议
- 详见 `SekaiGameGodot/README.md`

## 运行

### 后端

```powershell
cd SekaiGame
mvn spring-boot:run
```

### Godot 客户端

使用 Godot 4.7.1 打开 `SekaiGameGodot` 目录即可。

## 其他目录

- `pricture/`、`analysis-contact-sheets/`、`audit-70-large/`：卡面图片与素材
- `picture-inventory.json`：图片素材清单
- `.tools/`、`.tmp-superpowers-*`：本地工具与临时文件

## 说明

游戏采用游戏王规则实现，卡面素材为个人使用，正式发布前需替换版权素材。
