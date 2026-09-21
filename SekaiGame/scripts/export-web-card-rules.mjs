import { writeFile } from "node:fs/promises";
import { ALL_CARDS } from "../src/main/resources/static/js/catalog.js";

if (new Set(ALL_CARDS.map(card => card.id)).size !== ALL_CARDS.length) throw new Error("Duplicate card IDs");
await writeFile(new URL("../src/main/resources/full-card-pool.json", import.meta.url), JSON.stringify(ALL_CARDS, null, 2) + "\n");
const lines = [
    "# 浏览器版逐卡规则清单", "",
    "由 `node SekaiGame/scripts/export-web-card-rules.mjs` 从实际运行卡池生成。卡名、图片和卡牌 ID 保持不变。", "",
    "每张自制卡采用明确的动作与时机组合；N/R 为基础工具，SR 两项，SSR/UR 最多三项。稀有度不等于无条件获胜：高阶资源循环受同名次数、场位、等级、指示物或 LP 成本约束。", "",
    "所有主动技能可分别点击；自动目标写明在效果中。魔法与陷阱按顺序结算所有当前满足条件的条目，不满足条件的条目跳过；高稀有魔法的 LP 成本是整张卡的发动成本。", "",
    "|卡牌|稀有度|封面|实际效果|", "|---|---|---|---|",
    ...ALL_CARDS.map(card => `|${card.name}|${card.rarity}|[图片](../SekaiGame/src/main/resources/static/${(card.image || "").replace(/^\.\//, "")})|${card.description.replaceAll("\n", "<br>").replaceAll("|", "\\|")}|`), "",
];
await writeFile(new URL("../../docs/card-rules-2026-09.md", import.meta.url), lines.join("\n"));
console.log(`Exported ${ALL_CARDS.length} cards for Spring Boot and review document; Godot export is separate.`);
