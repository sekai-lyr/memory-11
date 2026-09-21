import { createTimeline, splitText, stagger, waapi } from "../node_modules/animejs/dist/modules/index.js";

const FULL_TIMING = Object.freeze({
    total: 1100,
    cardStagger: 35,
    heroReveal: 420,
    copyReveal: 620,
    uiSettle: 780,
});

const REDUCED_TIMING = Object.freeze({
    total: 0,
    cardStagger: 0,
    heroReveal: 0,
    copyReveal: 0,
    uiSettle: 0,
});

const PACK_TIMING = Object.freeze({
    cardStagger: 42,
    total: 980,
    tear: 180,
    reveal: 560,
});

const REDUCED_PACK_TIMING = Object.freeze({ cardStagger: 0, total: 0, tear: 0, reveal: 0 });

export function getIgnitionTiming(reducedMotion = false) {
    return reducedMotion ? REDUCED_TIMING : FULL_TIMING;
}

export function getPackOverloadTiming(reducedMotion = false) {
    return reducedMotion ? REDUCED_PACK_TIMING : PACK_TIMING;
}

export function selectIgnitionCards(cards = [], limit = 8) {
    const selected = [];
    const seen = new Set();
    for (const card of cards) {
        if (!card?.id || seen.has(card.id)) continue;
        seen.add(card.id);
        selected.push(card);
        if (selected.length >= limit) break;
    }
    return selected;
}

function prefersReducedMotion(root, requested) {
    if (typeof requested === "boolean") return requested;
    const view = root?.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
    return Boolean(view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

function noopHandle() {
    return { cancel() {}, play() {} };
}

function resetIgnitionState(root) {
    root.classList.remove("is-ignited", "is-launching", "is-static");
    root.querySelectorAll(".ignition-flight").forEach(flight => {
        flight.style.removeProperty("transform");
    });
    root.querySelectorAll(".ignition-card").forEach(card => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
    });
    root.querySelectorAll(".ignition-word").forEach(word => {
        word.style.removeProperty("transform");
        word.style.removeProperty("opacity");
    });
}

function makeStable(root) {
    root.classList.add("is-ignited", "is-static");
    root.querySelectorAll(".ignition-flight, .ignition-card, .ignition-word").forEach(element => {
        element.style.opacity = "1";
    });
}

function createTitleSplit(root) {
    const title = root.querySelector(".ignition-title");
    if (!title) return null;
    if (!root.__ignitionSplit) {
        root.__ignitionSplit = splitText(title, {
            words: { wrap: "clip", class: "ignition-word" },
            accessible: true,
        });
    }
    return root.__ignitionSplit;
}

export function playCardIgnition(root, options = {}) {
    if (!root) return noopHandle();
    const reducedMotion = prefersReducedMotion(root, options.reducedMotion);
    const timing = getIgnitionTiming(reducedMotion);
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};

    resetIgnitionState(root);
    if (reducedMotion) {
        makeStable(root);
        onComplete();
        return noopHandle();
    }

    root.classList.add("is-igniting");
    const flights = [...root.querySelectorAll(".ignition-flight")];
    const cards = flights.map(flight => flight.querySelector(".ignition-card")).filter(Boolean);
    const hero = root.querySelector(".ignition-hero-card");
    const copy = root.querySelector(".ignition-copy");
    const dock = root.querySelector(".ignition-dock");
    const split = createTitleSplit(root);
    const animations = [];

    if (flights.length) {
        animations.push(waapi.animate(flights, {
            translateX: element => [0, Number(element.dataset.igniteX || 0)],
            translateY: element => [0, Number(element.dataset.igniteY || 0)],
            delay: stagger(timing.cardStagger),
            duration: 720,
            ease: "outExpo",
        }));
        animations.push(waapi.animate(cards, {
            scale: [0.42, 1],
            rotate: element => [Number(element.dataset.igniteRotate || 0) - 10, Number(element.dataset.igniteRotate || 0)],
            opacity: [0, 1],
            delay: stagger(timing.cardStagger),
            duration: 560,
            ease: "outBack",
        }));
    }

    const timeline = createTimeline({
        autoplay: false,
        defaults: { ease: "outExpo" },
    });

    if (hero) {
        timeline.add(hero, {
            opacity: [0, 1],
            scale: [0.78, 1],
            rotateY: [-82, 0],
            translateY: [18, 0],
            duration: 560,
        }, timing.heroReveal);
    }
    if (copy) {
        timeline.add(copy, {
            opacity: [0, 1],
            translateY: [22, 0],
            duration: 420,
        }, timing.copyReveal);
    }
    if (split?.words?.length) {
        timeline.add(split.words, {
            opacity: [0, 1],
            translateY: [26, 0],
            delay: stagger(48),
            duration: 480,
            ease: "outBack",
        }, timing.copyReveal + 40);
    }
    if (dock) {
        timeline.add(dock, {
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 360,
        }, timing.uiSettle);
    }
    timeline.call(() => {
        root.classList.remove("is-igniting");
        root.classList.add("is-ignited");
        onComplete();
    }, timing.total);
    timeline.play();

    return {
        cancel() {
            timeline.pause();
            // Edge 在已完成或已脱离 DOM 的 WAAPI 动画上执行
            // commitStyles()+cancel() 会偶发卡死渲染线程；暂停后页面根节点
            // 会被下一次路由渲染替换，避免再次触发这个原生取消路径。
            animations.forEach(animation => animation.pause());
            resetIgnitionState(root);
        },
        play() {
            timeline.play();
        },
    };
}

