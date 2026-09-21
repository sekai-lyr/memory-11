import test from "node:test";
import assert from "node:assert/strict";
import { GameState, Player, createCardInstance } from "../js/model.js";
import { GameEngine } from "../js/engine.js";
import { ALL_CARDS, getCardById } from "../js/catalog.js";
import { ACTION_TEXT } from "../js/themed-effects.js";
import { GameController } from "../js/controller.js";

let serial = 0;
function monster(overrides = {}) {
    return createCardInstance({ id: `fixture_${serial++}`, name: "测试怪兽", type: "monster", level: 4, attack: 1800, defense: 1400, attribute: "water", effects: [], ...overrides });
}
function setup() {
    const s = new GameState();
    s.players = [new Player("甲", []), new Player("乙", [])];
    s.turn = 3; s.firstTurn = false; s.phase = "main_1";
    const [p, o] = s.players;
    p.deck = Array.from({ length: 12 }, () => monster());
    o.deck = Array.from({ length: 12 }, () => monster());
    return { s, p, o, e: new GameEngine(s, () => .3) };
}
function skill(action, trigger = "manual") {
    return { type: "themedAction", action, trigger, oncePerTurn: true, skillName: action };
}
function source(p, actions) {
    const c = monster({ rulesVersion: "test", effects: actions.map(x => typeof x === "string" ? skill(x) : x) });
    p.monsterZone.push(c); return c;
}
test("308张自制卡全部使用明确动作，60张入门卡保留规则", () => {
    const custom = ALL_CARDS.filter(c => c.series !== "starter_ygo");
    assert.equal(custom.length, 308);
    assert.equal(ALL_CARDS.filter(c => c.series === "starter_ygo").length, 60);
    const actions = new Set();
    for (const c of custom) for (const effect of c.effects) {
        assert.ok(ACTION_TEXT[effect.action], c.id);
        assert.ok(effect.oncePerTurn && effect.hardOncePerTurn);
        actions.add(effect.action);
    }
    assert.ok(actions.size >= 30);
});
test("衍生物被解放除外后消失，不进入可回收区域", () => {
    const { e, p, o } = setup(); const c = source(p, ["charge", "burst"]);
    const token = monster({ isToken: true }); o.monsterZone.push(token);
    e.triggerAllEffects(p, c, "manual", { effectIndex: 0 });
    e.triggerAllEffects(p, c, "manual", { effectIndex: 1 });
    assert.equal(o.monsterZone.length, 0);
    assert.equal(o.banished.length, 0);
    assert.equal(o.graveyard.length, 0);
});

