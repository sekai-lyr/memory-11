import { createCardInstance } from "./model.js";
import { GAME_CONFIG, MONSTER_POSITION } from "./constants.js";

// The same action definitions generate card text and resolve its actual rules.
// Targets are deterministic and described explicitly; no hidden random skill rolls.
export const ACTION_TEXT = {
    scout: "展示卡组顶3张卡，将其中第一张怪兽加入手牌，其余按原顺序放回卡组底",
    study: "展示卡组顶3张卡，将其中第一张魔法加入手牌，其余按原顺序放回卡组底",
    prepare: "将卡组顶2张卡送入墓地",
    recover: "将自己墓地最后一只4星以下怪兽加入手牌",
    recycle: "将自己墓地最后3张卡按原顺序放回卡组底，抽1张卡",
    deploy: "将手牌中第一只4星以下怪兽特殊召唤为守备表示，其效果直到回合结束无效",
    revive: "将自己墓地最后一只4星以下怪兽特殊召唤为守备表示，其效果直到回合结束无效",
    recall: "将自己除外区最后一张卡加入手牌",
    shelter: "自己攻击力最低的表侧怪兽获得1次破坏替代：将其改为守备表示，直到下个回合结束有效",
    seal: "对方攻击力最高的可取对象表侧怪兽效果无效，直到本回合结束",
    sleep: "将对方攻击力最高的可取对象表侧怪兽变为里侧守备表示",
    freeze: "将对方攻击力最高的可取对象表侧怪兽变为守备表示，直到下个回合结束不能攻击或手动改变表示形式",
    poison: "给对方攻击力最高的可取对象表侧怪兽放置毒印；本回合结束时，其控制者受到600伤害，并移除毒印",
    bomb: "给对方攻击力最高的可取对象表侧怪兽放置爆破标记；本回合结束时破坏该怪兽，提前离场则标记失效",
    charge: "自身获得1个蓄力指示物（最多3个），攻击力上升200；移除指示物时失去对应的提升",
    burst: "移除自身1个蓄力指示物，将对方攻击力最高的可取对象表侧怪兽除外",
    twin: "支付600LP；自身本回合可以攻击2次",
    pierce: "自身本回合获得贯穿守备的战斗伤害",
    ward: "自身直到下个回合结束不能成为效果对象",
    ambush: "将自己墓地最后一张陷阱盖放到后场，本回合不能发动",
    token: "特殊召唤1只0攻1000守、1星的守备衍生物，不能作为上级召唤的祭品",
    exchange: "将自己攻击力最低的表侧怪兽返回手牌，再将手牌第一只4星以下怪兽特殊召唤为守备表示",
    chorus: "自己场上有至少2种属性的表侧怪兽时，抽1张卡",
    sanctuary: "将自己墓地最后1张卡除外；恢复1000LP",
    purify: "将对方墓地最后1张卡除外",
    intercept: "这次攻击无效",
    mirror: "这次攻击无效；将攻击怪兽变为守备表示",
    rescue: "这次攻击无效；将自己墓地最后一只4星以下怪兽加入手牌",
    reversal: "这次攻击无效；将攻击怪兽的攻击力与守备力交换，直到回合结束",
    retreat: "这次攻击无效；将自己攻击力最低的表侧怪兽返回手牌",
    reprisal: "这次攻击无效；给攻击怪兽放置毒印，本回合结束时其控制者受到600伤害",
    returnSelf: "自己被破坏送入墓地后，支付800LP，将自身加入手牌；同名效果每回合只能使用1次",
    inherit: "自己被破坏送入墓地后，将卡组第一只与自身同属性的4星以下怪兽加入手牌",
    devour: "将自己场上第一只衍生物除外，抽2张卡",
    timeStop: "移除自身1个蓄力指示物，支付1000LP；对方全部表侧怪兽直到下个回合结束不能攻击或手动改变表示形式",
};

