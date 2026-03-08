/* ═══════════════════════════════════════════════════════════════════════════
   09-CIPHER.JS
   Mystery Temple - Galaxy Edition

   Handles:
   - Hacking animation overlay
   - Morse overlay + copy + countdown
   - Final win overlay + local decrypter flow
   - Cipher translation phases
   - Cipher gesture verification + combined password verification

   ✅ FINAL FIXED VERSION - All bugs resolved
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ---------------------------------------------------------------------------
   HACKING TERMINAL (MATRIX)
--------------------------------------------------------------------------- */

const HACK_LINES_DATA = [
    { text: '> Initializing decryption...', type: 'normal', delay: 0 },
    { text: '> Loading cipher [AES-256]...', type: 'normal', delay: 120 },
    { text: '> Scanning data blocks...', type: 'warning', delay: 240 },
    { text: '> ERROR: Firewall! Bypassing...', type: 'error', delay: 360 },
    { text: '> Injecting packets... OK', type: 'success', delay: 480 },
    { text: '> Hash: 5f4dcc3b5aa765d61d8327...', type: 'normal', delay: 600 },
    { text: '> Fragment 1/5 → synced', type: 'success', delay: 750 },
    { text: '> Fragment 2/5 → synced', type: 'success', delay: 880 },
    { text: '> WARNING: Traced!', type: 'error', delay: 1000 },
    { text: '> Evading trace...', type: 'warning', delay: 1120 },
    { text: '> Fragment 3/5 → synced', type: 'success', delay: 1280 },
    { text: '> Fragment 4/5 → synced', type: 'success', delay: 1400 },
    { text: '> Fragment 5/5 → synced', type: 'success', delay: 1520 },
    { text: '> KEY: [████████████]', type: 'highlight', delay: 1680 },
    { text: '> Extracting message...', type: 'normal', delay: 1840 },
    { text: '> DATA READY ✓', type: 'highlight', delay: 2100 }
];

function createMatrixBg() {
    const bg = getEl('hackMatrixBg');
    if (!bg) return;
    bg.innerHTML = '';

    const chars = '01アイウエオカキクケコABCDEF';

    for (let i = 0; i < 12; i++) {
        const col = document.createElement('div');
        col.className = 'matrix-col';
        col.style.left = `${Math.random() * 100}%`;
        col.style.animationDuration = `${4 + Math.random() * 5}s`;
        col.style.animationDelay = `${Math.random() * 3}s`;

        let txt = '';
        for (let j = 0; j < 25; j++) txt += chars[Math.floor(Math.random() * chars.length)] + '\n';
        col.textContent = txt;

        bg.appendChild(col);
    }
}

function cleanupMatrixBg() {
    const bg = getEl('hackMatrixBg');
    if (bg) bg.innerHTML = '';
}

function showHackingAnimation(callback, duration = 2500) {
    const overlay = getEl('hackingOverlay');
    const hackLinesEl = getEl('hackLines');
    const progressEl = getEl('hackProgressFill');
    const percentEl = getEl('hackPercent');
    const timeEl = getEl('hackTime');
    const nextBtn = getEl('hackNextBtn');

    if (!overlay || !hackLinesEl || !progressEl || !percentEl || !timeEl) {
        console.warn('Hacking overlay elements missing');
        if (callback) callback();
        return;
    }

    overlay.classList.remove('hidden');
    hackLinesEl.innerHTML = '';
    progressEl.style.width = '0%';
    percentEl.textContent = '0%';
    if (nextBtn) nextBtn.classList.add('hidden');

    createMatrixBg();

    const startTime = Date.now();
    const timeInterval = setInterval(() => {
        timeEl.textContent = formatTimeHMS(Date.now() - startTime);
    }, 50);

    HACK_LINES_DATA.forEach(lineData => {
        const adjustedDelay = (lineData.delay / 2500) * duration;
        setTimeout(() => {
            const span = document.createElement('span');
            span.className = `hack-line ${lineData.type}`;
            span.textContent = lineData.text;
            hackLinesEl.appendChild(span);
            hackLinesEl.scrollTop = hackLinesEl.scrollHeight;
        }, adjustedDelay);
    });

    let prog = 0;
    const progInterval = setInterval(() => {
        prog += (100 / (duration / 30));
        prog = Math.min(100, prog);
        progressEl.style.width = `${prog}%`;
        percentEl.textContent = `${Math.floor(prog)}%`;
        if (prog >= 100) clearInterval(progInterval);
    }, 30);

    setTimeout(() => {
        clearInterval(timeInterval);
        if (callback) callback();
        else if (nextBtn) nextBtn.classList.remove('hidden');
    }, duration);
}

