/* ═══════════════════════════════════════════════════════════════════════════
   11-CINEMATIC.JS
   Mystery Temple - Galaxy Edition

   Handles:
   - Unlocking animation (after cipher password success)
   - Temple Wall reveal (typewriter Sinhala line)
   - Final dialog (YES/NO)
   - Cinematic credits (Transformers + hacking style)
   - Glitch "delete" ending + final goodbye screen
   
   ✅ MODIFIED: Added notifyGameComplete() call at temple wall reveal
   ✅ ADDED: Owner notification for YES/NO responses
   ✅ FIXED: img.crossOrigin removed for data: URLs (fixes img.onerror bug)
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ---------------------------------------------------------------------------
   OWNER NOTIFICATION HELPER
--------------------------------------------------------------------------- */
/**
 * Notify game owner about YES/NO response.
 * @param {string} answer - 'yes' or 'no'
 */
async function notifyOwner(answer) {
    // Get slug from localStorage (set by intro.html) or URL
    const slug = localStorage.getItem('game_slug')
        || new URLSearchParams(window.location.search).get('slug') || '';
    const ownerChatId = localStorage.getItem('owner_chat_id')
        || window.__OWNER_CHAT_ID || '';

    const backendUrl = 'https://telegram-bot-ten-bay.vercel.app/api/owner-notify';
    try {
        const resp = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, answer, owner_chat_id: ownerChatId })
        });
        const data = await resp.json();
        console.log(data.ok ? '✅ Owner notified' : '⚠️ Notify failed:', data);
    } catch (err) {
        console.error('notifyOwner error:', err);
    }
}

/* ---------------------------------------------------------------------------
   UNLOCK ANIMATION (uses #unlockAnimationOverlay from HTML)
--------------------------------------------------------------------------- */

async function startUnlockingAnimation() {
    const ov = getEl('unlockAnimationOverlay');
    const icon = getEl('unlockLockIcon');
    const txt = getEl('unlockText');
    const bar = getEl('unlockProgressBar');

    if (!ov || !txt || !bar || !icon) {
        showFinalSinhalaMessage();
        return;
    }

    hideEl('cipherTranslationOverlay');

    ov.classList.remove('hidden');
    icon.textContent = '🔒';
    icon.classList.remove('unlocked');
    txt.textContent = 'UNLOCKING...';
    bar.style.width = '0%';

    const stages = [
        { p: 18, t: 'AUTHENTICATING...' },
        { p: 38, t: 'DECRYPTING...' },
        { p: 58, t: 'EXTRACTING...' },
        { p: 78, t: 'ANALYZING...' },
        { p: 95, t: 'FINALIZING...' },
        { p: 100, t: 'UNLOCKED!' }
    ];

    let cur = 0;
    for (const s of stages) {
        txt.textContent = s.t;

        await new Promise(resolve => {
            animateValue(cur, s.p, 420, (val) => {
                bar.style.width = `${Math.floor(val)}%`;
            }, resolve);
        });

        cur = s.p;
        await sleep(250);
    }

    icon.textContent = '🔓';
    icon.classList.add('unlocked');
    txt.textContent = '✅ UNLOCKED!';

    await sleep(700);
    ov.classList.add('hidden');

    showFinalSinhalaMessage();
}

window.startUnlockingAnimation = startUnlockingAnimation;

/* ---------------------------------------------------------------------------
   TEMPLE WALL REVEAL
--------------------------------------------------------------------------- */

let templeWallNextAction = 'finalDialog';

