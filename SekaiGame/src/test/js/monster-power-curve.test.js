import assert from "node:assert/strict";
import test from "node:test";

import { ALL_CARDS } from "../../main/resources/static/js/catalog.js";
import { minimumMonsterStatTotal } from "../../main/resources/static/js/card-rules.js";

const monsters = ALL_CARDS.filter(card => card.type === "monster" && card.rarity !== "N");

test("基础身材按星级与稀有度设上限，避免低星效果怪兽数值膨胀", () => {
    for (const card of monsters) {
        const rank = { R: 1, SR: 2, SSR: 3, UR: 4 }[card.rarity];
        const cap = card.level <= 4 ? 1900 + rank * 50 : card.level <= 6 ? 2400 + rank * 50 : 2800 + rank * 100;
        assert.ok(card.attack > 0 && card.attack <= cap, `${card.name}攻击力超出身材预算`);
        assert.ok(card.defense >= 0 && card.defense <= cap + 200, `${card.name}守备力超出身材预算`);
    }
});

test("低稀有低星怪兽不会越级取得高阶群体机制", () => {
    for (const card of monsters) {
        const types = new Set(card.effects.map(effect => effect.type));
        if (card.duelPowerTier < 5) assert.ok(!types.has("destroyAllEnemySpellTraps"), `${card.name}越级拥有全后场破坏`);
        if (card.duelPowerTier < 4) {
            assert.ok(!types.has("returnMultiple"), `${card.name}越级拥有群体回手`);
            assert.ok(!types.has("freezeAll"), `${card.name}越级拥有群体冻结`);
        }
        if (card.duelPowerTier < 3) {
            for (const eliteType of ["temporaryBanish", "doubleAttack", "reviveRecentGraveyard", "destroyWeakest", "protectAllies"]) {
                assert.ok(!types.has(eliteType), `${card.name}越级拥有${eliteType}`);
            }
        }
    }
});

test("技能目标数量、代价和发动条件随决斗强度阶级变化", () => {
    for (const card of monsters) {
        for (const effect of card.effects) {
            assert.ok(effect.oncePerTurn && effect.hardOncePerTurn, `${card.name}缺少同名发动限制`);
            if (effect.action === "burst" || effect.action === "timeStop") {
                assert.ok(card.effects.some(e => e.action === "charge"), `${card.name}没有指示物来源`);
            }
            if (effect.action === "twin") assert.match(effect.description, /支付600LP/);
            if (effect.type === "destroySpellTrap") {
                assert.equal(effect.value, card.duelPowerTier >= 5 ? 2 : 1, `${card.name}后场破坏数量错误`);
            }
            if (effect.type === "returnMultiple") {
                assert.equal(effect.value, card.duelPowerTier >= 7 ? 3 : 2, `${card.name}回手数量错误`);
            }
            if (effect.type === "doubleAttack" && card.duelPowerTier < 7) {
                assert.equal(effect.cost?.type, "payLife", `${card.name}二次攻击缺少LP代价`);
                assert.equal(effect.oncePerTurn, true, `${card.name}二次攻击缺少每回合限制`);
            }
            assert.ok(!effect.description.includes("结算角色专属能力"), `${card.name}仍使用空泛效果说明`);
        }
    }
});

test("同稀有度的攻守下限随星级严格上升", () => {
    for (const rarity of ["R", "SR", "SSR", "UR"]) {
        const levels = [...new Set(monsters.filter(card => card.rarity === rarity).map(card => card.level))].sort((a, b) => a - b);
        for (let index = 1; index < levels.length; index++) {
            assert.ok(
                minimumMonsterStatTotal({ rarity, level: levels[index] }) > minimumMonsterStatTotal({ rarity, level: levels[index - 1] }),
                `${rarity}星级曲线没有递增`,
            );
        }
    }
});