function showMorseFromHack() {
    hideEl('hackingOverlay');
    cleanupMatrixBg();
    showMorseCode(getLevelConfig(currentLevel).englishMessage);
}

window.showHackingAnimation = showHackingAnimation;
window.showMorseFromHack = showMorseFromHack;

/* ---------------------------------------------------------------------------
   MORSE OVERLAY FLOW
--------------------------------------------------------------------------- */

function copyMorseCode() {
    const msg = getLevelConfig(currentLevel).englishMessage;
    const morse = textToMorse(msg);
    copyToClipboard(morse);

    const btn = getEl('copyMorseBtn');
    if (!btn) return;

    btn.textContent = '✓ COPIED!';
    btn.classList.add('copied');

    setTimeout(() => {
        btn.textContent = '📋 COPY MORSE CODE';
        btn.classList.remove('copied');
    }, 1500);
}

window.copyMorseCode = copyMorseCode;

/**
 * Show morse overlay with a subtle type-in effect.
 */
async function showMorseCode(englishMessage) {
    const overlay = getEl('morseCodeOverlay');
    const textEl = getEl('morseText');
    if (!overlay || !textEl) return;

    const morseCode = textToMorse(englishMessage);
    const morseHTML = formatMorseHTML(morseCode);

    // store for final
    allMorseCodes.push(morseCode);
    allEnglishMessages.push(englishMessage);
    allSinhalaMessages.push(getLevelConfig(currentLevel).sinhalaMessage);

    // type effect (HTML-safe approach)
    overlay.classList.remove('hidden');
    textEl.innerHTML = '';

    // Convert formatted HTML into tokens (simple: reveal per character by rebuilding)
    const raw = morseCode;
    for (let i = 0; i < raw.length; i++) {
        const partial = raw.slice(0, i + 1);
        textEl.innerHTML = formatMorseHTML(partial);
        await sleep(6);
    }

    // final ensure
    textEl.innerHTML = morseHTML;

    const copyBtn = getEl('copyMorseBtn');
    if (copyBtn) {
        copyBtn.textContent = '📋 COPY MORSE CODE';
        copyBtn.classList.remove('copied');
    }
}

function continueAfterMorse() {
    hideEl('morseCodeOverlay');

    const levelConfig = getLevelConfig(currentLevel);
    if (levelConfig.isFinal) {
        showFinalWin();
    } else {
        showMorseCountdown();
    }
}

window.continueAfterMorse = continueAfterMorse;

function showMorseCountdown() {
    const overlay = getEl('morseCountdownOverlay');
    const numberEl = getEl('morseCountdownNumber');

    if (!overlay || !numberEl) {
        continueToNextLevel();
        return;
    }

    overlay.classList.remove('hidden');

    let count = 3;
    numberEl.textContent = count;
    numberEl.style.color = '#0f8';

    morseCountdownTimer = setInterval(() => {
        count--;

        if (count > 0) {
            numberEl.textContent = count;
            // Restart animation each time
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countPop 1s ease-in-out', 10);
        } else if (count === 0) {
            numberEl.textContent = 'GO!';
            numberEl.style.color = '#fc0';
            numberEl.style.animation = 'none';
            setTimeout(() => numberEl.style.animation = 'countPop 1s ease-in-out', 10);
        } else {
            clearInterval(morseCountdownTimer);
            morseCountdownTimer = null;

            overlay.classList.add('hidden');
            numberEl.style.color = '#0f8';

            continueToNextLevel();
        }
    }, 1000);
}