function openTempleWallScene(sinhalaMessage, otpCode, fullKey) {
    if (window.SoundManager) SoundManager.play('artifactCatch');
    const overlay = getEl('templeWallOverlay');
    const container = getEl('templeWallLines');

    if (!overlay || !container) {
        showFinalDialog();
        return;
    }

    container.innerHTML = '';
    templeWallLines = [];
    templeWallAnimTimeouts.forEach(t => clearTimeout(t));
    templeWallAnimTimeouts = [];

    const now = new Date();
    const dateStr = now.toLocaleDateString('si-LK', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit' });

    // Get both English and Sinhala from admin config
    const englishMsg = window.__FINAL_ENGLISH || FINAL_ENGLISH;
    const sinhalaMsg = window.__TEMPLE_WALL_SINHALA || TEMPLE_WALL_SINHALA;

    const lines = [
        { text: 'MYSTERY TEMPLE', cls: 'temple-wall-engraving-line glow-strong' },
        { text: 'SECRET MESSAGE UNLOCKED!', cls: 'temple-wall-engraving-line small dim' },
        // Show English message
        { text: englishMsg, cls: 'temple-wall-engraving-line', typewriter: true },
        // Show Sinhala message
        { text: sinhalaMsg, cls: 'temple-wall-engraving-line sinhala', typewriter: true },
        { text: `CODE: ${otpCode}`, cls: 'temple-wall-engraving-line code' },
        { text: `FULL DECRYPT KEY: ${fullKey}`, cls: 'temple-wall-engraving-line small code' },
        { text: `DATE: ${dateStr}`, cls: 'temple-wall-engraving-line small dim' },
        { text: `TIME: ${timeStr}`, cls: 'temple-wall-engraving-line small dim' }
    ];

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    lines.forEach(ln => {
        const div = document.createElement('div');
        div.className = ln.cls;

        if (ln.typewriter) {
            div.textContent = '';
            div.dataset.full = ln.text;

            const len = ln.text.length;
            if (len > 260) div.style.fontSize = '0.82em';
            else if (len > 200) div.style.fontSize = '0.9em';
            else if (len > 140) div.style.fontSize = '0.98em';
        } else {
            div.textContent = ln.text;
        }

        container.appendChild(div);
        templeWallLines.push(div);
    });

    templeWallLines.forEach((line, idx) => {
        const isSinhala = line.classList.contains('sinhala');

        const t = setTimeout(async () => {
            line.classList.add('show');

            // ✅ FIX: Auto-scroll the scrollable engraving area, fallback to panel
            const engraving = line.closest('.temple-wall-engraving');
            const panel = line.closest('.temple-wall-panel');
            const scrollTarget = engraving || panel;
            if (scrollTarget) scrollTarget.scrollTop = scrollTarget.scrollHeight;

            if (isSinhala) {
                const full = line.dataset.full || '';
                await typeLineWithin(line, full, 6000);
                // Scroll again after typewriter finishes
                if (scrollTarget) scrollTarget.scrollTop = scrollTarget.scrollHeight;
            }
        }, 450 + idx * 520);

        templeWallAnimTimeouts.push(t);
    });

    templeWallActive = true;
}

async function typeLineWithin(el, text, durationMs) {
    const total = Math.max(text.length, 1);
    const perChar = Math.max(8, Math.floor(durationMs / total));
    el.textContent = '';

    for (let i = 0; i < text.length; i++) {
        el.textContent += text[i];
        await sleep(perChar);
    }
}

/* ====== BEGIN REPLACE: showFinalSinhalaMessage (with notifyGameComplete) ====== */
/**
 * ✅ FIX: Called after cipher unlock animation.
 * Opens temple wall first, then final dialog.
 * Also notifies Telegram bot that the game is complete.
 */
function showFinalSinhalaMessage() {
    // ✅ Use admin-config temple wall if available
    const combinedSinhala =
        (window.__GAME_CONFIG?.templeWallSinhala) ||
        (typeof TEMPLE_WALL_SINHALA !== 'undefined' ? TEMPLE_WALL_SINHALA : '') ||
        (Array.isArray(allSinhalaMessages) ? allSinhalaMessages.join(' ') : '') ||
        (typeof FINAL_SINHALA !== 'undefined' ? FINAL_SINHALA : '');

    const otp = (typeof getCombinedOTP === 'function') ? getCombinedOTP() : '';
    const fullKey = (typeof getCombinedPassword === 'function') ? getCombinedPassword() : '';

    gamePaused = true;

    setTimeout(() => {
        templeWallNextAction = 'finalDialog';
        openTempleWallScene(combinedSinhala, otp, fullKey);

        // ✅ Send player Telegram message (game complete) ONCE
        (async () => {
            if (window.__game_complete_sent__) return;
            window.__game_complete_sent__ = true;

            const slug         = new URLSearchParams(window.location.search).get('slug')
                                  || localStorage.getItem('game_slug') || '';
            const playerChatId = localStorage.getItem('player_chat_id')
                                  || window.__PLAYER_CHAT_ID || '';
            const accessCode   = localStorage.getItem('access_code')
                                  || window.__ACCESS_CODE || '';

            if (!slug && !playerChatId && !accessCode) {
                console.warn('⚠️ game-complete: no slug/chat_id/access_code, skipping');
                return;
            }

            try {
                const payload = { slug };
                // Send player_chat_id directly so bot does not need game_recipients lookup
                if (playerChatId) payload.player_chat_id = playerChatId;
                if (accessCode)   payload.access_code    = accessCode;

                const r = await fetch('https://telegram-bot-ten-bay.vercel.app/api/game-complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const j = await r.json().catch(() => ({}));
                console.log('✅ game-complete response:', r.status, j);

                if (!r.ok) {
                    console.warn('⚠️ Player Telegram not sent. Reason:', j.error || j);
                }
            } catch (e) {
                console.error('❌ game-complete fetch failed:', e);
            }
        })();

    }, 200);
}
/* ====== END REPLACE: showFinalSinhalaMessage ====== */

function showTempleWallAndCredits() {
    const combinedSinhala = allSinhalaMessages.join(' ') || FINAL_SINHALA;
    const otp = getCombinedOTP();
    const fullKey = getCombinedPassword();

    templeWallNextAction = 'credits';
    openTempleWallScene(combinedSinhala, otp, fullKey);
}

window.showTempleWallAndCredits = showTempleWallAndCredits;

async function closeTempleWallAndShowCredits() {
    const overlay = getEl('templeWallOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.classList.add('hidden'), 450);
    }

    templeWallActive = false;

    const notice = getEl('telegramSendingNotice');
    if (notice) notice.classList.remove('hidden');

    const answer = (playerResponse ? playerResponse.toUpperCase() : "N/A");

    let sentOk = false;
    if (!window.__tg_finish_sent__ && typeof window.tgNotifyFinish === "function") {
        window.__tg_finish_sent__ = true;
        const r = await window.tgNotifyFinish(answer, score, currentLevel + 1);
        sentOk = Boolean(r && r.ok);
    }

    if (notice) notice.classList.add('hidden');

    if (templeWallNextAction === 'credits') startCinematicCredits();
    else showFinalDialog();
}

window.closeTempleWallAndShowCredits = closeTempleWallAndShowCredits;

/* ---------------------------------------------------------------------------
   FINAL DIALOG + YES/NO RESPONSE
--------------------------------------------------------------------------- */

function showFinalDialog() {
    if (window.SoundManager) SoundManager.play('qrReveal');
    const msg = getEl('finalDialogMessage');
    const ov = getEl('finalDialogOverlay');

    if (msg) {
        // Use admin configured messages
        const eng = window.__FINAL_ENGLISH || FINAL_ENGLISH;
        const sin = window.__FINAL_SINHALA || FINAL_SINHALA;
        
        // Show both if both are configured
        let msgHTML = '';
        if (eng && eng.trim()) {
            msgHTML += `<strong>English:</strong> ${eng}`;
        }
        if (sin && sin.trim()) {
            if (msgHTML) msgHTML += '<br><br>';
            msgHTML += `<strong>සිංහල:</strong> ${sin}`;
        }
        
        msg.innerHTML = msgHTML || 'No message configured';
    }
    if (ov) ov.classList.remove('hidden');
}

async function playResponseAnimation(type) {
    // Final message එකෙන් පස්සේ extra handshake / slap animation අවශ්‍ය නැහැ.
    await sleep(120);
}

/* ---------------------------------------------------------------------------
   ⭐ MODIFIED: YES/NO handlers with owner notification
--------------------------------------------------------------------------- */
async function handleYesResponse() {
    playerResponse = 'yes';
    hideEl('finalDialogOverlay');

    // Owner ට notification එක යවන්න (await නොකර)
    notifyOwner('yes');

    const icon = getEl('thankYouIcon');
    if (icon) icon.textContent = '💖';
    const yesText = window.__YES_RESPONSE || YES_RESPONSE;
    setText('thankYouMessage', yesText);

    showEl('thankYouOverlay');

    setTimeout(() => {
        if (!creditsActive && !glitchDeleteActive) startCinematicCredits();
    }, 3800);
}

async function handleNoResponse() {
    playerResponse = 'no';
    hideEl('finalDialogOverlay');

    // Owner ට notification එක යවන්න (await නොකර)
    notifyOwner('no');

    const icon = getEl('thankYouIcon');
    if (icon) icon.textContent = '😊';
    const noText = window.__NO_RESPONSE || NO_RESPONSE;
    setText('thankYouMessage', noText);

    showEl('thankYouOverlay');

    setTimeout(() => {
        if (!creditsActive && !glitchDeleteActive) startCinematicCredits();
    }, 3800);
}

window.showFinalDialog = showFinalDialog;
window.handleYesResponse = handleYesResponse;
window.handleNoResponse = handleNoResponse;

/* ── Custom message send (from final dialog textarea) ── */
function autoExpandMsg(el) {
    const MAX = 120;
    el.style.height = 'auto';
    const sh = el.scrollHeight;
    if (sh <= MAX) {
        el.style.height = sh + 'px';
        el.style.overflowY = 'hidden';
    } else {
        el.style.height = MAX + 'px';
        el.style.overflowY = 'auto';
    }
}

async function sendCustomMessage() {
    const inp   = document.getElementById('customMsgInput');
    const sentEl = document.getElementById('customMsgSent');
    const msg   = (inp ? inp.value : '').trim();
    if (!msg) return;

    const slug        = localStorage.getItem('game_slug')
                        || new URLSearchParams(window.location.search).get('slug') || '';
    const ownerChatId = localStorage.getItem('owner_chat_id')
                        || window.__OWNER_CHAT_ID || '';

    try {
        await fetch('https://telegram-bot-ten-bay.vercel.app/api/owner-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug,
                answer: msg,
                type: 'custom_message',
                owner_chat_id: ownerChatId
            })
        });
    } catch(e) { console.warn('sendCustomMessage error:', e); }

    if (inp) { inp.value = ''; inp.style.height = 'auto'; }
    if (sentEl) {
        sentEl.classList.remove('hidden');
        setTimeout(() => sentEl.classList.add('hidden'), 3500);
    }
    
    // Close popup and final dialog, then proceed to thank you screen
    hideEl('customMessagePopup');
    hideEl('finalDialogOverlay');
    
    // Show thank you overlay with custom icon
    const icon = getEl('thankYouIcon');
    if (icon) icon.textContent = '💌';
    const customThankMsg = "Thank you for your message! 💌";
    setText('thankYouMessage', customThankMsg);
    
    showEl('thankYouOverlay');
    
    // Proceed to credits
    setTimeout(() => {
        if (!creditsActive && !glitchDeleteActive) startCinematicCredits();
    }, 3800);
}