test("主动技能可单独选择，蓄力不足不消耗发动次数", () => {
    const { e, p } = setup(); const c = source(p, ["charge", "burst"]);
    assert.equal(e.triggerAllEffects(p, c, "manual", { effectIndex: 1 }), null);
    assert.ok(e.triggerAllEffects(p, c, "manual", { effectIndex: 0 }));
    assert.equal(c.themedState.charges, 1);
    assert.equal(e.triggerAllEffects(p, c, "manual", { effectIndex: 0 }), null);
});
test("同名一回合一次跨实例与离场保留，下回合恢复", () => {
    const { e, p, s } = setup(); const c = source(p, ["charge"]);
    const copy = createCardInstance(c); p.monsterZone.push(copy);
    e.triggerAllEffects(p, c, "manual");
    assert.equal(e.triggerAllEffects(p, copy, "manual"), null);
    e.resetFieldCard(c); assert.equal(e.triggerAllEffects(p, c, "manual"), null);
    s.turn++; assert.ok(e.triggerAllEffects(p, c, "manual"));
});
test("卡组顶筛选保留未选卡顺序且不复制卡", () => {
    const { e, p } = setup(); const c = source(p, ["study"]);
    const a = monster(), b = monster({ type: "spell" }), d = monster(), tail = monster();
    p.deck = [a, b, d, tail]; e.triggerAllEffects(p, c, "manual");
    assert.deepEqual(p.hand, [b]); assert.deepEqual(p.deck, [tail, a, d]);
    assert.deepEqual(e.checkStateIntegrity(), []);
});
test("墓地回收不足3张不发动，回收后抽牌", () => {
    const { e, p } = setup(); const c = source(p, ["recycle"]);
    p.graveyard = [monster(), monster()];
    assert.equal(e.triggerAllEffects(p, c, "manual"), null);
    p.graveyard.push(monster()); assert.ok(e.triggerAllEffects(p, c, "manual"));
    assert.equal(p.graveyard.length, 0); assert.equal(p.hand.length, 1); assert.equal(p.deck.length, 14);
});
test("部署限制等级，成功后效果封印到结束阶段", () => {
    const { e, p } = setup(); const c = source(p, ["deploy"]);
    const high = monster({ level: 7 }), low = monster({ effects: [skill("charge")] });
    p.hand = [high, low]; e.triggerAllEffects(p, c, "manual");
    assert.ok(p.hand.includes(high)); assert.ok(p.monsterZone.includes(low));
    assert.equal(low.position, "defense"); assert.equal(e.triggerAllEffects(p, low, "manual"), null);
    e.endTurn(); assert.equal(low.themedState.sealedUntil, undefined);
});
test("毒印和爆破只在结束阶段结算", () => {
    const { e, p, o } = setup(); const c = source(p, ["poison", "bomb"]);
    const target = monster(); o.monsterZone.push(target); e.triggerAllEffects(p, c, "manual");
    assert.equal(o.lp, 8000); assert.equal(o.monsterZone.length, 1);
    e.endTurn(); assert.equal(o.lp, 7400); assert.equal(o.monsterZone.length, 0); assert.ok(o.graveyard.includes(target));
});
test("爆破目标离场重置后不携带旧标记", () => {
    const { e, p, o } = setup(); const c = source(p, ["bomb"]); const target = monster();
    o.monsterZone.push(target); e.triggerAllEffects(p, c, "manual"); e.resetFieldCard(target);
    e.endTurn(); assert.ok(o.monsterZone.includes(target));
});
test("庇护只替代一次破坏，仍承受战斗伤害", () => {
    const { e, p, o, s } = setup(); const c = source(p, ["shelter"]); e.triggerAllEffects(p, c, "manual");
    const a = monster({ attack: 2500 }); a.canAttack = true; o.monsterZone.push(a); s.currentPlayerIndex = 1; s.phase = "battle";
    e.attack(a, c); assert.equal(p.lp, 7300); assert.ok(p.monsterZone.includes(c)); assert.equal(c.position, "defense");
    e.destroyFieldMonster(p, c); assert.ok(p.graveyard.includes(c));
});
test("高稀有魔法支付真实费用，费用不足不移动卡牌", () => {
    const { e, p } = setup(); const c = createCardInstance(getCardById("nc_sp_ur_001"));
    p.hand.push(c); p.lp = 1000; assert.equal(e.activateSpell(p, 0).success, false); assert.equal(p.hand[0], c);
    p.lp = 2000; assert.equal(e.activateSpell(p, 0).success, true); assert.equal(p.lp, 1000);
});
test("陷阱本回合不能发动，下回合才能拦截", () => {
    const { e, p, o, s } = setup(); const trap = createCardInstance(getCardById("source_trap_023"));
    trap.faceDown = true; trap.canActivate = true; trap.setTurn = s.turn; o.spellTrapZone.push(trap);
    const a = monster(); a.canAttack = true; p.monsterZone.push(a); s.phase = "battle";
    e.attack(a, "player"); assert.equal(o.spellTrapZone.length, 1); assert.equal(o.lp, 6200);
    a.canAttack = true; a.attacksMadeThisTurn = 0; s.turn++;
    assert.equal(e.attack(a, "player").attackCanceled, true); assert.equal(o.lp, 6200);
});
test("衍生物不能作祭品，被破坏不进入墓地", () => {
    const { e, p } = setup(); const c = source(p, ["token"]); e.triggerAllEffects(p, c, "manual");
    const token = p.monsterZone.at(-1); assert.equal(token.cannotUseAsMaterial, true);
    p.resetTurnState(); assert.equal(token.cannotUseAsMaterial, true);
    e.destroyFieldMonster(p, token); assert.ok(!p.graveyard.includes(token));
});
test("死亡回归支付LP且同名每回合只能一次", () => {
    const { e, p } = setup(); const c = createCardInstance(getCardById("picture_ex_072"));
    p.monsterZone.push(c); e.destroyFieldMonster(p, c); assert.ok(p.hand.includes(c)); assert.equal(p.lp, 7200);
    p.hand.splice(p.hand.indexOf(c), 1); p.monsterZone.push(c); e.destroyFieldMonster(p, c);
    assert.ok(p.graveyard.includes(c)); assert.equal(p.lp, 7200);
});
test("封印阻止主动发动，冻结持续到对方结束阶段", () => {
    const { e, p, o, s } = setup(); const c = source(p, ["seal", "freeze"]); const target = source(o, ["charge"]);
    e.triggerAllEffects(p, c, "manual"); s.currentPlayerIndex = 1; assert.equal(e.triggerAllEffects(o, target, "manual"), null);
    s.currentPlayerIndex = 0; e.endTurn(); e.startTurn(); s.phase = "main_1";
    assert.equal(e.changePosition(o, target).success, false); e.endTurn(); assert.equal(target.themedState.frozenUntil, undefined);
});
test("结束阶段共鸣只在自己回合触发，恢复可超过8000LP", () => {
    const { e, p, o } = setup(); source(p, [skill("chorus", "onTurnEnd")]);
    p.monsterZone.push(monster({ attribute: "fire" })); source(o, [skill("charge", "onTurnEnd")]);
    p.heal(1000); assert.equal(p.lp, 9000); e.endTurn(); assert.equal(p.hand.length, 1); assert.equal(o.monsterZone[0].themedState, undefined);
});
test("PvP快照保留指示物、同名次数和衍生物定义", () => {
    const { s, e, p } = setup(); const c = source(p, ["charge", "token"]); e.triggerAllEffects(p, c, "manual");
    const snapshot = JSON.parse(JSON.stringify(new GameController(s, e, {})._serializePvpState()));
    assert.equal(snapshot.players[0].monsterZone[0].themedState.charges, 1);
    assert.equal(snapshot.players[0].monsterZone[1].defense, 1000); assert.equal(snapshot.players[0].themedUses[`${c.id}:0`], 3);
});
test("0攻平手不破坏；翻转召唤变为攻击表示并可攻击", () => {
    const { e, p, o, s } = setup(); const a = monster({ attack: 0 }), b = monster({ attack: 0 });
    a.canAttack = true; p.monsterZone.push(a); o.monsterZone.push(b); s.phase = "battle";
    e.attack(a, b); assert.equal(p.monsterZone.length, 1); assert.equal(o.monsterZone.length, 1);
    s.phase = "main_1"; const c = monster(); c.faceUp = false; c.position = "defense"; p.monsterZone.push(c);
    assert.equal(e.flipSummon(p, c).success, true); assert.equal(c.position, "attack"); assert.equal(c.canAttack, true);
});
test("满场可上级召唤，主要2祭品确认不倒退阶段", () => {
    const { e, p, s } = setup(); p.monsterZone = Array.from({ length: 5 }, () => monster()); p.hand.push(monster({ level: 7 })); s.phase = "main_2";
    assert.equal(e.normalSummon(p, 0).needsTribute, true); e.selectTribute(p.monsterZone[0]); e.selectTribute(p.monsterZone[1]);
    assert.equal(e.confirmTribute().success, true); assert.equal(s.phase, "main_2"); assert.equal(p.monsterZone.length, 4);
});
test("翻转效果在伤害计算之后发动", () => {
    const { e, p, o, s } = setup(); const a = monster({ attack: 2000 }); a.canAttack = true;
    const b = monster({ defense: 1000, effects: [{ trigger: "onFlip", type: "buffSelfDefense", value: 3000 }] });
    b.faceUp = false; b.position = "defense"; p.monsterZone.push(a); o.monsterZone.push(b); s.phase = "battle";
    e.attack(a, b); assert.ok(o.graveyard.includes(b)); assert.equal(o.lp, 8000);
});
test("战斗卷回重选不多消耗攻击次数或再次触发宣言", () => {
    const { e, p, o, s } = setup(); const a = monster(); a.canAttack = true; p.monsterZone.push(a);
    const b = monster(); o.monsterZone.push(b); s.phase = "battle"; let declarations = 0;
    e.eventBus.on("onAttacked", () => { declarations++; o.monsterZone = []; });
    assert.equal(e.attack(a, b).replay, true); assert.equal(a.attacksMadeThisTurn, 1);
    assert.equal(e.attack(a, "player").success, true); assert.equal(a.attacksMadeThisTurn, 1); assert.equal(declarations, 1);
    assert.equal(e.attack(a, "player").success, false);
});