/* ---------------------------------------------------------------------------
   FINAL WIN + LOCAL DECRYPTER
--------------------------------------------------------------------------- */

function showFinalWin() {
    const collection = getEl('morseCollection');
    if (!collection) return;

    collection.innerHTML = '';

    for (let i = 0; i < allMorseCodes.length; i++) {
        const code = allMorseCodes[i];
        const lvl = LEVELS[i];

        const item = document.createElement('div');
        item.className = 'final-morse-item';

        const header = document.createElement('div');
        header.className = 'final-morse-header';
        header.innerHTML = `<span>${lvl.icon}</span><span>LEVEL ${i + 1} • ${lvl.name}</span>`;

        const preview = document.createElement('div');
        preview.className = 'final-morse-preview';
        preview.textContent = code.substring(0, 46) + (code.length > 46 ? '…' : '');

        item.appendChild(header);
        item.appendChild(preview);
        collection.appendChild(item);
    }

    showEl('finalWinOverlay');

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('mysteryMagicHighscore', String(highscore));
        setText('highscore', String(highscore));
    }
}

function openGlobalDecrypter() {
    window.open(GLOBAL_DECODER_URL, '_blank');
}

function openLocalDecrypter() {
    hideEl('finalWinOverlay');
    showEl('localDecrypterOverlay');

    const txt = getEl('decrypterTextarea');
    if (txt) txt.value = '';

    showEl('pasteBtn');
    hideEl('decryptBtn');

    startDecrypterTypingExample();
}

function closeLocalDecrypter() {
    stopDecrypterTypingExample();
    hideEl('localDecrypterOverlay');
    showEl('finalWinOverlay');
}

window.openGlobalDecrypter = openGlobalDecrypter;
window.openLocalDecrypter = openLocalDecrypter;
window.closeLocalDecrypter = closeLocalDecrypter;

/* ====== DECRYPTER TYPING ANIMATION (INFINITE LOOP, STOP ON PASTE) ====== */
let decrypterTypingActive = false;
let decrypterTypingTimer = null;

async function startDecrypterTypingExample() {
    if (decrypterTypingActive) return;
    decrypterTypingActive = true;

    const box = getEl('typingExample');
    if (!box) {
        decrypterTypingActive = false;
        return;
    }
    const textSpan = box.querySelector('.typing-text');
    if (!textSpan) {
        decrypterTypingActive = false;
        return;
    }

    const example = '... --- ... / .-.. --- ...- . / -.- .. ... ...';

    const typeLoop = async () => {
        box.classList.remove('hidden');
        textSpan.textContent = '';

        for (let i = 0; i < example.length; i++) {
            textSpan.textContent += example[i];
            await sleep(20);
        }

        await sleep(700);

        textSpan.textContent = '';
        if (decrypterTypingActive) {
            decrypterTypingTimer = setTimeout(typeLoop, 300);
        }
    };

    await typeLoop();
}

function stopDecrypterTypingExample() {
    decrypterTypingActive = false;
    if (decrypterTypingTimer) {
        clearTimeout(decrypterTypingTimer);
        decrypterTypingTimer = null;
    }
    const box = getEl('typingExample');
    if (box) box.classList.add('hidden');
}

function handlePaste() {
    // Stop the typing animation immediately
    stopDecrypterTypingExample();

    hideEl('pasteBtn');
    hideEl('localDecrypterOverlay');

    showHackingAnimation(() => {
        hideEl('hackingOverlay');
        cleanupMatrixBg();

        showEl('localDecrypterOverlay');

        const combinedMorse = allMorseCodes.join(' / ');
        const txt = getEl('decrypterTextarea');
        if (txt) txt.value = combinedMorse;

        showEl('decryptBtn');
    }, 8000);
}