function toggleCustomMessage() {
    hideEl('finalDialogOverlay');
    showEl('customMessagePopup');
}

function closeCustomMessagePopup() {
    hideEl('customMessagePopup');
    showEl('finalDialogOverlay');
}

window.autoExpandMsg = autoExpandMsg;
window.sendCustomMessage = sendCustomMessage;
window.toggleCustomMessage = toggleCustomMessage;
window.closeCustomMessagePopup = closeCustomMessagePopup;

/* ---------------------------------------------------------------------------
   CINEMATIC CREDITS (from cinamatic.html)
--------------------------------------------------------------------------- */

/* ====== BEGIN: startCinematicCredits (fully inline from cinamatic.html) ====== */

/* ─── Save game result to Supabase game_receipts ─── */
async function saveGameReceipt() {
    try {
        if (window.__receipt_saved__) return;
        window.__receipt_saved__ = true;

        const slug       = localStorage.getItem('game_slug')
                           || new URLSearchParams(window.location.search).get('slug') || '';
        const accessCode = localStorage.getItem('access_code')
                           || window.__ACCESS_CODE || window.__GAME_ROW__?.access_code || '';
        const playerChatId = localStorage.getItem('player_chat_id')
                              || window.__PLAYER_CHAT_ID || '';
        const receiverName = window.__RECEIVER_NAME
                              || localStorage.getItem('receiver_name') || '';
        const answer     = (playerResponse ? playerResponse.toUpperCase() : 'N/A');
        const scoreVal   = (typeof score !== 'undefined') ? score : 0;
        const levelVal   = (typeof currentLevel !== 'undefined') ? currentLevel + 1 : 1;

        if (!slug && !accessCode) {
            console.warn('⚠️ saveGameReceipt: no slug or access_code, skipping');
            return;
        }

        if (!window.supabase?.createClient) {
            console.warn('⚠️ saveGameReceipt: Supabase not loaded');
            return;
        }

        const sbClient = window.supabase.createClient(
            'https://hdqcehofpuinlatpkgml.supabase.co',
            'sb_publishable_vq4f1sF543S-F_vNSDSaIg_iEl7oeX-'
        );

        const payload = {
            slug,
            access_code: accessCode,
            player_chat_id: playerChatId,
            receiver_name: receiverName,
            answer,
            score: scoreVal,
            level_reached: levelVal,
            created_at: new Date().toISOString()
        };

        // upsert: slug already exists → update instead of insert (fixes 409 conflict)
        const { error } = await sbClient.from('game_receipts').upsert(payload, {
            onConflict: 'slug',
            ignoreDuplicates: false
        });
        if (error) {
            console.warn('⚠️ game_receipts upsert error:', error.message);
        } else {
            console.log('✅ Game receipt saved to Supabase:', payload);
        }
    } catch (e) {
        console.error('❌ saveGameReceipt error:', e);
    }
}

