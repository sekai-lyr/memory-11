import { ACTION_TEXT } from "./themed-effects.js";

// Each row is an authored card assignment, in printed catalogue order.
// S = normal summon, M = ignition, D = destroyed, E = own end phase.
// Similar characters share tools, but card variants use different timing/resources.
const RECIPES = {};
function rows(prefix, first, text) {
    text.trim().split("\n").forEach((row, index) => {
        RECIPES[`${prefix}${String(first + index).padStart(3, "0")}`] = row.trim();
    });
}
rows("picture_ssr7_", 1, `
S:token M:exchange D:inherit
S:scout M:charge M:burst
S:prepare M:revive E:chorus
S:sanctuary M:purify D:inherit
S:study M:exchange E:chorus
S:freeze M:recycle D:recover
S:charge M:burst D:prepare
S:charge M:bomb M:burst
S:token M:exchange D:recover
S:charge M:seal M:burst
S:freeze M:ward D:inherit
S:prepare M:twin D:recover
S:charge M:twin M:burst
S:study M:seal D:inherit
S:shelter M:pierce D:prepare
S:prepare M:bomb D:ambush
S:prepare M:sanctuary D:recover
S:scout M:deploy D:inherit
S:purify M:seal D:inherit
S:scout M:deploy E:chorus
S:ward M:pierce D:inherit
S:purify M:twin D:recover
S:study M:sleep D:recover
S:recover M:recycle E:chorus
S:charge M:pierce M:burst
S:scout M:deploy D:recover
S:token M:sanctuary D:revive
S:shelter M:poison D:inherit
S:prepare M:poison D:revive
S:deploy M:study E:chorus
S:recover M:exchange D:inherit
S:seal M:sleep D:recover
S:token M:exchange D:revive
S:shelter M:pierce D:recover
S:scout M:exchange E:chorus
S:study M:recycle D:recover
S:poison M:sleep D:purify
S:ward M:seal D:recover
S:charge M:twin D:inherit
S:recover M:shelter E:chorus
S:shelter M:recover D:inherit
S:prepare M:recover D:study
S:freeze M:study D:recover
S:purify M:recycle E:chorus
S:ward M:exchange D:recover
S:prepare M:study D:recycle
S:charge M:pierce D:inherit
S:study M:deploy D:recover
S:prepare M:revive D:recycle
S:sleep M:exchange D:recover
S:scout M:twin D:recover
S:shelter M:seal D:recover
S:prepare M:recall D:inherit
S:sleep M:recycle E:chorus
S:token M:deploy E:chorus
S:ambush M:study D:recover
S:recover M:sanctuary E:chorus
S:scout M:shelter E:chorus
S:ward M:purify D:inherit
`);
rows("picture_ex_", 1, `
M:revive M:shelter
M:purify M:recall
M:scout M:recover
M:prepare M:sanctuary
M:recycle M:scout
M:seal M:study
M:token M:exchange
M:deploy M:scout
M:study M:ambush
M:scout M:purify
S:charge M:freeze M:burst
S:prepare M:bomb D:ambush
S:freeze M:ward D:recover
S:charge M:twin M:burst
S:ward M:purify D:inherit
S:shelter M:sanctuary D:recover
S:token M:exchange D:inherit
S:shelter M:ward D:revive
S:charge M:pierce
S:seal M:poison
S:charge M:twin
S:shelter M:deploy
S:shelter M:purify
S:poison M:study
S:shelter M:freeze
S:scout M:pierce
S:prepare M:purify
S:ward M:sleep
S:scout M:twin
S:charge D:inherit
S:purify M:pierce
S:study M:charge
S:freeze M:shelter
S:ward M:poison
S:shelter M:pierce
S:sleep M:ward
S:prepare M:poison
S:recover M:shelter
S:charge M:burst
S:prepare M:sanctuary
S:purify D:inherit
S:charge M:burst
S:freeze M:pierce
S:purify M:seal
S:scout M:exchange
S:poison M:twin
S:charge M:bomb
S:charge M:burst
S:sleep M:exchange
S:charge M:burst
S:study M:scout
S:shelter M:ward
S:sleep M:poison
S:charge D:recover
S:freeze M:poison
S:study M:seal
S:poison D:purify
S:prepare M:sleep
S:scout M:twin
S:prepare M:recycle
S:shelter D:inherit
S:recover M:recycle
S:charge M:pierce
S:recover M:deploy
S:charge D:inherit
S:sleep M:study
S:charge M:bomb
S:charge M:burst
S:seal M:sleep
S:charge M:twin
D:inherit
D:returnSelf M:study
S:shelter M:ward
S:token M:sleep
S:charge M:burst
S:prepare M:revive
S:token M:shelter
S:charge M:pierce
S:sanctuary M:pierce
S:study M:seal
S:token M:exchange
S:deploy M:study E:chorus
S:sleep M:recall E:chorus
S:scout M:exchange E:chorus
S:seal M:study D:recover
S:prepare M:revive E:chorus
S:study M:recycle D:inherit
S:scout M:deploy E:chorus
S:ward M:exchange D:recover
S:charge M:burst D:purify
S:prepare M:sleep D:recover
S:scout M:exchange D:inherit
S:study M:recycle E:chorus
S:purify M:deploy E:chorus
S:recover M:shelter E:chorus
S:scout M:deploy D:recover
S:study M:prepare D:recover
S:prepare M:revive E:chorus
S:shelter M:sanctuary D:recover
S:token M:exchange E:chorus
S:prepare M:recycle E:chorus
S:charge M:burst D:purify
S:prepare M:bomb D:revive
S:charge M:burst D:inherit
S:prepare M:burst E:charge
S:purify M:pierce E:charge
S:deploy M:recycle E:chorus
M:scout M:deploy
M:study M:shelter
M:recover M:revive
M:deploy M:chorus
M:seal M:study
M:exchange M:shelter
M:study M:recover
M:shelter M:recycle
M:sleep M:recall
M:study M:ambush
M:recall M:revive M:shelter
M:recycle M:recover M:deploy
`);
rows("source_monster_", 1, `
M:seal
M:sleep
M:study
S:prepare M:bomb D:returnSelf
S:scout M:exchange D:inherit
S:shelter M:deploy D:recover
S:study M:seal D:recall
S:charge M:burst D:purify
S:study M:ward D:recover
S:ward M:seal D:inherit
S:charge M:burst E:charge
S:prepare M:bomb D:purify
S:charge M:burst D:inherit
S:charge M:pierce M:burst
S:seal M:freeze D:study
S:ward M:sanctuary D:inherit
S:prepare M:revive D:purify
S:purify M:recall E:charge
S:prepare M:burst E:charge
S:deploy M:recycle E:chorus
`);
rows("source_spell_", 21, `
M:freeze M:recover M:chorus
M:scout M:deploy M:shelter
`);
rows("source_trap_", 23, `
M:intercept M:sleep
M:rescue M:shelter
M:mirror M:recover
M:intercept M:study
M:intercept M:purify
M:reversal M:recover
M:retreat M:scout
M:mirror M:purify
M:rescue M:sanctuary
M:mirror M:freeze
M:retreat M:sleep
M:intercept M:ambush
M:rescue M:deploy
M:reversal M:study
M:intercept M:purify M:sanctuary
M:mirror M:shelter M:recover
M:rescue M:recycle M:recall
M:intercept M:seal M:purify
M:mirror M:recover M:shelter
M:intercept M:seal M:sleep
M:retreat M:recall M:recover
M:mirror M:purify M:recycle
M:reversal M:freeze M:recall
M:intercept M:study M:recycle
M:rescue M:deploy M:shelter
M:mirror M:purify M:sanctuary
M:reprisal M:recover M:recall
M:retreat M:sleep M:study
`);
rows("water_", 7, `
M:recover
M:shelter
M:study
S:prepare M:recycle E:chorus
S:sleep M:exchange D:recover
`);
RECIPES.dark_006 = "S:seal M:sleep E:charge";
rows("nc_sp_ur_", 1, `
M:prepare M:recall M:recover
M:scout M:deploy M:chorus
M:sleep M:exchange M:study
M:recover M:sanctuary M:shelter
M:prepare M:bomb M:purify
M:purify M:deploy M:chorus
M:sleep M:study M:shelter
M:prepare M:recover M:ambush
M:scout M:deploy M:shelter
M:study M:scout M:recycle
M:freeze M:recover M:recycle
M:prepare M:recall M:study
`);
rows("nc_sp_ss_", 1, `
M:prepare M:exchange
M:recover M:sanctuary
M:recycle M:ambush
M:prepare M:revive
M:deploy M:chorus
M:sleep M:study
`);
rows("nc_tr_", 1, `
M:retreat M:sleep M:recover
M:intercept M:sanctuary M:shelter
M:mirror M:recall M:recover
M:reversal M:study M:deploy
M:rescue M:purify M:shelter
`);
rows("gallery_spell_", 8, `
M:deploy M:chorus
M:exchange M:shelter
M:purify M:recall
M:recover M:ambush
M:scout M:exchange
M:study M:deploy
M:recall M:exchange
M:sleep M:shelter
M:scout M:deploy
M:exchange M:purify
M:study M:seal
M:recover M:recycle
M:prepare M:bomb
M:recover M:study
M:recall M:deploy
M:shelter M:exchange
M:sleep M:recall
M:scout M:shelter
M:study M:token
M:deploy M:chorus
M:purify M:recover
M:recover M:shelter
M:study M:exchange
M:study M:ambush
M:exchange M:seal
M:seal M:shelter
M:prepare M:revive
M:freeze M:recover
M:prepare M:sanctuary
M:recycle M:shelter
M:recover M:chorus
M:token M:shelter
M:scout M:chorus
M:deploy M:ambush
M:study M:scout
M:scout M:recover
M:token M:exchange
M:prepare M:recycle
M:purify M:ambush
M:prepare M:revive
M:scout M:deploy
M:deploy M:chorus
M:recall M:recover
`);
Object.assign(RECIPES, {
    picture_ex_017: "S:token M:devour D:inherit",
    picture_ex_086: "S:recover M:revive E:chorus",
    picture_ex_098: "S:prepare M:revive D:study",
    picture_ex_014: "S:charge M:twin D:ambush",
    picture_ex_012: "S:ambush M:bomb D:prepare",
    picture_ex_088: "S:study M:deploy E:chorus",
    source_monster_014: "S:charge M:bomb D:purify",
    picture_ex_096: "S:scout M:deploy D:recall",
    picture_ex_082: "S:token M:study E:chorus",
    picture_ex_084: "S:recover M:exchange E:chorus",
    picture_ex_095: "S:shelter M:recycle E:chorus",
    picture_ex_089: "S:ward M:exchange D:recall",
    water_011: "S:sleep M:exchange D:study",
    picture_ex_015: "S:ward M:ambush D:inherit",
    gallery_spell_010: "M:purify M:sleep",
    gallery_spell_043: "M:scout M:recall",
    gallery_spell_036: "M:sanctuary M:revive",
    picture_ex_112: "M:seal M:ambush",
    gallery_spell_044: "M:token M:scout",
    picture_ex_117: "M:study M:sleep",
    gallery_spell_031: "M:ambush M:study",
    picture_ex_099: "S:shelter M:recover D:recycle",
    picture_ex_063: "S:pierce D:inherit",
    picture_ex_078: "S:seal M:pierce",
    picture_ex_070: "M:charge M:twin",
    picture_ex_059: "S:prepare M:twin",
    picture_ex_065: "S:study D:inherit",
    picture_ex_042: "S:charge M:devour",
    picture_ex_048: "M:charge M:burst",
    picture_ex_050: "S:pierce M:charge",
    picture_ex_068: "E:charge M:burst",
    picture_ex_075: "S:charge M:timeStop",
    picture_ex_067: "S:ambush M:bomb",
    picture_ex_073: "S:ward M:shelter",
    picture_ex_080: "S:study M:bomb",
    picture_ex_102: "S:charge M:burst D:bomb",
    source_monster_008: "S:purify M:devour D:inherit",
    source_monster_005: "S:scout M:shelter D:inherit",
    water_010: "S:study M:recycle D:recall",
    source_monster_013: "S:charge M:burst D:study",
    source_monster_019: "S:prepare M:devour E:charge",
    source_monster_020: "S:scout M:recycle E:chorus",
    gallery_spell_016: "M:deploy M:recall",
    gallery_spell_048: "M:deploy M:sanctuary",
    nc_sp_ss_005: "M:recycle M:chorus",
    gallery_spell_008: "M:exchange M:chorus",
    gallery_spell_027: "M:deploy M:purify",
    gallery_spell_049: "M:token M:chorus",
    gallery_spell_009: "M:exchange M:recover",
    gallery_spell_024: "M:recall M:shelter",
    source_monster_003: "M:scout",
    source_spell_022: "M:study M:deploy M:shelter",
    gallery_spell_034: "M:revive M:purify",
    gallery_spell_047: "M:revive M:sanctuary",
    picture_ex_011: "S:charge M:timeStop M:twin",
    picture_ex_013: "S:charge M:timeStop D:recover",
    gallery_spell_058: "M:recover M:deploy M:chorus",
    gallery_spell_061: "M:recover M:recycle M:shelter",
    gallery_spell_062: "M:prepare M:revive M:chorus",
    gallery_spell_066: "M:recall M:recover M:deploy",
    gallery_spell_067: "M:scout M:deploy M:purify",
    gallery_spell_068: "M:freeze M:seal M:study",
    gallery_spell_069: "M:prepare M:recall M:revive",
    gallery_spell_070: "M:exchange M:shelter M:chorus",
});

