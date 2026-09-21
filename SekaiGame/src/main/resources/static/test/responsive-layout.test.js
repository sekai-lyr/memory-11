import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("移动端布局保留可玩的决斗入口", async () => {
    const [html, css] = await Promise.all([
        readFile(path.join(ROOT, "index.html"), "utf8"),
        readFile(path.join(ROOT, "css", "style.css"), "utf8"),
    ]);
    assert.match(html, /name="viewport"[^>]+width=device-width/);
    assert.match(html, /style\.css\?v=1\.9\.2-mobile/);

    const mobileBlock = css.slice(css.lastIndexOf("Mobile playability"));
    assert.match(mobileBlock, /\.battle-screen\.active::after\s*\{[^}]*content:none;[^}]*display:none;/s);
    assert.match(mobileBlock, /\.battlefield\s*\{[^}]*width:calc\(100% - 68px\)/s);
    assert.match(mobileBlock, /\.hand\s*\{[^}]*overflow-x:auto;[^}]*touch-action:pan-x;/s);
    assert.match(mobileBlock, /\.center-controls\s*\{[^}]*left:50%;[^}]*transform:translateX\(-50%\)/s);
    assert.match(mobileBlock, /orientation:landscape/);
});
