import assert from "node:assert/strict";
import test from "node:test";

import { ALL_CARDS } from "../../main/resources/static/js/catalog.js";

test("迪亚哥·骇人恶兽使用角色专属恐龙效果", () => {
    const card = ALL_CARDS.find(item => item.id === "picture_ex_017");
    assert.ok(card);
    assert.deepEqual(card.effects.map(effect => effect.action), [
        "token",
        "devour",
        "inherit",
    ]);
    assert.match(card.description, /恐龙化/);
    assert.match(card.description, /群猎本能/);
    assert.match(card.description, /兽群传承/);
    assert.doesNotMatch(card.description, /锋芒觉醒|领域威压|弱点处刑/);
});