const TRIGGERS = { S: "onSummon", M: "manual", D: "onDestroyed", E: "onTurnEnd" };
const TIMING = { onSummon: "通常召唤成功时", manual: "主要阶段", onDestroyed: "被破坏送入墓地时", onTurnEnd: "自己的结束阶段", onAttacked: "对方攻击宣言时" };
const LABELS = {
    scout: "寻找伙伴", study: "构思", prepare: "积累记忆", recover: "重逢", recycle: "往复", deploy: "登台", revive: "再演", recall: "越界归来",
    shelter: "庇护", seal: "封印", sleep: "幻梦", freeze: "静止", poison: "毒蝶", bomb: "引爆", charge: "蓄势", burst: "解放",
    twin: "连击", pierce: "贯穿", ward: "界限", ambush: "伏线", token: "替身", exchange: "交替", chorus: "合奏", sanctuary: "献祭祈愿",
    purify: "净化", intercept: "阻断", mirror: "映照", rescue: "救援", reversal: "反转", retreat: "撤离", reprisal: "追偿", returnSelf: "死亡回归", inherit: "传承", devour: "吞噬", timeStop: "时间停止",
};
const CHARACTER_SKILLS = {
    picture_ex_017: { token: "恐龙化", devour: "群猎本能", inherit: "兽群传承" },
    picture_ex_011: { charge: "白金蓄势", timeStop: "白金之星·世界", twin: "欧拉连打" },
    picture_ex_012: { ambush: "无声布置", bomb: "第一炸弹", prepare: "败者伏线" },
    picture_ex_072: { returnSelf: "死亡回归", study: "记忆推演" },
    source_monster_010: { ward: "无下限", seal: "术式干涉", inherit: "术式传承" },
    source_monster_013: { charge: "苍与赫", burst: "虚式茈", study: "六眼推演" },
};
export function hasAuthoredRules(id) { return Object.hasOwn(RECIPES, id); }