function handleDecrypt() {
    hideEl('localDecrypterOverlay');
    const combinedEnglish = allEnglishMessages.join(' ');
    const combinedSinhala = allSinhalaMessages.join(' ');
    startCipherTranslation(combinedEnglish, combinedSinhala);
}

window.handlePaste = handlePaste;
window.handleDecrypt = handleDecrypt;

/* ---------------------------------------------------------------------------
   CIPHER TRANSLATION (PHASES)
--------------------------------------------------------------------------- */

function resetCipherAnimation() {
    setHTML('cipherMorseText', '');
    setHTML('cipherKeyboardGrid', '');
    setText('cipherFinalText', '');

    const pb = getEl('cipherProgressBar');
    const pp = getEl('cipherProgressPercent');
    const pt = getEl('cipherProgressText');
    const hi = getEl('cipherHeaderIcon');
    const ht = getEl('cipherHeaderTitle');

    if (pb) pb.style.width = '0%';
    if (pp) pp.textContent = '0%';
    if (pt) pt.textContent = 'Initializing...';
    if (hi) hi.textContent = '🔐';
    if (ht) ht.textContent = 'INITIALIZING...';

    hideEl('cipherKeyboardSection');
    hideEl('cipherHeartbeatSection');
    hideEl('cipherFinalSection');
    hideEl('cipherSuccessSection');
    hideEl('cipherContinueBtn');
    hideEl('cipherGestureUnlock');
    hideEl('cipherPasswordSection');

    cipherGestureVerified = [false, false, false, false, false];
    cipherGestureIndex = -1;
    gestureMode = 'password';
    keyboardKeys = [];

    if (bpmInterval) clearInterval(bpmInterval);
    if (shuffleInterval) clearInterval(shuffleInterval);
    stopCipherSignalMeter();

    for (let i = 1; i <= 5; i++) {
        const s = getEl(`cipherStatus${i}`);
        if (s) s.classList.remove('active', 'complete');
    }

    const sp = getEl('cipherSpinner');
    if (sp) sp.classList.remove('complete');

    const particles = getEl('cipherParticlesContainer');
    if (particles) particles.innerHTML = '';

    const cont = document.querySelector('#cipherTranslationOverlay .cipher-translation-container');
    if (cont) cont.scrollTop = 0;
}

function updateCipherProgress(p) {
    const pb = getEl('cipherProgressBar');
    const pp = getEl('cipherProgressPercent');
    if (pb) pb.style.width = `${p}%`;
    if (pp) pp.textContent = `${Math.floor(p)}%`;
}

function setCipherStatusActive(n) {
    for (let i = 1; i < n; i++) {
        const s = getEl(`cipherStatus${i}`);
        if (s) { s.classList.remove('active'); s.classList.add('complete'); }
    }
    const c = getEl(`cipherStatus${n}`);
    if (c) c.classList.add('active');
}