export function playDuelLaunch(root, options = {}) {
    if (!root) {
        options.onComplete?.();
        return noopHandle();
    }
    const reducedMotion = prefersReducedMotion(root, options.reducedMotion);
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};
    if (reducedMotion) {
        onComplete();
        return noopHandle();
    }

    const target = root.querySelector(".ignition-hero-card") || root;
    const overlay = root.querySelector(".ignition-launch-overlay");
    const timeline = createTimeline({
        autoplay: false,
        defaults: { ease: "outExpo" },
    });
    root.classList.add("is-launching");
    timeline.add(target, {
        scale: [1, 1.16],
        rotateY: [0, 12],
        translateZ: [0, 140],
        duration: 360,
        ease: "inBack",
    });
    if (overlay) {
        timeline.add(overlay, {
            opacity: [0, 1],
            scale: [0.55, 1.35],
            duration: 430,
            ease: "outExpo",
        }, "-=180");
    }
    timeline.call(() => {
        root.classList.remove("is-launching");
        onComplete();
    }, "+=80");
    timeline.play();
    return {
        cancel() {
            timeline.pause();
            root.classList.remove("is-launching");
        },
        play() {
            timeline.play();
        },
    };
}

export function playPackOverload(root, options = {}) {
    if (!root) return noopHandle();
    const reducedMotion = prefersReducedMotion(root, options.reducedMotion);
    const timing = getPackOverloadTiming(reducedMotion);
    const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};
    const pack = root.querySelector(".digital-pack");
    const burst = root.querySelector(".pack-burst");
    const copy = root.querySelector(".pack-stage-copy");
    const previews = [...root.querySelectorAll(".pack-preview-card")];

    if (reducedMotion) {
        root.classList.add("is-pack-open", "is-static");
        onComplete();
        return noopHandle();
    }

    root.classList.add("is-pack-opening");
    const animations = [];
    if (previews.length) {
        animations.push(waapi.animate(previews, {
            translateX: element => [0, Number(element.dataset.packX || 0)],
            translateY: [70, 0],
            rotate: element => [Number(element.dataset.packRotate || 0) - 12, Number(element.dataset.packRotate || 0)],
            scale: [.52, 1],
            opacity: [0, 1],
            delay: stagger(timing.cardStagger),
            duration: 520,
            ease: "outBack",
        }));
    }

    const timeline = createTimeline({ autoplay: false, defaults: { ease: "outExpo" } });
    if (pack) {
        timeline.add(pack, {
            scale: [1, 1.16],
            rotate: [-4, 0],
            duration: 260,
            ease: "outBack",
        }, timing.tear);
        timeline.add(pack, {
            scale: [1.16, .72],
            rotateY: [0, 68],
            opacity: [1, 0],
            duration: 360,
            ease: "inBack",
        }, timing.tear + 160);
    }
    if (burst) {
        timeline.add(burst, {
            scale: [.15, 1.8],
            opacity: [0, .9, 0],
            duration: 430,
            ease: "outExpo",
        }, timing.tear + 130);
    }
    if (copy) {
        timeline.add(copy, {
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 320,
        }, timing.reveal);
    }
    timeline.call(() => {
        root.classList.remove("is-pack-opening");
        root.classList.add("is-pack-open");
        onComplete();
    }, timing.total);
    timeline.play();

    return {
        cancel() {
            timeline.pause();
            animations.forEach(animation => animation.pause());
            root.classList.remove("is-pack-opening");
        },
        play() {
            timeline.play();
        },
    };
}

export function playAuthIgnition(root, options = {}) {
    if (!root) return noopHandle();
    const reducedMotion = prefersReducedMotion(root, options.reducedMotion);
    if (reducedMotion) {
        root.classList.add("is-auth-ready");
        return noopHandle();
    }
    const cards = [...root.querySelectorAll(".auth-ignition-card")];
    const panel = root.querySelector(".auth-panel");
    const timeline = createTimeline({ autoplay: false, defaults: { ease: "outExpo" } });
    if (cards.length) {
        timeline.add(cards, {
            opacity: [0, 1],
            scale: [0.56, 1],
            rotate: element => [Number(element.dataset.authRotate || -8), 0],
            delay: stagger(55),
            duration: 520,
            ease: "outBack",
        });
    }
    if (panel) {
        timeline.add(panel, {
            opacity: [0, 1],
            translateY: [28, 0],
            duration: 520,
        }, "-=300");
    }
    timeline.call(() => root.classList.add("is-auth-ready"));
    timeline.play();
    return {
        cancel() {
            timeline.pause();
        },
        play() {
            timeline.play();
        },
    };
}
