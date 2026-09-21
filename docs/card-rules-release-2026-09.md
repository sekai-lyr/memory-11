# 浏览器版卡牌规则改版

308 张自制卡使用逐卡指定的技能、时机和动作组合，保留 60 张入门卡。设计结合现有卡名、封面和本地角色设定；完整效果见[逐卡清单](card-rules-2026-09.md)。运行规则来源为 `authored-card-rules.js`，动作结算为 `themed-effects.js`。

35 类动作覆盖卡组筛选、墓地循环、除外回收、受限展开、指示物消耗、延迟爆破、毒印、效果封印、防护替代、攻击应对与死亡回归等。主动技能分别发动，同名次数限制跨实例与离场保留。自动选取目标与成本直接写在效果说明里。

N/R 提供单项基础工具，SR 两项，SSR/UR 最多三项。高稀有度魔法有整卡 LP 成本，怪兽按等级限制面板；强展开另受资源、等级、场位、指示物与次数限制。这是初始平衡设计，自动对战不能证明长期胜率平衡。

修正了先攻攻击限制、守备与里侧攻击、召唤当回合手动变更表示、反转召唤、0 攻对撞、普通魔法与速攻魔法盖放时机、陷阱时机、满场祭品召唤、攻击卷回及部分伤害结算。核心规则参照 [Konami 官方规则书](https://www.yugioh-card.com/en/rulebook/)；当前仍采用自动应对机制，尚未实现官方完整连锁、优先权及全部伤害步骤窗口，不能视为完整游戏王规则模拟器。

本次修改浏览器客户端与 Spring Boot 卡池加载，Godot 客户端尚未同步这些新动作。后端启动时从 `full-card-pool.json` 更新规则，正在运行的旧后端需要重启。

验证命令（从工作区根目录执行）：

```powershell
node --test SekaiGame/src/main/resources/static/test/*.test.js
node --test SekaiGame/src/test/js/*.test.js
node SekaiGame/scripts/audit-all-card-effects.mjs
node SekaiGame/src/main/resources/static/scripts/self-play-themed.mjs
node SekaiGame/scripts/export-web-card-rules.mjs
```

后端在 `SekaiGame` 目录执行 `mvn test`。浏览器实测覆盖技能单独选择、指示物显示、消耗指示物除外与手机详情阅读。混合卡组自动对战覆盖所有 35 类动作；逐效果审计验证可触发场景与结算，仍需实际玩家对局调整强度。