async function startCipherTranslation(englishMsg, sinhalaMsg) {
    if (cipherIsAnimating) return;
    cipherIsAnimating = true;

    const overlay = getEl('cipherTranslationOverlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    resetCipherAnimation();

    cipherPendingSinhala = sinhalaMsg;

    await cipherPhase1_ShowMorse(englishMsg);
    await cipherPhase2_KeyboardShuffle(sinhalaMsg);
    await cipherPhase3_LockEnglish();
    await cipherPhase4_Analyze(sinhalaMsg);
    await cipherPhase5_HeartFill(sinhalaMsg);
    await cipherPhase6_Final();

    cipherIsAnimating = false;
}

window.startCipherTranslation = startCipherTranslation;

async function cipherPhase1_ShowMorse(englishText) {
    setCipherStatusActive(1);
    setText('cipherHeaderTitle', '📡 RECEIVING SIGNAL...');
    setText('cipherProgressText', 'Intercepting transmission...');

    const morse = textToMorse(englishText);
    const el = getEl('cipherMorseText');
    if (!el) return;

    el.innerHTML = '';

    for (let i = 0; i < morse.length; i++) {
        const c = morse[i];
        if (c === '.') el.innerHTML += '<span class="morse-dot">•</span>';
        else if (c === '-') el.innerHTML += '<span class="morse-dash">━</span>';
        else if (c === '/') el.innerHTML += ' <span style="color:#864">│</span> ';
        else if (c === ' ') el.innerHTML += ' ';

        updateCipherProgress((i / morse.length) * 12);
        await sleep(7);
    }
    await sleep(250);
}

async function cipherPhase2_KeyboardShuffle(sinhalaText) {
    startCipherSignalMeter();
    setCipherStatusActive(2);

    setText('cipherHeaderTitle', '⌨️ DECODING...');
    setText('cipherProgressText', 'Decrypting characters...');

    showEl('cipherKeyboardSection');
    showEl('cipherHeartbeatSection');

    startBpmAnimation();

    const grid = getEl('cipherKeyboardGrid');
    if (!grid) return;

    const cleaned = sinhalaText.replace(/\s/g, '');
    const chars = cleaned.slice(0, MAX_CIPHER_CHARS).split('');
    keyboardKeys = [];

    grid.innerHTML = '';

    for (let i = 0; i < chars.length; i++) {
        const key = document.createElement('div');
        key.className = 'cipher-key';
        key.textContent = '?';
        key.dataset.target = chars[i];
        key.style.opacity = '0';
        key.style.transform = 'scale(0.6)';
        grid.appendChild(key);
        keyboardKeys.push(key);

        key.addEventListener('click', () => {
            key.classList.add('key-tap');
            setTimeout(() => key.classList.remove('key-tap'), 180);
        });

        await sleep(14);
        key.style.transition = 'all 0.2s ease';
        key.style.opacity = '1';
        key.style.transform = 'scale(1)';

        updateCipherProgress(12 + (i / chars.length) * 10);
    }

    keyboardKeys.forEach(k => k.classList.add('shuffling'));

    shuffleInterval = setInterval(() => {
        keyboardKeys.forEach(k => {
            if (k.classList.contains('shuffling')) {
                k.textContent = ENGLISH_CHARS[Math.floor(Math.random() * ENGLISH_CHARS.length)];
            }
        });
    }, 50);

    await sleep(2500);
}

async function cipherPhase3_LockEnglish() {
    setText('cipherProgressText', 'Locking patterns...');

    if (shuffleInterval) clearInterval(shuffleInterval);

    for (let i = 0; i < keyboardKeys.length; i++) {
        const key = keyboardKeys[i];
        key.classList.remove('shuffling');
        key.classList.add('locked-english');
        key.textContent = ENGLISH_CHARS[Math.floor(Math.random() * ENGLISH_CHARS.length)];
        createKeyBurst(key, '#0f8');

        updateCipherProgress(22 + (i / keyboardKeys.length) * 12);
        await sleep(25);
    }
    await sleep(200);
}

async function cipherPhase4_Analyze(sinhalaText) {
    setCipherStatusActive(3);
    setText('cipherHeaderTitle', '🔍 ANALYZING...');
    setText('cipherProgressText', 'Searching Sinhala patterns...');

    const chars = sinhalaText.replace(/\s/g, '').split('');

    for (let i = 0; i < keyboardKeys.length; i++) {
        const key = keyboardKeys[i];
        const targetChar = chars[i] || '?';

        key.classList.remove('locked-english');
        key.classList.add('analyzing');

        const steps = 6 + Math.floor(Math.random() * 4);
        for (let j = 0; j < steps; j++) {
            key.textContent = SINHALA_CHARS[Math.floor(Math.random() * SINHALA_CHARS.length)];
            await sleep(30);
        }

        key.textContent = targetChar;
        createKeyBurst(key, '#fc0');

        updateCipherProgress(35 + (i / keyboardKeys.length) * 23);
        await sleep(35);
    }
    await sleep(250);
}

async function cipherPhase5_HeartFill(sinhalaText) {
    setCipherStatusActive(4);
    setText('cipherHeaderTitle', '💛 FILLING HEART...');
    setText('cipherProgressText', 'Love is filling...');

    const chars = sinhalaText.replace(/\s/g, '').split('');
    const total = keyboardKeys.length;
    const center = Math.floor(total / 2);

    const order = [];
    for (let d = 0; d <= total; d++) {
        const L = center - d;
        const R = center + d;
        if (L >= 0 && !order.includes(L)) order.push(L);
        if (R < total && !order.includes(R)) order.push(R);
    }

    for (let i = 0; i < order.length; i++) {
        const idx = order[i];
        const key = keyboardKeys[idx];
        if (!key) continue;

        key.classList.remove('analyzing');
        key.classList.add('heart-filled');
        key.textContent = chars[idx] || '💛';
        createKeyBurst(key, '#fc0');

        updateCipherProgress(60 + (i / order.length) * 25);
        await sleep(40);
    }

    if (bpmInterval) clearInterval(bpmInterval);
    setText('cipherHeartbeatBpm', '💛 LOVE');

    await sleep(200);
}

async function cipherPhase6_Final() {
    setCipherStatusActive(5);

    setText('cipherHeaderTitle', '🔐 FINAL UNLOCK REQUIRED');
    setText('cipherProgressText', 'Verify gestures to continue...');

    const sp = getEl('cipherSpinner');
    if (sp) sp.classList.add('complete');

    updateCipherProgress(100);

    showEl('cipherSuccessSection');
    showEl('cipherGestureUnlock');

    updateCipherGestureUI();

    await sleep(120);

    const container = document.querySelector('#cipherTranslationOverlay .cipher-translation-container');
    const gestureBlock = getEl('cipherGestureUnlock');

    if (container) {
        container.scrollTop = container.scrollHeight;
    }
    if (gestureBlock) {
        gestureBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        console.warn('cipherGestureUnlock element not found in HTML');
    }
}

/* ---------------------------------------------------------------------------
   CIPHER GESTURE VERIFICATION
--------------------------------------------------------------------------- */

function updateCipherGestureUI() {
    const btns = document.querySelectorAll('.cipher-gesture-btn');
    btns.forEach((btn, i) => {
        btn.classList.toggle('done', Boolean(cipherGestureVerified[i]));
    });

    const verifyEl = getEl('cipherGestureVerify');
    if (!verifyEl) return;

    const done = cipherGestureVerified.filter(v => v).length;
    if (done < 5) verifyEl.textContent = `Gestures verified: ${done}/5`;
    else verifyEl.textContent = '✅ All gestures verified. Enter passwords...';
}

function openCipherGestureVerify(index) {
    console.log(`🔓 Opening cipher gesture verify for index ${index}`);
    cipherGestureIndex = index;
    gestureMode = 'cipher';

    // Mark selected button
    document.querySelectorAll('.cipher-gesture-btn').forEach((b, i) => {
        b.classList.toggle('selected', i === index);
    });

    // Show hold progress bar (cipher overlay)
    const wrap = getEl('cipherGestureHoldWrap');
    const bar = getEl('cipherGestureHoldBar');
    if (wrap) wrap.classList.remove('hidden');
    if (bar) bar.style.width = '0%';

    // Update verify text
    const verifyEl = getEl('cipherGestureVerify');
    if (verifyEl) verifyEl.textContent = 'Hold the gesture to verify...';

    // Set gesture target icon based on index
    const gestureIcons = ['✋', '✌️', '☝️', '👊', '🤟'];
    const gestureNames = ['Open Palm', 'Peace Sign', 'Point Up', 'Fist', 'Rock On'];

    // Reset and prepare gesture modal
    const modal = getEl('gestureModal');
    if (modal) {
        const pwSection = getEl('gesturePasswordSection');
        const pwInputDiv = getEl('gesturePasswordInput');
        if (pwSection) pwSection.classList.add('hidden');
        if (pwInputDiv) pwInputDiv.classList.add('hidden');

        const progressFill = getEl('gestureVerifyProgressFill');
        const percentEl = getEl('gestureVerifyPercent');
        if (progressFill) progressFill.style.width = '0%';
        if (percentEl) percentEl.textContent = '0%';

        const targetEl = getEl('gestureTarget');
        const instructionEl = document.querySelector('.gesture-instruction');
        if (targetEl) targetEl.textContent = gestureIcons[index] || '✋';
        if (instructionEl) instructionEl.textContent = `Show: ${gestureNames[index] || 'gesture'}`;
    }

    // Open modal
    if (typeof openGestureModal === 'function') {
        openGestureModal();
    } else {
        console.error('❌ openGestureModal function not found!');
        if (modal) modal.classList.remove('hidden');
    }
}

window.openCipherGestureVerify = openCipherGestureVerify;

function cipherMarkGestureVerified(index) {
    hideEl('cipherGestureHoldWrap');
    const hb = getEl('cipherGestureHoldBar');
    if (hb) hb.style.width = '0%';
    document.querySelectorAll('.cipher-gesture-btn').forEach(b => b.classList.remove('selected'));

    if (index >= 0 && index < cipherGestureVerified.length) {
        cipherGestureVerified[index] = true;
    }

    updateCipherGestureUI();

    if (cipherGestureVerified.every(Boolean)) {
        setTimeout(() => showPasswordVerificationSection(), 350);
    }
}

window.cipherMarkGestureVerified = cipherMarkGestureVerified;

/* ---------------------------------------------------------------------------
   BPM + SIGNAL + KEY BURSTS
--------------------------------------------------------------------------- */

function startBpmAnimation() {
    const bpmEl = getEl('cipherHeartbeatBpm');
    if (!bpmEl) return;

    bpmInterval = setInterval(() => {
        const bpm = 70 + Math.floor(Math.random() * 50);
        bpmEl.textContent = `💛 ${bpm} BPM`;
    }, 400);
}

function createKeyBurst(el, color) {
    const rect = el.getBoundingClientRect();
    const container = getEl('cipherParticlesContainer');
    if (!container) return;

    for (let i = 0; i < 3; i++) {
        const p = document.createElement('div');
        p.className = 'cipher-particle';

        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 12 + Math.random() * 10;

        p.style.cssText = `
            left:${rect.left + rect.width / 2}px;
            top:${rect.top + rect.height / 2}px;
            width:5px;height:5px;
            background:${color};
            --tx:${Math.cos(angle) * dist}px;
            --ty:${Math.sin(angle) * dist}px;
        `;
        container.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }
}

function startCipherSignalMeter() {
    const bar = getEl('cipherSignalBar');
    if (!bar) return;

    stopCipherSignalMeter();

    cipherSignalInterval = setInterval(() => {
        const w = 15 + Math.floor(Math.random() * 85);
        bar.style.width = `${w}%`;
        bar.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2);
    }, 160);
}

