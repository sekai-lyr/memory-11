import assert from "node:assert/strict";
import { ALL_CARDS } from "../js/catalog.js";
import { GameState, Player } from "../js/model.js";
import { GameEngine } from "../js/engine.js";
import { SeededRandom } from "../js/rng.js";

const pool = ALL_CARDS.filter(c => c.rulesVersion);
const groups = [pool.filter(c => c.type === "monster" && c.level <= 4), pool.filter(c => c.type === "monster" && c.level > 4), pool.filter(c => c.type === "spell"), pool.filter(c => c.type === "trap")];
function deck(seed) {
    return groups.flatMap((group, i) => Array.from({ length: [15, 7, 10, 8][i] }, (_, j) => group[(seed * 7 + j) % group.length]));
}
const actions = new Set();
const results = [];
for (let seed = 1; seed <= 60; seed++) {
    const rng = new SeededRandom(seed);
    const random = () => rng.next();
    const s = new GameState();
    s.players = [new Player("A", deck(seed), random), new Player("B", deck(seed + 11), random)];
    const e = new GameEngine(s, random);
    const resolve = e._executeEffect.bind(e);
    e._executeEffect = (...args) => { const result = resolve(...args); if (result && args[2].action) actions.add(args[2].action); return result; };
    for (const p of s.players) for (let n = 0; n < 5; n++) p.drawCard();
    for (let turns = 0; turns < 120 && !s.gameOver; turns++) {
        e.startTurn({ skipDraw: turns === 0 }); s.phase = "main_1"; e.checkGameOver();
        if (s.gameOver) break;
        const p = s.currentPlayer, o = s.opponentPlayer;
        for (const c of [...p.monsterZone]) {
            if (!c.faceUp) e.flipSummon(p, c);
            else if (c.position === "defense") e.changePosition(p, c);
        }
        for (let step = 0; step < 15; step++) {
            let changed = false;
            if (!p.normalSummonUsed) {
                const available = p.monsterZone.filter(c => !c.cannotUseAsMaterial);
                const card = p.hand.filter(c => c.type === "monster" && e.getTributeNeeded(c.level) <= available.length && (p.monsterZone.length < 5 || c.level >= 5)).sort((a, b) => b.attack - a.attack)[0];
                if (card) {
                    const result = e.normalSummon(p, p.hand.indexOf(card));
                    if (result.needsTribute) { for (const c of available.slice(0, result.tributeNeeded)) e.selectTribute(c); e.confirmTribute(); }
                    changed ||= result.success;
                }
            }
            const spell = p.hand.find(c => c.type === "spell" && e.canPlayEffect(p, c).canPlay);
            if (spell) changed ||= e.activateSpell(p, p.hand.indexOf(spell)).success;
            for (const c of [...p.monsterZone]) if (c.faceUp) changed = !!e.triggerAllEffects(p, c, "manual") || changed;
            const trap = p.hand.find(c => c.type === "trap");
            if (trap && p.spellTrapZone.length < 5) changed = e.setCard(p, p.hand.indexOf(trap)).success || changed;
            assert.deepEqual(e.checkStateIntegrity(), [], `seed ${seed}, turn ${s.turn}`);
            if (e.checkGameOver() || !changed) break;
        }
        if (!s.gameOver && !s.firstTurn && !p.skipBattlePhase) {
            s.phase = "battle";
            for (const c of [...p.monsterZone]) {
                for (let n = 0; n < 3 && !s.gameOver; n++) {
                    const target = o.monsterZone.length ? [...o.monsterZone].sort((a, b) => (a.position === "defense" ? a.currentDefense : a.currentAttack) - (b.position === "defense" ? b.currentDefense : b.currentAttack))[0] : "player";
                    if (!e.attack(c, target).success) break;
                    e.checkGameOver();
                }
            }
        }
        if (!s.gameOver) e.endTurn();
        assert.deepEqual(e.checkStateIntegrity(), []);
    }
    assert.ok(s.gameOver, `seed ${seed} exceeded turn budget`);
    results.push({ seed, turns: s.turn, winner: s.winner, reason: s.winReason });
}
console.log(JSON.stringify({ games: results.length, averageTurns: results.reduce((n, r) => n + r.turns, 0) / results.length, actionCoverage: actions.size, actions: [...actions].sort(), results }, null, 2));