const lowMonster = c => c.type === "monster" && Number(c.level) <= 4;
const last = (zone, predicate = () => true) => [...zone].reverse().find(predicate);
function enemy(ctx) {
    return ctx.opponent.monsterZone.filter(c => c.faceUp && !c.cannotBeTargeted)
        .sort((a, b) => b.currentAttack - a.currentAttack)[0];
}
function ally(ctx) {
    return ctx.player.monsterZone.filter(c => c.faceUp)
        .sort((a, b) => a.currentAttack - b.currentAttack)[0];
}
function move(card, from, to) {
    const index = from.indexOf(card);
    if (index < 0) return false;
    from.splice(index, 1);
    to.push(card);
    return true;
}
function summon(ctx, card, from) {
    from.splice(from.indexOf(card), 1);
    ctx.engine.resetFieldCard(card);
    card.position = MONSTER_POSITION.DEFENSE;
    card.setTurn = ctx.gameState.turn;
    card.themedState = { sealedUntil: ctx.gameState.turn };
    ctx.player.monsterZone.push(card);
    ctx.engine._emitSpecialSummon(ctx.player, card);
}
export function canResolveThemedEffect(ctx) {
    const { effect: e, player: p, card: c } = ctx;
    if (e.type !== "themedAction") return true;
    const space = p.monsterZone.length < GAME_CONFIG.MAX_MONSTER_ZONE && !p.cannotSpecialSummonThisTurn;
    switch (e.action) {
        case "scout": case "study": case "prepare": return p.deck.length > 0;
        case "recover": return !!last(p.graveyard, lowMonster);
        case "recycle": return p.graveyard.filter(x => x !== c).length >= 3;
        case "deploy": return space && p.hand.some(lowMonster);
        case "revive": return space && !!last(p.graveyard, lowMonster);
        case "recall": return p.banished.length > 0;
        case "shelter": return !!ally(ctx);
        case "seal": case "sleep": case "freeze": case "poison": case "bomb": return !!enemy(ctx);
        case "burst": return (c.themedState?.charges || 0) >= 1 && !!enemy(ctx);
        case "charge": return p.monsterZone.includes(c) && (c.themedState?.charges || 0) < 3;
        case "twin": return p.monsterZone.includes(c) && p.lp > 600;
        case "pierce": case "ward": return p.monsterZone.includes(c);
        case "ambush": return p.spellTrapZone.length < GAME_CONFIG.MAX_SPELL_TRAP_ZONE && !!last(p.graveyard, x => x.type === "trap" && x !== c);
        case "token": return space;
        case "exchange": return !p.cannotSpecialSummonThisTurn && !!ally(ctx) && p.hand.some(lowMonster);
        case "chorus": return new Set(p.monsterZone.filter(x => x.faceUp).map(x => x.attribute)).size >= 2 && p.deck.length > 0;
        case "sanctuary": return p.graveyard.some(x => x !== c);
        case "purify": return ctx.opponent.graveyard.length > 0;
        case "returnSelf": return p.graveyard.includes(c) && p.lp > 800;
        case "inherit": return p.graveyard.includes(c) && p.deck.some(x => lowMonster(x) && x.attribute === c.attribute);
        case "devour": return p.monsterZone.some(x => x.isToken) && p.deck.length >= 2;
        case "timeStop": return (c.themedState?.charges || 0) >= 1 && p.lp > 1000 && ctx.opponent.monsterZone.some(x => x.faceUp);
        case "intercept": case "mirror": case "rescue": case "reversal": case "retreat": case "reprisal": return !!ctx.battle;
        default: return false;
    }
}