function stopCipherSignalMeter() {
    if (cipherSignalInterval) clearInterval(cipherSignalInterval);
    cipherSignalInterval = null;
}

/* ---------------------------------------------------------------------------
   PASSWORD SECTION (L1–L5 CHIPS)
--------------------------------------------------------------------------- */

function buildCipherPasswordChips() {
    const container = getEl('cipherPasswordDisplay');
    if (!container) return;

    container.innerHTML = '';

    LEVELS.forEach((lvl, idx) => {
        const chip = document.createElement('div');
        chip.className = 'cipher-pw-chip';
        chip.id = `cipherPwChip${idx}`;

        const label = document.createElement('span');
        label.className = 'cipher-pw-label';
        label.textContent = `L${idx + 1}*`;

        const value = document.createElement('span');
        value.className = 'cipher-pw-value masked';
        value.dataset.real = lvl.password.toUpperCase();
        value.textContent = '****';

        chip.appendChild(label);
        chip.appendChild(value);
        container.appendChild(chip);
    });
}

function showPasswordVerificationSection() {
    hideEl('cipherGestureUnlock');

    buildCipherPasswordChips();

    const passwordSection = getEl('cipherPasswordSection');
    if (!passwordSection) return;

    const input = getEl('cipherFinalPasswordInput');
    const err = getEl('cipherPasswordError');

    if (input) {
        input.value = '';
        input.disabled = false;
    }
    if (err) err.classList.add('hidden');

    passwordSection.classList.remove('hidden');

    setTimeout(() => {
        passwordSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) input.focus();
    }, 250);
}