let cinematicCreditsIds = [
    'cinematicCredit1', 'cinematicCredit2', 'cinematicCredit3', 'cinematicCredit4', 'cinematicCredit5',
    'cinematicCredit6', 'cinematicCredit7', 'cinematicCredit8', 'cinematicCredit9', 'cinematicCredit10',
    'cinematicCredit11', 'cinematicCredit12', 'cinematicCredit13', 'cinematicCredit14', 'cinematicCredit15'
];

let cinematicCurrentIndex = 0;
let cinematicInterval;
let cinematicStartTime;
let cinematicProgressInterval;
let cinematicCountdownInterval;
let cinematicTimeoutId;

const cinematicTotalDuration = 60000; // 1 minute
const cinematicCreditDuration = 3000; // 3s per credit
const cinematicTitleDisplayDuration = 15000; // 15s for title

function startCinematicCredits() {
    if (creditsActive) return;
    creditsActive = true;

    // ── Save result to Supabase game_receipts ──
    saveGameReceipt();

    // ── Sound: respect game_config soundEnabled flag ──
    const soundEnabled = (window.__GAME_CONFIG?.soundEnabled !== false);

    // Fade out background music
    if (soundEnabled && window.SoundManager && SoundManager.stopBgMusic) SoundManager.stopBgMusic(1500);

    hideEl('thankYouOverlay');
    hideEl('finalWinOverlay');
    hideEl('localDecrypterOverlay');

    showEl('cinematicCreditsOverlay');

    // ✅ Ensure skip button is always visible
    const skipBtn = document.getElementById('creditsSkipBtn');
    if (skipBtn) {
        skipBtn.classList.remove('hidden', 'hidden-skip');
        skipBtn.style.display = '';
        skipBtn.style.visibility = 'visible';
        skipBtn.style.opacity = '1';
        skipBtn.style.pointerEvents = 'auto';
    }

    cinematicCurrentIndex = 0;
    cinematicHideAllCredits();
    cinematicShowCredit(0);

    cinematicStartTime = Date.now();

    cinematicProgressInterval = setInterval(cinematicUpdateProgress, 100);
    cinematicCountdownInterval = setInterval(cinematicUpdateCountdown, 100);
    cinematicInterval = setInterval(cinematicNextCredit, cinematicCreditDuration);

    // Play credits music — separate flag: creditsMusicEnabled
    const creditsMusicOn = (window.__GAME_CONFIG?.creditsMusicEnabled !== false);
    const audio = document.getElementById('creditsMusic');
    if (audio && creditsMusicOn) {
        audio.volume = 0.3;
        audio.play().catch(e => {
            console.log('Audio autoplay failed.');
            document.body.addEventListener('click', function playOnClick() {
                audio.play();
                document.body.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    } else if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    // Show bottom line
    setTimeout(() => {
        const bl = document.getElementById('cinematicBottomLine');
        if (bl) bl.classList.add('active');
    }, 1000);

    cinematicUpdateTimelineIndicator();

    // After full duration, go to delete sequence
    cinematicTimeoutId = setTimeout(() => {
        endCreditsAndStartGlitch();
    }, cinematicTotalDuration + 2000);
}

function cinematicHideAllCredits() {
    cinematicCreditsIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
}

function cinematicShowCredit(index) {
    if (index < cinematicCreditsIds.length) {
        const el = document.getElementById(cinematicCreditsIds[index]);
        if (el) el.classList.add('active');
    }
}

function cinematicNextCredit() {
    if (cinematicCurrentIndex < cinematicCreditsIds.length) {
        const el = document.getElementById(cinematicCreditsIds[cinematicCurrentIndex]);
        if (el) el.classList.remove('active');
    }

    cinematicCurrentIndex++;
    cinematicUpdateTimelineIndicator();

    if (cinematicCurrentIndex >= cinematicCreditsIds.length) {
        clearInterval(cinematicInterval);
        cinematicShowGameTitleAndSequence();
        return;
    }

    cinematicShowCredit(cinematicCurrentIndex);
}

function cinematicUpdateTimelineIndicator() {
    const indicator = document.getElementById('cinematicTimelineIndicator');
    if (indicator) {
        indicator.textContent = `CREDIT ${cinematicCurrentIndex + 1}/${cinematicCreditsIds.length} · 3s EACH`;
    }
}

function cinematicShowGameTitleAndSequence() {
    cinematicHideAllCredits();

    const indicator = document.getElementById('cinematicTimelineIndicator');
    if (indicator) indicator.textContent = 'MYSTERY TEMPLE · FINALE';

    const titleContainer = document.getElementById('cinematicGameTitle');
    if (titleContainer) titleContainer.classList.add('active');

    const subtitleEl = document.getElementById('cinematicGameSubtitle');
    if (subtitleEl) {
        subtitleEl.classList.remove('large');

        setTimeout(() => {
            subtitleEl.textContent = 'GALAXY EDITION';
            subtitleEl.classList.remove('large');
        }, 0);

        setTimeout(() => {
            subtitleEl.textContent = 'CUSTOMIZABLE GAME';
            subtitleEl.classList.remove('large');
        }, 4000);

        setTimeout(() => {
            subtitleEl.textContent = 'FOR FRIEND';
            subtitleEl.classList.remove('large');
        }, 8000);

        setTimeout(() => {
            subtitleEl.textContent = 'END';
            subtitleEl.classList.add('large');
        }, 12000);
    }

    // Fade out music
    setTimeout(() => {
        cinematicFadeOutMusic(3000);
    }, 12000);
}

function cinematicFadeOutMusic(duration) {
    const audio = document.getElementById('creditsMusic');
    if (!audio) return;
    const fadeInterval = 50;
    const steps = duration / fadeInterval;
    const step = audio.volume / steps;

    const fadeTimer = setInterval(() => {
        if (audio.volume > step) {
            audio.volume -= step;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fadeTimer);
        }
    }, fadeInterval);
}

function cinematicUpdateProgress() {
    const elapsed = Date.now() - cinematicStartTime;
    const percent = Math.min((elapsed / cinematicTotalDuration) * 100, 100);
    const bar = document.getElementById('cinematicProgressBar');
    if (bar) bar.style.width = percent + '%';

    if (percent >= 100 && cinematicCurrentIndex < cinematicCreditsIds.length) {
        clearInterval(cinematicInterval);
        clearInterval(cinematicProgressInterval);
        cinematicHideAllCredits();
        cinematicShowGameTitleAndSequence();
    }
}

function cinematicUpdateCountdown() {
    if (!cinematicStartTime) return;

    const elapsed = Date.now() - cinematicStartTime;
    const remaining = Math.max(cinematicTotalDuration - elapsed, 0);

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const milliseconds = Math.floor((remaining % 1000) / 10);

    const countdownEl = document.getElementById('cinematicCountdown');
    if (countdownEl) {
        if (remaining > 0) {
            countdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        } else {
            countdownEl.textContent = '00:00.00';
        }
    }
}

/**
 * Skip function (button ID fixed to 'creditsSkipBtn').
 */
function skipCredits() {
    // Stop all credits timers
    clearInterval(cinematicInterval);
    clearInterval(cinematicProgressInterval);
    clearInterval(cinematicCountdownInterval);
    clearTimeout(cinematicTimeoutId);

    // Fade out music
    cinematicFadeOutMusic(500);

    // Go to delete sequence
    endCreditsAndStartGlitch();
}

window.skipCredits = skipCredits;
/* ====== END: startCinematicCredits ====== */

/* ---------------------------------------------------------------------------
   GLITCH DELETE ENDING (from delete.html)
--------------------------------------------------------------------------- */

function endCreditsAndStartGlitch() {
    creditsActive = false;
    hideEl('cinematicCreditsOverlay');
    startGlitchDeleteSequence();
}

// Image for particle assembly
const DELETE_PROXY_URL = 'https://corsproxy.io/?';
const DELETE_IMAGE_URL = 'data:image/png;base64,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';

async function startGlitchDeleteSequence() {
    if (glitchDeleteActive) return;
    glitchDeleteActive = true;

    gamePaused = true;
    gameRunning = false;

    showEl('glitchDeleteOverlay');

    const term = document.getElementById('deleteTerminal');
    const progArea = document.getElementById('deleteProgressArea');
    const progFill = document.getElementById('deleteProgressFill');
    const progPercent = document.getElementById('deleteProgressPercent');
    const glitchCanvas = document.getElementById('deleteGlitchCanvas');
    const popupContainer = document.getElementById('deletePopupContainer');
    const particleCanvas = document.getElementById('deleteParticleCanvas');
    const ctxGlitch = glitchCanvas.getContext('2d');
    const ctxParticle = particleCanvas.getContext('2d');
    const audio = document.getElementById('deleteAudio');

    function resizeAll() {
        glitchCanvas.width = particleCanvas.width = window.innerWidth;
        glitchCanvas.height = particleCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeAll);
    resizeAll();

    function addLine(text, color = 'white', prompt = true) {
        const d = document.createElement('div');
        d.className = `line ${color}`;
        if (!prompt) d.classList.add('prompt-none');
        d.textContent = text;
        term.appendChild(d);
        term.scrollTop = term.scrollHeight;
    }

    const wait = ms => new Promise(r => setTimeout(r, ms));

    // ---------- DELETION SEQUENCE ----------
    async function runDeletion() {
        addLine('Microsoft Windows [Version 10.0.22621]', 'white', false);
        addLine('(c) 2025 Microsoft Corporation. All rights reserved.', 'white', false);
        addLine('', 'white', false);
        addLine('C:\\Users\\Admin\\Games> del /f /s /q "Mystery Temple"', 'white', false);
        await wait(600);
        addLine('WARNING: You are about to permanently delete "Mystery Temple - Galaxy Edition"', 'red');
        await wait(1200);
        addLine('This action cannot be undone. All saved data will be lost.', 'red');
        await wait(1400);
        addLine('Initiating secure deletion protocol ...', 'white');
        await wait(1000);

        progArea.style.display = 'block';
        addLine('Scanning game directories...', 'white');
        await wait(1300);
        addLine('Found 1,284 files, 214 folders.', 'green');
        await wait(900);

        const steps = 18;
        for (let i = 1; i <= steps; i++) {
            let p = Math.floor((i / steps) * 100);
            progFill.style.width = p + '%';
            progPercent.textContent = p + '%';

            if (i === 2) addLine('Removing core assets\\textures\\', 'white');
            else if (i === 4) addLine('Deleting sound\\music\\transformers_theme.mp3', 'white');
            else if (i === 6) addLine('Clearing save files...', 'green');
            else if (i === 8) addLine('Uninstalling modules\\three.js_runtime', 'white');
            else if (i === 10) addLine('Wiping database entries (supabase)', 'white');
            else if (i === 12) addLine('Accessing system registry...', 'red');
            else if (i === 13) {
                addLine('! ACCESS DENIED - retrying with admin privileges', 'red');
                await wait(600);
                addLine('Privilege escalation successful', 'green');
            } else if (i === 15) addLine('Purging cache files ...', 'white');
            else if (i === 17) addLine('Final cleanup', 'white');
            await wait(400 + (i % 3) * 150);
        }

        progFill.style.width = '100%';
        progPercent.textContent = '100%';
        await wait(800);
        addLine('', 'white');
        addLine('SUCCESS: Mystery Temple has been completely deleted.', 'green');
        await wait(500);
        addLine('All components removed. System reboot not required.', 'green');
        await wait(900);
        addLine('', 'white');
        addLine('C:\\Users\\Admin\\Games>', 'white', false);

        const cursorDiv = document.createElement('div');
        cursorDiv.className = 'cursor-line';
        cursorDiv.innerHTML = '<span class="prompt">></span><span class="cursor"></span>';
        term.appendChild(cursorDiv);
        term.scrollTop = term.scrollHeight;

        await wait(1800);
        startDeleteGlitchCycle();
    }

    // ---------- GLITCH CYCLE ----------
    let deleteGlitchActive = false;
    let deleteGlitchFrame;
    let deletePopupInterval;
    let deleteCycleRunning = true;

    function startDeleteGlitchCycle() {
        glitchCanvas.style.display = 'block';
        popupContainer.style.display = 'block';
        deleteCycleRunning = true;
        deleteGlitchActive = true;
        drawDeleteGlitch();

        deletePopupInterval = setInterval(() => {
            if (!deleteCycleRunning) return;
            for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) createDeleteRedPopup();
        }, 300);

        runDeleteGlitchPattern();
    }

    function createDeleteRedPopup() {
        if (!deleteCycleRunning) return;
        const pop = document.createElement('div');
        pop.className = 'popup';
        const messages = [
            '⚠️ CRITICAL ERROR', '⚠️ HACK DETECTED', '⚠️ SYSTEM CRASH',
            '⚠️ ACCESS VIOLATION', '⚠️ KERNEL PANIC', '⚠️ RED ALERT',
            '⚠️ DATA CORRUPT', '⚠️ CPU OVERLOAD', '⚠️ MEMORY LEAK',
            '⚠️ CYBER ATTACK', '⚠️ FAILURE', '⚠️ BREACH'
        ];
        pop.textContent = messages[Math.floor(Math.random() * messages.length)];
        pop.style.left = (2 + Math.random() * 96) + '%';
        pop.style.top = (2 + Math.random() * 96) + '%';
        pop.style.transform = `rotate(${Math.random() * 6 - 3}deg)`;
        pop.style.fontSize = (0.8 + Math.random() * 0.6) + 'rem';
        popupContainer.appendChild(pop);

        setTimeout(() => pop.remove(), 900);
    }

    function drawDeleteGlitch() {
        if (!deleteGlitchActive) return;
        const w = glitchCanvas.width, h = glitchCanvas.height;
        const area = w * h;
        const density = Math.min(2, Math.max(0.8, area / (1920 * 1080) * 1.5));

        ctxGlitch.fillStyle = 'rgba(0,0,0,0.2)';
        ctxGlitch.fillRect(0, 0, w, h);

        let lineCountH = Math.floor(50 * density);
        for (let l = 0; l < lineCountH; l++) {
            const y = Math.random() * h;
            ctxGlitch.beginPath();
            ctxGlitch.moveTo(0, y);
            ctxGlitch.lineTo(w, y);
            ctxGlitch.strokeStyle = `rgba(255,80,80,0.9)`;
            ctxGlitch.lineWidth = 1;
            ctxGlitch.stroke();
        }

        let blockCount = Math.floor(30 * density);
        for (let b = 0; b < blockCount; b++) {
            const x = Math.random() * w, y = Math.random() * h, bw = 20 + Math.random() * 150, bh = 1 + Math.random() * 3;
            ctxGlitch.fillStyle = `rgba(200,60,60,0.5)`;
            ctxGlitch.fillRect(x, y, bw, bh);
        }

        let charCount = Math.floor(30 * density);
        ctxGlitch.font = `bold ${Math.floor(16 * density)}px "Courier New"`;
        for (let c = 0; c < charCount; c++) {
            const ch = String.fromCharCode(0x30A0 + Math.random() * 96);
            ctxGlitch.fillStyle = `rgba(200,200,200,${0.5 + Math.random() * 0.3})`;
            ctxGlitch.fillText(ch, Math.random() * w, Math.random() * h);
        }

        deleteGlitchFrame = requestAnimationFrame(drawDeleteGlitch);
    }

    async function runDeleteGlitchPattern() {
        const cycles = 8;
        for (let i = 0; i < cycles; i++) {
            if (!deleteCycleRunning) break;
            glitchCanvas.style.display = 'block';
            popupContainer.style.display = 'block';
            await wait(1000 + Math.random() * 800);

            if (!deleteCycleRunning) break;
            glitchCanvas.style.display = 'none';
            popupContainer.style.display = 'none';
            popupContainer.innerHTML = '';
            await wait(300 + Math.random() * 400);
        }

        deleteGlitchActive = false;
        cancelAnimationFrame(deleteGlitchFrame);
        clearInterval(deletePopupInterval);
        glitchCanvas.style.display = 'none';
        popupContainer.style.display = 'none';
        term.style.display = 'none';
        progArea.style.display = 'none';

        await wait(300);
        const finalUrl = DELETE_IMAGE_URL.startsWith('data:') ? DELETE_IMAGE_URL : DELETE_PROXY_URL + encodeURIComponent(DELETE_IMAGE_URL);
        generateDeleteImageFromParticles(finalUrl);
    }

    // ---------- PARTICLE ASSEMBLER ----------
    // ✅ FIXED: data: URLs වලට crossOrigin set කරන්නේ නැහැ - CORS taint bug fix
    function generateDeleteImageFromParticles(imageUrl) {
        particleCanvas.style.display = 'block';

        const img = new Image();

        // ✅ KEY FIX: data: URLs වලට crossOrigin header set කළොත් browser reject කරනවා
        // External URLs ලඟ විතරක් crossOrigin = 'anonymous' set කරන්න
        if (!imageUrl.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = function () {
            buildDeleteParticlesFromImage(img);
        };
        img.onerror = function () {
            console.warn('Image failed to load. Using fallback pattern.');
            createDeleteFallbackPattern();
        };
        img.src = imageUrl;
    }

    function createDeleteFallbackPattern() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2 - 30;
        const size = 300;
        const targets = [];
        const step = 8;
        for (let x = centerX - size / 2; x < centerX + size / 2; x += step) {
            for (let y = centerY - size / 2; y < centerY + size / 2; y += step) {
                targets.push({ x, y });
            }
        }
        targets.sort(() => Math.random() - 0.5);
        runDeleteParticleAnimation(targets);
    }

    function runDeleteParticleAnimation(targets) {
        const TOTAL_DURATION_MS = 25000;
        const TRAVEL_MS = 3000;
        const SPREAD_MS = TOTAL_DURATION_MS - TRAVEL_MS;
        const particleSize = 3;

        const staticCanvas = document.createElement('canvas');
        staticCanvas.width = window.innerWidth;
        staticCanvas.height = window.innerHeight;
        const staticCtx = staticCanvas.getContext('2d');

        const totalParticles = targets.length;

        const particles = targets.map((t, i) => ({
            tx: t.x,
            ty: t.y,
            ox: Math.random() * window.innerWidth,
            oy: Math.random() * window.innerHeight,
            launchTime: (i / totalParticles) * SPREAD_MS
        }));

        const startTime = performance.now();
        let nextIdx = 0;
        let activeDeleteParticles = [];

        function animateBuild(now) {
            const elapsed = now - startTime;

            while (nextIdx < particles.length && particles[nextIdx].launchTime <= elapsed) {
                activeDeleteParticles.push({ ...particles[nextIdx], launched: elapsed });
                nextIdx++;
            }

            ctxParticle.clearRect(0, 0, window.innerWidth, window.innerHeight);
            ctxParticle.drawImage(staticCanvas, 0, 0);
            ctxParticle.fillStyle = "#fff";

            for (let i = activeDeleteParticles.length - 1; i >= 0; i--) {
                const p = activeDeleteParticles[i];
                const travelElapsed = elapsed - p.launchTime;
                const t = Math.min(travelElapsed / TRAVEL_MS, 1);

                const eased = t < 0.5
                    ? 2 * t * t
                    : 1 - Math.pow(-2 * t + 2, 2) / 2;

                const cx = p.ox + (p.tx - p.ox) * eased;
                const cy = p.oy + (p.ty - p.oy) * eased;

                if (t >= 1) {
                    staticCtx.fillStyle = "#fff";
                    staticCtx.fillRect(p.tx - particleSize / 2, p.ty - particleSize / 2, particleSize, particleSize);
                    activeDeleteParticles.splice(i, 1);
                } else {
                    ctxParticle.fillRect(cx - particleSize / 2, cy - particleSize / 2, particleSize, particleSize);
                }
            }

            if (nextIdx < particles.length || activeDeleteParticles.length > 0) {
                requestAnimationFrame(animateBuild);
            } else {
                // All done - show credit text then blackout
                const txt = document.getElementById('deleteQrTextContainer');
                if (txt) {
                    txt.style.display = 'block';
                    setTimeout(() => { txt.style.opacity = '1'; }, 100);
                }
                // After showing for a while, transition to blackout
                setTimeout(() => {
                    hideEl('glitchDeleteOverlay');
                    window.__STOP_RENDER__ = true;
                    runBlackoutThanksSequence(10000);
                    glitchDeleteActive = false;
                }, 5000);
            }
        }

        requestAnimationFrame(animateBuild);
    }

    function buildDeleteParticlesFromImage(img) {
        const bottomMargin = 80;
        const displaySize = Math.min(window.innerWidth, window.innerHeight) * 0.7;

        const imgAspect = img.width / img.height;
        let displayWidth, displayHeight;
        if (imgAspect > 1) {
            displayWidth = displaySize;
            displayHeight = displaySize / imgAspect;
        } else {
            displayHeight = displaySize;
            displayWidth = displaySize * imgAspect;
        }

        const startX = (window.innerWidth - displayWidth) / 2;
        const startY = (window.innerHeight - bottomMargin - displayHeight) / 2;

        const gridCols = 150;
        const gridRows = Math.round(gridCols / imgAspect);
        const cellW = displayWidth / gridCols;
        const cellH = displayHeight / gridRows;

        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = gridCols;
        sampleCanvas.height = gridRows;
        const sampleCtx = sampleCanvas.getContext('2d');
        sampleCtx.drawImage(img, 0, 0, gridCols, gridRows);
        const imageData = sampleCtx.getImageData(0, 0, gridCols, gridRows).data;

        let targets = [];
        const threshold = 128;

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const idx = (r * gridCols + c) * 4;
                const brightness = 0.2126 * imageData[idx] + 0.7152 * imageData[idx + 1] + 0.0722 * imageData[idx + 2];
                if (brightness < threshold) {
                    const x = startX + (c + 0.5) * cellW;
                    const y = startY + (r + 0.5) * cellH;
                    targets.push({ x, y });
                }
            }
        }

        console.log(`Particle targets: ${targets.length}`);
        if (targets.length === 0) {
            createDeleteFallbackPattern();
            return;
        }

        targets.sort(() => Math.random() - 0.5);
        runDeleteParticleAnimation(targets);
    }

    // Start the deletion sequence
    runDeletion();
}

