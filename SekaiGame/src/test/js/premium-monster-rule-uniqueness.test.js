import assert from "node:assert/strict";
import { ALL_CARDS } from "../../main/resources/static/js/catalog.js";

const monsters = ALL_CARDS.filter(card => card.type === "monster" && card.rarity !== "N");
const structures = [];
for (const card of monsters) {
    assert.ok(card.effects.length >= 1 && card.effects.length <= 3, `${card.name}技能预算越界`);
    assert.ok(card.effects.every(effect => effect.type !== "signatureTechnique"), `${card.name}仍使用复杂协议`);
    assert.ok(card.effects.every(effect => effect.skillLabel && effect.hardOncePerTurn), `${card.name}技能缺少时机或限制`);
    assert.ok(card.effects.every(effect => effect.description?.length <= 130), `${card.name}单条效果说明过长`);
    assert.ok(card.effects.every(effect => !/锋芒觉醒|领域威压|弱点处刑/u.test(effect.skillName || "")), `${card.name}仍使用旧的随机三段模板`);
    structures.push(card.effects.map(effect => `${effect.trigger}:${effect.action || effect.type}`).join("|"));
}
assert.equal(new Set(structures).size, monsters.length, "存在三项技能机制组合完全相同的角色卡");

console.log(`premium monster simplified rules passed: ${monsters.length} cards`);
