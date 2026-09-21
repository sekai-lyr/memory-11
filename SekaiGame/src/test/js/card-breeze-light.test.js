import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { cardArtHtml, cardVisualEffectHtml, cardVisualImageClass, cardVisualMotionStyle } from "../../main/resources/static/js/card-view.js";

const uiSource = readFileSync(fileURLToPath(new URL("../../main/resources/static/js/ui.js", import.meta.url)), "utf8");
const effectsSource = readFileSync(fileURLToPath(new URL("../../main/resources/static/js/effects.js", import.meta.url)), "utf8");
const styleSource = readFileSync(fileURLToPath(new URL("../../main/resources/static/css/style.css", import.meta.url)), "utf8");

test("breeze light is omitted from R cards", () => {
    assert.equal(cardVisualEffectHtml({ rarity: "R" }), "");
    assert.equal(cardVisualImageClass({ rarity: "R" }), "");
    assert.equal(cardVisualMotionStyle({ rarity: "R" }), "");
    assert.doesNotMatch(cardArtHtml({ id: "rare", name: "R card", rarity: "R", image: "/r.jpg" }), /card-breeze-overlay/u);
    assert.doesNotMatch(cardArtHtml({ id: "rare", name: "R card", rarity: "R", image: "/r.jpg" }), /card-breeze-image/u);
    assert.doesNotMatch(cardArtHtml({ id: "rare-fallback", name: "R fallback", rarity: "R" }), /card-breeze-overlay/u);
});

test("breeze light is available on every non-R card art path", () => {
    for (const rarity of ["N", "SR", "SSR", "UR"]) {
        assert.match(cardVisualEffectHtml({ rarity }), /card-breeze-overlay/u);
        assert.equal(cardVisualImageClass({ rarity }), "card-breeze-image");
        assert.match(cardVisualMotionStyle({ rarity }), /--card-breeze-delay:-[\d.]+s;/u);
        assert.match(cardArtHtml({ id: rarity, name: rarity, rarity, image: `/${rarity}.jpg` }), /card-breeze-overlay/u);
        assert.match(cardArtHtml({ id: rarity, name: rarity, rarity, image: `/${rarity}.jpg` }), /class="card-breeze-image"/u);
        assert.match(cardArtHtml({ id: `${rarity}-fallback`, name: rarity, rarity }), /card-breeze-overlay/u);
    }
    assert.match(uiSource, /cardVisualEffectHtml\(card\)/u);
    assert.match(uiSource, /cardVisualEffectHtml\(c\)/u);
    assert.match(uiSource, /cardVisualImageClass\(card\)/u);
    assert.match(effectsSource, /card\?\.rarity === "R"/u);
    assert.match(effectsSource, /card-breeze-image/u);
    assert.match(styleSource, /@keyframes cardBreezeImage/u);
});