function spawnGlitchFragments(count) {
    // Legacy function - no longer used by the new delete overlay
    // Kept for backward compatibility
}

/* ---------------------------------------------------------------------------
   FINAL: PLAY AGAIN
--------------------------------------------------------------------------- */

function restartAfterCredits() {
    hideEl('finalGoodbyeOverlay');

    if (typeof restartGame === 'function') {
        restartGame();
        return;
    }

    window.location.reload();
}

window.restartAfterCredits = restartAfterCredits;

async function runBlackoutThanksSequence(autoReloadMs = 10000) {
    const overlay = getEl('blackoutThanks');
    const titleEl = getEl('blackoutTitle');
    const counterEl = getEl('blackoutCounter');
    const refreshEl = getEl('blackoutRefresh');
    const btn = getEl('blackoutPlayAgainBtn');

    if (!overlay || !titleEl || !counterEl || !refreshEl || !btn) return;

    overlay.classList.remove('hidden');

    btn.onclick = () => window.location.reload();

    const target = (window.__THANK_YOU_TEXT || 'THANK YOU').toUpperCase();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const start = Date.now();
    const animMs = 2600;

    while (Date.now() - start < animMs) {
        const p = Math.floor(((Date.now() - start) / animMs) * 100);
        counterEl.textContent = `CALCULATING... ${Math.min(100, p)}%`;

        let out = '';
        for (let i = 0; i < target.length; i++) {
            if (target[i] === ' ') { out += ' '; continue; }
            const lockChance = (Date.now() - start) / animMs;
            if (Math.random() < lockChance) out += target[i];
            else out += chars[Math.floor(Math.random() * chars.length)];
        }
        titleEl.textContent = out;

        await sleep(35);
    }

    counterEl.textContent = 'CALCULATING... 100%';
    titleEl.textContent = target;

    const refreshStart = Date.now();
    const endAt = refreshStart + autoReloadMs;

    while (Date.now() < endAt) {
        const left = Math.ceil((endAt - Date.now()) / 1000);
        refreshEl.textContent = `Refreshing in ${left}s...`;
        await sleep(250);
    }

    window.location.reload();
}

console.log('✅ 11-cinematic.js loaded (with Telegram notification & owner notify & CORS fix)');