export function authoredCardRules(card) {
    if (card.series === "starter_ygo") return card;
    const recipe = RECIPES[card.id];
    if (!recipe) throw new Error(`缺少逐卡设计：${card.id} ${card.name}`);
    const rank = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4 }[card.rarity];
    const motif = card.name.split(/[·・]/).at(-1);
    const effects = recipe.split(" ").map((part, index) => {
        const [timing, action] = part.split(":");
        const trigger = card.type === "trap" ? "onAttacked" : TRIGGERS[timing];
        const skillName = CHARACTER_SKILLS[card.id]?.[action] || `${motif}·${LABELS[action]}`;
        const paid = card.type === "spell" && index === 0 && rank >= 3;
        const cost = paid ? { type: "payLife", value: rank === 4 ? 1000 : 600 } : undefined;
        const description = `${TIMING[trigger]}，同名此效果每回合1次：${cost ? `支付${cost.value}LP；` : ""}${ACTION_TEXT[action]}。`;
        const skillLabel = { onSummon: "登场技", manual: "主动技", onDestroyed: "遗志技", onTurnEnd: "结束阶段技", onAttacked: "反击技" }[trigger];
        return { type: "themedAction", action, trigger, skillName, skillLabel, description, oncePerTurn: true, hardOncePerTurn: true, ...(cost ? { cost } : {}) };
    });
    // Printed rarity does not silently inflate level-4 bodies into tribute bosses.
    const level = Number(card.level) || 1;
    const cap = level <= 4 ? 1900 + rank * 50 : level <= 6 ? 2400 + rank * 50 : 2800 + rank * 100;
    return {
        ...card, effects, effect: undefined, isFieldSpell: false,
        ...(card.type === "monster" ? { attack: Math.min(Number(card.attack) || 0, cap), defense: Math.min(Number(card.defense) || 0, cap + 200) } : {}),
        description: effects.map(e => `【${e.skillName}】${e.description}`).join("\n"),
        ruleSignature: recipe, ruleTier: card.rarity, rulesVersion: "2026-09-themed-v1",
        designNotes: { cardName: card.name, artwork: card.image, motif, source: card.lore || "依据本项目卡名与卡面主题设计；不是原作技能设定的逐字还原", resourcePlan: effects.map(e => LABELS[e.action]).join(" → ") },
        aiHints: { ...card.aiHints, role: effects.some(e => ["seal", "sleep", "freeze"].includes(e.action)) ? "control" : effects.some(e => ["deploy", "revive", "recover"].includes(e.action)) ? "support" : "attacker" },
    };
}
