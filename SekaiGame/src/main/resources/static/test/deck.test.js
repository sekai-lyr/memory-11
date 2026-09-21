import { describe, it } from "node:test";
import assert from "node:assert/strict";
global.document = { createElement: () => ({ textContent: "" }) };

const { createDeck, validateDeck, createRuntimeDeck, buildSuggestedDeck, DECK_RULES } = await import("../js/deck.js");
const { ALL_CARDS } = await import("../js/catalog.js");
const { createDefaultCollection, addCard } = await import("../js/collection.js");

function makeId(count = 1) { return Array.from({ length: count }, (_, i) => ALL_CARDS[i % ALL_CARDS.length].id); }

describe("卡组校验", () => {
    it("少于最小数量为非法", () => {
        const deck = createDeck("test", "测试", makeId(20));
        const col = createDefaultCollection();
        ALL_CARDS.forEach(c => addCard(col, c.id, 5));
        const r = validateDeck(deck, ALL_CARDS, col);
        assert.equal(r.valid, false);
        assert.ok(r.errors.some(e => e.includes("最少")));
    });
    it("超过最大数量为非法", () => {
        const deck = createDeck("test", "测试", makeId(61));
        const r = validateDeck(deck, ALL_CARDS, null);
        assert.equal(r.valid, false);
        assert.ok(r.errors.some(e => e.includes("最多")));
    });
    it("同名卡超过三张为非法", () => {
        const duplicateCardId = ALL_CARDS[0].id;
        const main = [...makeId(36), duplicateCardId, duplicateCardId, duplicateCardId, duplicateCardId];
        const deck = createDeck("test", "测试", main);
        const r = validateDeck(deck, ALL_CARDS, null);
        assert.equal(r.valid, false);
        assert.ok(r.errors.some(e => e.includes("最多")));
    });
    it("使用不存在卡牌会被拒绝", () => {
        const main = [...makeId(39), "nonexistent_card"];
        const deck = createDeck("test", "测试", main);
        const r = validateDeck(deck, ALL_CARDS, null);
        assert.equal(r.valid, false);
        assert.ok(r.errors.some(e => e.includes("不存在")));
    });
    it("使用超过收藏数量为非法", () => {
        const col = createDefaultCollection();
        addCard(col, ALL_CARDS[0].id, 1);
        const main = Array.from({ length: 40 }, () => ALL_CARDS[0].id);
        const deck = createDeck("test", "测试", main);
        const r = validateDeck(deck, ALL_CARDS, col);
        assert.equal(r.valid, false);
        assert.ok(r.errors.some(e => e.includes("拥有")));
    });
    it("合法卡组通过校验", () => {
        const col = createDefaultCollection();
        ALL_CARDS.forEach(c => addCard(col, c.id, 5));
        const deck = createDeck("test", "测试", makeId(40));
        const r = validateDeck(deck, ALL_CARDS, col);
        assert.equal(r.valid, true);
        assert.equal(r.errors.length, 0);
    });
    it("卡组统计正确", () => {
        const col = createDefaultCollection();
        ALL_CARDS.forEach(c => addCard(col, c.id, 5));
        const main = [...makeId(35)];
        const deck = createDeck("test", "测试", main);
        const r = validateDeck(deck, ALL_CARDS, col);
        assert.ok(r.stats.total >= 35);
        assert.ok(typeof r.stats.monsters === "number");
        assert.ok(typeof r.stats.spells === "number");
        assert.ok(typeof r.stats.traps === "number");
    });
});

describe("自动构筑", () => {
    it("自动构筑结果合法", () => {
        const col = createDefaultCollection();
        ALL_CARDS.forEach(c => addCard(col, c.id, 5));
        const main = buildSuggestedDeck({ collection: col, cardDatabase: ALL_CARDS, size: 40 });
        assert.ok(main.length > 0, "自动构筑应产出卡牌");
        const deck = createDeck("auto", "自动", main);
        const r = validateDeck(deck, ALL_CARDS, col);
        console.log("Auto deck errors:", r.errors);
        assert.equal(r.errors.length, 0, `自动构筑不应有错误: ${r.errors.join(", ")}`);
    });
    it("自动构筑不会使用未拥有卡", () => {
        const col = createDefaultCollection();
        ALL_CARDS.slice(0, 5).forEach(card => addCard(col, card.id, 3));
        const main = buildSuggestedDeck({ collection: col, cardDatabase: ALL_CARDS, attribute: "fire", size: 40 });
        const allFireOrFallback = main.every(id => col.cards[id] > 0);
        assert.ok(allFireOrFallback);
    });
});

describe("运行时卡组", () => {
    it("运行时卡组每张卡拥有唯一 instanceId", () => {
        const deck = createDeck("test", "测试", makeId(40));
        const runtime = createRuntimeDeck(deck, ALL_CARDS);
        assert.equal(runtime.length, 40);
        const ids = new Set(runtime.map(c => c.instanceId));
        assert.equal(ids.size, 40);
    });
});
