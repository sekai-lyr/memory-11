import test from "node:test";
import assert from "node:assert/strict";

import { getIgnitionTiming, getPackOverloadTiming, selectIgnitionCards } from "../js/card-ignition.js";

test("card ignition timing", async t => {
    await t.test("full sequence uses the A direction timing", () => {
        const timing = getIgnitionTiming(false);
        assert.equal(timing.total, 1100);
        assert.equal(timing.cardStagger, 35);
        assert.equal(timing.heroReveal, 420);
        assert.equal(timing.copyReveal, 620);
        assert.equal(timing.uiSettle, 780);
    });

    await t.test("reduced motion resolves without a visible sequence", () => {
        const timing = getIgnitionTiming(true);
        assert.equal(timing.total, 0);
        assert.equal(timing.cardStagger, 0);
    });

    await t.test("selects at most eight unique cards and preserves order", () => {
        const cards = [
            { id: "one" },
            { id: "two" },
            { id: "one" },
            { id: "three" },
            { id: "four" },
            { id: "five" },
            { id: "six" },
            { id: "seven" },
            { id: "eight" },
            { id: "nine" },
        ];
        assert.deepEqual(selectIgnitionCards(cards), [
            cards[0], cards[1], cards[3], cards[4], cards[5], cards[6], cards[7], cards[8],
        ]);
    });

    await t.test("pack overload keeps a visible stagger and finite total", () => {
        const timing = getPackOverloadTiming(false);
        assert.equal(timing.cardStagger, 42);
        assert.equal(timing.total, 980);
        assert.ok(timing.reveal > timing.tear);
        assert.deepEqual(getPackOverloadTiming(true), { cardStagger: 0, total: 0, tear: 0, reveal: 0 });
    });
});