function state(card) { return card.themedState ||= {}; }
export const themedEffectHandlers = {
    themedAction(ctx) {
        if (!canResolveThemedEffect(ctx)) return null;
        const { player: p, opponent: o, card: c, effect: e, gameState: game } = ctx;
        const target = enemy(ctx);
        switch (e.action) {
            case "scout": case "study": {
                const top = p.deck.splice(0, 3);
                const chosen = top.find(x => x.type === (e.action === "scout" ? "monster" : "spell"));
                if (chosen) p.hand.push(top.splice(top.indexOf(chosen), 1)[0]);
                p.deck.push(...top);
                return `${e.skillName}：${chosen ? `${chosen.name}加入手牌` : "没有符合类型的卡"}，其余放回卡组底`;
            }
            case "prepare": p.graveyard.push(...p.deck.splice(0, 2)); break;
            case "recover": move(last(p.graveyard, lowMonster), p.graveyard, p.hand); break;
            case "recycle": {
                const cards = p.graveyard.filter(x => x !== c).slice(-3);
                for (const x of cards) move(x, p.graveyard, p.deck);
                p.drawCard(); break;
            }
            case "deploy": summon(ctx, p.hand.find(lowMonster), p.hand); break;
            case "revive": summon(ctx, last(p.graveyard, lowMonster), p.graveyard); break;
            case "recall": move(p.banished.at(-1), p.banished, p.hand); break;
            case "shelter": state(ally(ctx)).shelterUntil = game.turn + 1; break;
            case "seal": state(target).sealedUntil = game.turn; break;
            case "sleep":
                ctx.engine.resetFieldCard(target);
                target.position = MONSTER_POSITION.DEFENSE;
                target.faceUp = false; target.faceDown = true;
                target.setTurn = game.turn; break;
            case "freeze":
                target.position = MONSTER_POSITION.DEFENSE; target.canAttack = false;
                state(target).frozenUntil = game.turn + 1; break;
            case "poison": state(target).poisonTurn = game.turn; break;
            case "bomb": state(target).bombTurn = game.turn; break;
            case "charge":
                state(c).charges = (state(c).charges || 0) + 1;
                c.permanentBuffs.push({ type: "attack", value: 200, source: "themedCharge" });
                p._recalcCardStats(c); break;
            case "burst":
                spendCharge(ctx);
                ctx.engine.resetFieldCard(target);
                if (target.isToken) o.monsterZone.splice(o.monsterZone.indexOf(target), 1);
                else move(target, o.monsterZone, o.banished);
                break;
            case "twin": p.takeDamage(600); c.doubleAttackThisTurn = true; break;
            case "pierce": state(c).piercingUntil = game.turn; break;
            case "ward": state(c).wardUntil = game.turn + 1; c.cannotBeTargeted = true; break;
            case "ambush": {
                const trap = last(p.graveyard, x => x.type === "trap" && x !== c);
                ctx.engine.resetFieldCard(trap);
                trap.faceDown = true; trap.faceUp = false; trap.canActivate = false; trap.setTurn = game.turn;
                move(trap, p.graveyard, p.spellTrapZone); break;
            }
            case "token": {
                const token = createCardInstance({ id: "themed_token", name: `${c.name}的替身`, type: "monster", level: 1, attribute: c.attribute, attack: 0, defense: 1000, effects: [], isToken: true });
                token.instanceId = `token_${game.turn}_${game.eventLog.length}_${p.monsterZone.length}`;
                token.position = MONSTER_POSITION.DEFENSE; token.cannotUseAsMaterial = true; token.setTurn = game.turn;
                p.monsterZone.push(token); break;
            }
            case "exchange": {
                const replacement = p.hand.find(lowMonster);
                const outgoing = ally(ctx);
                ctx.engine.resetFieldCard(outgoing);
                if (outgoing.isToken) p.monsterZone.splice(p.monsterZone.indexOf(outgoing), 1);
                else move(outgoing, p.monsterZone, p.hand);
                summon(ctx, replacement, p.hand); break;
            }
            case "chorus": p.drawCard(); break;
            case "sanctuary": move(last(p.graveyard, x => x !== c), p.graveyard, p.banished); p.heal(1000); break;
            case "purify": move(o.graveyard.at(-1), o.graveyard, o.banished); break;
            case "returnSelf": p.takeDamage(800); ctx.engine.resetFieldCard(c); move(c, p.graveyard, p.hand); break;
            case "inherit": {
                const found = p.deck.find(x => lowMonster(x) && x.attribute === c.attribute);
                move(found, p.deck, p.hand); break;
            }
            case "devour": {
                const token = p.monsterZone.find(x => x.isToken);
                p.monsterZone.splice(p.monsterZone.indexOf(token), 1);
                p.drawCard(); p.drawCard(); break;
            }
            case "timeStop": {
                spendCharge(ctx); p.takeDamage(1000);
                for (const x of o.monsterZone.filter(x => x.faceUp)) {
                    state(x).frozenUntil = game.turn + 1; x.canAttack = false;
                }
                break;
            }
            default: {
                ctx.battle.canceled = true;
                const attacker = ctx.attacker;
                if (e.action === "mirror" && attacker) { attacker.position = MONSTER_POSITION.DEFENSE; attacker.canAttack = false; }
                if (e.action === "rescue") { const x = last(p.graveyard, lowMonster); if (x) move(x, p.graveyard, p.hand); }
                if (e.action === "retreat") {
                    const x = ally(ctx);
                    if (x) { ctx.engine.resetFieldCard(x); if (x.isToken) p.monsterZone.splice(p.monsterZone.indexOf(x), 1); else move(x, p.monsterZone, p.hand); }
                }
                if (e.action === "reprisal" && attacker) state(attacker).poisonTurn = game.turn;
                if (e.action === "reversal" && attacker) {
                    const difference = attacker.currentDefense - attacker.currentAttack;
                    attacker.tempEffects.push({ type: "attack", value: difference, duration: "untilEndTurn" }, { type: "defense", value: -difference, duration: "untilEndTurn" });
                    [attacker.currentAttack, attacker.currentDefense] = [attacker.currentDefense, attacker.currentAttack];
                }
            }
        }
        return `${e.skillName}：${ACTION_TEXT[e.action]}`;
    },
};

function spendCharge(ctx) {
    state(ctx.card).charges--;
    const index = ctx.card.permanentBuffs.findIndex(x => x.source === "themedCharge");
    if (index >= 0) ctx.card.permanentBuffs.splice(index, 1);
    ctx.player._recalcCardStats(ctx.card);
}

export function resolveThemedTurnEnd(engine) {
    const turn = engine.state.turn;
    for (const p of engine.state.players) {
        for (const c of [...p.monsterZone]) {
            const s = c.themedState || {};
            if (s.poisonTurn === turn) { delete s.poisonTurn; p.takeDamage(600); engine.emit("onPoisonDamage", { card: c, damage: 600 }); }
            if (s.bombTurn === turn) { delete s.bombTurn; engine.destroyFieldMonster(p, c); }
            for (const key of ["sealedUntil", "frozenUntil", "shelterUntil", "piercingUntil", "wardUntil"]) {
                if (s[key] != null && s[key] <= turn) { delete s[key]; if (key === "wardUntil") c.cannotBeTargeted = false; }
            }
        }
    }
}
