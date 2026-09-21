import test from "node:test";
import assert from "node:assert/strict";

global.document = {
    createElement: () => ({ textContent: "" }),
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
};

const { CardGameApp } = await import("../js/app.js?v=pack-persistence-test");

test("抽卡结果等待服务器保底同步完成后再展示", async () => {
    let releaseSync;
    const syncPromise = new Promise(resolve => { releaseSync = resolve; });
    const events = [];
    const app = Object.create(CardGameApp.prototype);
    app.collection = {
        cards: {},
        pityCounters: {},
        currency: {
            duelCoins: 1000,
            shards: { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 },
        },
        statistics: { packsOpened: 0 },
    };
    app.syncCollectionToServer = () => syncPromise;
    app.collectPulledCard = card => ({ card, newCard: false, newArt: false, shards: 0 });
    app.renderTopbar = () => events.push("topbar");
    app.showPackAnimation = () => events.push("animation");
    app.toast = () => events.push("toast");

    const opening = app.openPacks(1);
    await Promise.resolve();
    assert.deepEqual(events, []);

    releaseSync({ success: true });
    await opening;
    assert.deepEqual(events, ["topbar", "animation"]);
});
