import assert from "node:assert/strict";
import test from "node:test";

import { ALL_CARDS } from "../../main/resources/static/js/catalog.js";

test("自动生成卡牌使用直白描述且不再出现强度公式", () => {
    for (const card of ALL_CARDS.filter(item => item.ruleTier)) {
        assert.doesNotMatch(card.description || "", /强度＝|结算①|结算②|该强度/u, `${card.name}仍使用复杂公式`);
        for (const effect of card.effects || []) {
            assert.ok(effect.description?.includes("："), `${card.name}缺少明确触发时机`);
        }
    }
});

test("技能数量按稀有度分配，最高三项", () => {
    for (const card of ALL_CARDS.filter(item => item.series !== "starter_ygo")) {
        const expectedMaximum = { N: 1, R: 1, SR: 2, SSR: 3, UR: 3 }[card.rarity];
        assert.ok((card.effects || []).length <= expectedMaximum, `${card.name}效果数量超限`);
    }
});