function updateCipherPasswordTypingState(typedRaw) {
    const typed = (typedRaw || '').toUpperCase();
    const segs = LEVELS.map(l => l.password.toUpperCase());

    let offset = 0;

    for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const end = offset + seg.length;

        const chip = getEl(`cipherPwChip${i}`);
        if (!chip) { offset = end; continue; }

        const valueEl = chip.querySelector('.cipher-pw-value');
        if (!valueEl) { offset = end; continue; }

        if (typed.length < end) {
            valueEl.classList.add('masked');
            valueEl.textContent = '****';
            chip.style.borderColor = '';
            chip.style.boxShadow = '';
        } else {
            const part = typed.substring(offset, end);
            if (part === seg) {
                valueEl.classList.remove('masked');
                valueEl.textContent = seg;
                chip.style.borderColor = '#fc0';
                chip.style.boxShadow = '0 0 18px rgba(255,200,0,0.75)';
            } else {
                valueEl.classList.add('masked');
                valueEl.textContent = '****';
                chip.style.borderColor = '#f44';
                chip.style.boxShadow = '0 0 18px rgba(255,80,80,0.55)';
            }
        }

        offset = end;
    }
}

window.updateCipherPasswordTypingState = updateCipherPasswordTypingState;

function verifyCipherFinalPassword() {
    const input = getEl('cipherFinalPasswordInput');
    const errEl = getEl('cipherPasswordError');
    if (!input || !errEl) return;

    const entered = input.value.toUpperCase().trim();
    const correct = getCombinedPassword().toUpperCase();

    if (entered !== correct) {
        errEl.textContent = '❌ Incorrect sequence. Try again.';
        errEl.classList.remove('hidden');
        vibrate([80, 40, 80]);
        return;
    }

    errEl.classList.add('hidden');
    input.disabled = true;

    updateCipherPasswordTypingState(correct);

    setTimeout(() => {
        if (typeof startUnlockingAnimation === 'function') startUnlockingAnimation();
        else closeCipherTranslation();
    }, 800);
}

window.verifyCipherFinalPassword = verifyCipherFinalPassword;

/* ---------------------------------------------------------------------------
   CIPHER CLOSE
--------------------------------------------------------------------------- */

function closeCipherTranslation() {
    stopCipherSignalMeter();
    if (bpmInterval) clearInterval(bpmInterval);
    if (shuffleInterval) clearInterval(shuffleInterval);

    const particles = getEl('cipherParticlesContainer');
    if (particles) particles.innerHTML = '';

    hideEl('cipherTranslationOverlay');

    if (typeof showFinalDialog === 'function') showFinalDialog();
}

window.closeCipherTranslation = closeCipherTranslation;

function cipherSetHoldProgress(percent, active) {
    const wrap = getEl('cipherGestureHoldWrap');
    const bar = getEl('cipherGestureHoldBar');
    if (!wrap || !bar) return;

    if (!active) {
        bar.style.width = '0%';
        return;
    }

    wrap.classList.remove('hidden');
    const p = Math.max(0, Math.min(100, percent));
    bar.style.width = `${p}%`;
}
window.cipherSetHoldProgress = cipherSetHoldProgress;

console.log('✅ 09-cipher.js loaded');