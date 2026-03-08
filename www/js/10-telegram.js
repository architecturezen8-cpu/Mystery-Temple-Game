/* ═══════════════════════════════════════════════════════════════════════════
   10-TELEGRAM.JS
   Cloudflare Pages Functions bridge (NO bot token on frontend)
   - Reads tg token from URL
   - Sends finish payload to /api/finish
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const TG_FINISH_ENDPOINT = "/api/finish";

function tgCaptureTokenFromUrl() {
    const u = new URL(window.location.href);
    const tg = u.searchParams.get("tg");
    if (tg) {
        localStorage.setItem("tg_token", tg);
        return tg;
    }
    return null;
}

function tgGetToken() {
    return localStorage.getItem("tg_token");
}

function tgIsLinkedSession() {
    return Boolean(tgGetToken());
}

/**
 * Send finish event to backend (Cloudflare Pages Functions).
 * Uses fetch, and falls back to sendBeacon if available.
 */
async function tgNotifyFinish(answer, scoreVal, levelVal) {
    const tg = tgGetToken();
    if (!tg) return { ok: false, error: "No tg token in localStorage" };

    const payload = {
        tg,
        answer: String(answer || "N/A"),
        score: scoreVal ?? "?",
        level: levelVal ?? "?"
    };

    // Prefer fetch (gives response), but beacon is more reliable during navigations
    try {
        const res = await fetch(TG_FINISH_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        return { ok: res.ok && data.ok === true, data };
    } catch (e) {
        // Fallback: try sendBeacon (no response)
        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
                navigator.sendBeacon(TG_FINISH_ENDPOINT, blob);
                return { ok: true, beacon: true };
            }
        } catch { }
        return { ok: false, error: e };
    }
}

// Capture token once on page load (important)
tgCaptureTokenFromUrl();

window.tgNotifyFinish = tgNotifyFinish;
window.tgIsLinkedSession = tgIsLinkedSession;

console.log("✅ Telegram bridge loaded. Linked:", tgIsLinkedSession());