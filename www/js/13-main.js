/* ═══════════════════════════════════════════════════════════════════════════
   13-MAIN.JS (Modified with Supabase integration)
   Mystery Temple - Galaxy Edition
   ✅ FINAL VERSION - Loads config from Supabase based on slug
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ============================================================================
// SUPABASE INTEGRATION (ADD THIS AT THE VERY TOP)
// ============================================================================
// ============================================================================
// SUPABASE CONFIG PRELOAD (REPLACE YOUR WHOLE SUPABASE BLOCK WITH THIS)
// ============================================================================

let sb = null;

/** Create/get supabase client (no duplicate declarations) */
function getSupabase() {
    if (sb) return sb;

    if (!window.supabase?.createClient) {
        console.error('❌ Supabase library not available');
        return null;
    }

    sb = window.supabase.createClient(
        'https://hdqcehofpuinlatpkgml.supabase.co',
        'sb_publishable_vq4f1sF543S-F_vNSDSaIg_iEl7oeX-'
    );
    return sb;
}

/**
 * Load config: first from localStorage (set by intro.html),
 * then optionally sync from Supabase by slug.
 */
async function preloadConfigFromSupabase() {
    // ── Step 1: Apply from localStorage immediately (fastest) ──
    try {
        const stored = localStorage.getItem('game_config');
        if (stored) {
            const cfg = JSON.parse(stored);
            if (typeof window.applyAdminConfig === 'function') {
                window.applyAdminConfig(cfg);
                console.log('✅ Config from localStorage applied instantly');
            } else {
                window.__PENDING_CONFIG = cfg;
            }
        }
        // Restore chat IDs
        window.__PLAYER_CHAT_ID = localStorage.getItem('player_chat_id') || '';
        window.__OWNER_CHAT_ID  = localStorage.getItem('owner_chat_id') || '';
    } catch(e) { console.warn('localStorage config error:', e); }

    // ── Step 2: Also sync from Supabase for freshest data ──
    const slug = new URLSearchParams(window.location.search).get('slug')
                 || localStorage.getItem('game_slug');
    console.log('🔍 Preloading config for slug:', slug);

    if (!slug) return null;

    const client = getSupabase();
    if (!client) return null;

    try {
        const { data, error } = await client
            .from('game_configs')
            .select('config, receiver_name, access_code, slug, player_slug, owner_chat_id')
            .or(`slug.eq.${slug},player_slug.eq.${slug}`)
            .maybeSingle();

        console.log('📦 Supabase response:', { data, error });

        if (error || !data) {
            console.warn('⚠️ Supabase config not found, using localStorage fallback');
            return null;
        }

        window.__RECEIVER_NAME = data.receiver_name || '';
        window.__ACCESS_CODE   = data.access_code || '';
        window.__GAME_ROW__    = data;

        // ── Save all key data to localStorage for offline/re-use ──
        if (data.access_code)   localStorage.setItem('access_code',    data.access_code);
        if (data.receiver_name) localStorage.setItem('receiver_name',   data.receiver_name);
        if (data.slug)          localStorage.setItem('game_slug',       data.slug);

        // player_chat_id: keep existing if already set (intro.html set it from recipients table)
        const existingChatId = localStorage.getItem('player_chat_id');
        if (!existingChatId && data.player_chat_id) {
            localStorage.setItem('player_chat_id', data.player_chat_id);
            window.__PLAYER_CHAT_ID = data.player_chat_id;
        }

        // Update owner chat id if Supabase has fresher value
        if (data.owner_chat_id) {
            window.__OWNER_CHAT_ID = data.owner_chat_id;
            localStorage.setItem('owner_chat_id', data.owner_chat_id);
        }

        if (data.config && typeof window.applyAdminConfig === 'function') {
            window.applyAdminConfig(data.config);
            // Update localStorage with fresh config
            localStorage.setItem('game_config', JSON.stringify(data.config));
        }

        console.log('✅ Config synced from Supabase — localStorage updated');
        return data;
    } catch (err) {
        console.error('❌ Failed to preload config:', err);
        return null;
    }
}

// Apply pending localStorage config if applyAdminConfig now available
if (window.__PENDING_LOCALSTORAGE_CONFIG && typeof window.applyAdminConfig === 'function') {
    try {
        window.applyAdminConfig(window.__PENDING_LOCALSTORAGE_CONFIG);
        console.log('✅ localStorage config applied immediately');
    } catch(e) { console.warn('Pending config apply error:', e); }
}

// Global promise so we can await before starting progressiveLoad()
window.__CONFIG_READY__ = preloadConfigFromSupabase();
// ✅ Option B: Backward compatibility alias
window.loadGameConfigFromSlug = preloadConfigFromSupabase;

// Load config immediately (before any game initialization)
loadGameConfigFromSlug();

// ============================================================================
// THE REST OF YOUR ORIGINAL 13-MAIN.JS CODE STARTS HERE
// (Everything below is exactly as you had it, unmodified)
// ============================================================================

/* ---------------------------------------------------------------------------
   UI: LETTER / RUNE SLOTS
--------------------------------------------------------------------------- */

function initLetterSlots() {
    const levelCfg = getLevelConfig(currentLevel);
    currentPassword = levelCfg.password;
    collectedLetters = [];

    const container = getEl('collectedLetters');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < LETTERS_REQUIRED; i++) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';
        slot.id = `letterSlot${i}`;
        slot.textContent = '?';
        container.appendChild(slot);
    }

    updateGestureProgressUI(0);
}

/**
 * ✅ FIX: Update letter/rune display and trigger story event.
 * Checks ALL 4 heart bars (Red/Green/Blue/Yellow) and triggers when filled.
 * Removed gamePaused check so it can trigger even during pause.
 */
function updateLetterDisplay() {
    for (let i = 0; i < LETTERS_REQUIRED; i++) {
        const slot = getEl(`letterSlot${i}`);
        if (!slot) continue;

        if (collectedLetters[i]) {
            slot.textContent = RUNE_SYMBOLS[i];
            slot.classList.add('filled');
        } else {
            slot.textContent = '?';
            slot.classList.remove('filled');
        }
    }

    const filled = collectedLetters.filter(Boolean).length;
    updateGestureProgressUI((filled / LETTERS_REQUIRED) * 100);

    // ✅ FIX: Check if ALL 4 bars are filled
    if (!storyObjectActive && !waitingForClearPath) {
        if (typeof areAllHeartBarsFilled === 'function' && areAllHeartBarsFilled()) {
            console.log('✅ All 4 bars filled! Setting waitingForClearPath = true');
            waitingForClearPath = true;

            const sp = getEl('storyPanel');
            if (sp) sp.textContent = '✨ All requirements met! Path clearing...';
        }
    }
}

window.updateLetterDisplay = updateLetterDisplay;

function updateGestureProgressUI(percent) {
    const bar = getEl('gestureProgressBar');
    const hint = getEl('gestureHint');

    const p = Math.max(0, Math.min(100, percent));

    if (bar) bar.style.width = `${p}%`;
    if (hint) hint.textContent = p < 100 ? 'Collect all runes!' : 'Ready for gesture!';
}

/* ---------------------------------------------------------------------------
   UI: PASSWORD / LEVEL COMPLETE SCREEN
--------------------------------------------------------------------------- */

function showPasswordEntry() {
    const runeContainer = getEl('runeSymbolDisplay');
    if (runeContainer) {
        runeContainer.innerHTML = '';
        for (let i = 0; i < LETTERS_REQUIRED; i++) {
            const div = document.createElement('div');
            div.className = 'rune-symbol';
            div.textContent = RUNE_SYMBOLS[i];
            runeContainer.appendChild(div);
        }
    }

    const gesture = getCurrentGesture();
    const iconEl = getEl('gestureRequiredIcon');
    const nameEl = getEl('gestureRequiredName');
    if (iconEl) iconEl.textContent = gesture.icon;
    if (nameEl) nameEl.textContent = gesture.name;

    showEl('levelCompleteOverlay');
}

function goToPasswordPage() {
    hideEl('gestureModal');
    hideEl('levelCompleteOverlay');
    showHackingAnimation();
}

window.goToPasswordPage = goToPasswordPage;

function checkMainPassword() {
    const input = getEl('mainPasswordInput');
    const err = getEl('mainPasswordError');
    if (!input || !err) return;

    const entered = input.value.toUpperCase().trim();
    if (entered === (currentPassword || '').toUpperCase()) {
        hideEl('passwordModal');
        showHackingAnimation();
    } else {
        err.classList.remove('hidden');
        input.value = '';
        vibrate([90, 40, 90]);
    }
}

function closeMainPasswordModal() {
    hideEl('passwordModal');
}

window.checkMainPassword = checkMainPassword;
window.closeMainPasswordModal = closeMainPasswordModal;

/* ---------------------------------------------------------------------------
   STORY EVENT + CHASE FLOW
--------------------------------------------------------------------------- */

function triggerStoryEvent() {
    console.log('🎯 triggerStoryEvent() called!');

    gamePaused = true;
    storyObjectActive = true;
    waitingForClearPath = false;
    chaseStarted = false;

    // Reset timeout flag
    window._pathClearStartTime = null;

    if (typeof clearAllObstacles === 'function') {
        clearAllObstacles();
    }

    const levelCfg = getLevelConfig(currentLevel);
    const iconEl = getEl('mysteryIcon');
    if (iconEl) iconEl.textContent = levelCfg.icon;

    showEl('mysteryAlert');

    if (typeof createStoryObject === 'function') {
        createStoryObject();
    }
}

window.triggerStoryEvent = triggerStoryEvent;

function startCountdownOnScreen() {
    hideEl('mysteryAlert');

    const cd = getEl('gameCountdown');
    const big = getEl('countdownBig');

    if (!cd || !big) {
        startChase();
        return;
    }

    cd.classList.remove('hidden');

    let count = 3;
    big.textContent = String(count);
    big.className = 'countdown-big';

    countdownTimer = setInterval(() => {
        count--;

        if (count > 0) {
            big.textContent = String(count);
            big.style.animation = 'none';
            setTimeout(() => { big.style.animation = 'countdownPop 1s ease-in-out'; }, 10);
        } else if (count === 0) {
            big.textContent = 'GO!';
            big.className = 'countdown-go';
        } else {
            clearInterval(countdownTimer);
            countdownTimer = null;
            cd.classList.add('hidden');
            startChase();
        }
    }, 1000);
}

window.startCountdownOnScreen = startCountdownOnScreen;

function startChase() {
    const levelCfg = getLevelConfig(currentLevel);

    setText('chaseTitle', `${levelCfg.icon} CATCH IT!`);

    const barWrap = getEl('chaseProgress');
    const fillEl = getEl('chaseFill');
    if (barWrap) barWrap.classList.remove('hidden');
    if (fillEl) {
        fillEl.style.width = '0%';
        fillEl.classList.remove('danger');
    }

    const sp = getEl('storyPanel');
    if (sp) {
        sp.classList.add('event-active');
        sp.textContent = `⚡ Catch the ${levelCfg.name}!`;
    }

    chaseProgress = 0;
    chaseStarted = true;
    gamePaused = false;
}

function catchStoryObject() {
    const levelCfg = getLevelConfig(currentLevel);

    if (storyObject) {
        createParticleEffect(storyObject.position, levelCfg.objectColor, 25);
        scene.remove(storyObject);
        storyObject = null;
    }

    storyObjectActive = false;
    chaseStarted = false;
    gamePaused = true;

    vibrate([100, 50, 100]);
    if (window.SoundManager) SoundManager.play('artifactCatch');

    hideEl('chaseProgress');

    const sp = getEl('storyPanel');
    if (sp) sp.classList.remove('event-active');

    showPasswordEntry();
}

window.catchStoryObject = catchStoryObject;

function showRetryAlert() {
    gamePaused = true;
    chaseStarted = false;

    if (storyObject) {
        scene.remove(storyObject);
        storyObject = null;
    }

    hideEl('chaseProgress');
    showEl('retryAlert');
}

function retryLevel() {
    hideEl('retryAlert');

    storyObjectActive = false;
    chaseStarted = false;
    chaseProgress = 0;
    waitingForClearPath = false;
    collectedLetters = [];

    if (storyObject) {
        scene.remove(storyObject);
        storyObject = null;
    }

    reset3DObjects();
    resetPlayerPosition();

    initLetterSlots();
    updateGemCounterUI();
    updateHeartProgressUI();

    const sp = getEl('storyPanel');
    const levelCfg = getLevelConfig(currentLevel);
    if (sp) {
        sp.classList.remove('event-active');
        sp.textContent = `${levelCfg.icon} Collect 0/${LETTERS_REQUIRED} runes`;
    }

    gamePaused = false;
    showEl('pauseBtn');
}

window.retryLevel = retryLevel;

/* ---------------------------------------------------------------------------
   LEVEL CONTINUATION
--------------------------------------------------------------------------- */

function continueToNextLevel() {
    currentLevel++;

    if (currentLevel >= LEVELS.length) {
        currentLevel = LEVELS.length - 1;
        showFinalWin();
        return;
    }

    storyObjectActive = false;
    chaseStarted = false;
    chaseProgress = 0;
    waitingForClearPath = false;
    collectedLetters = [];

    if (storyObject) {
        scene.remove(storyObject);
        storyObject = null;
    }

    reset3DObjects();

    if (typeof resetHeartProgressForNewLevel === 'function') {
        resetHeartProgressForNewLevel();
    } else {
        redGemsCollected = 0;
        greenGemsCollected = 0;
        blueGemsCollected = 0;
    }

    initLetterSlots();
    updateGemCounterUI();
    updateHeartProgressUI();

    const sp = getEl('storyPanel');
    const levelCfg = getLevelConfig(currentLevel);
    if (sp) {
        sp.classList.remove('event-active');
        sp.textContent = `${levelCfg.icon} Collect runes & fill all bars!`;
    }

    hideEl('chaseProgress');

    gamePaused = false;
    gameRunning = true;

    console.log(`✅ Started Level ${currentLevel + 1}`);
}

window.continueToNextLevel = continueToNextLevel;

/* ---------------------------------------------------------------------------
   GAME OVER
--------------------------------------------------------------------------- */

function gameOver() {
    gameRunning = false;

    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (morseCountdownTimer) { clearInterval(morseCountdownTimer); morseCountdownTimer = null; }

    if (window.SoundManager) { SoundManager.play('gameOver'); SoundManager.stopBgMusic(1500); }

    if (score > highscore) {
        highscore = score;
        localStorage.setItem('mysteryMagicHighscore', String(highscore));
        setText('highscore', String(highscore));
    }

    setText('finalScore', String(score));
    const lvlReached = getEl('finalLevel');
    if (lvlReached) lvlReached.textContent = String(currentLevel + 1);

    const gemsTotal = getEl('finalGems');
    if (gemsTotal) gemsTotal.textContent = String(collectedGems);

    showEl('gameOverOverlay');
    hideEl('chaseProgress');
}

window.gameOver = gameOver;

/* ---------------------------------------------------------------------------
   PAUSE / RESUME / START / RESTART
--------------------------------------------------------------------------- */

function startGame() {
    hideEl('startOverlay');

    // Init sound (needs user gesture — startGame IS a user gesture)
    if (window.SoundManager) {
        SoundManager.init();
        // Respect soundEnabled flag from admin config
        const soundOn = (window.__GAME_CONFIG?.soundEnabled !== false);
        SoundManager.setEnabled(soundOn);
        if (soundOn) SoundManager.startBgMusic();
    }

    resetGame();
    gameRunning = true;
    gameStartTime = performance.now();

    const pauseBtn = getEl('pauseBtn');
    if (pauseBtn) {
        pauseBtn.classList.remove('hidden');
        pauseBtn.textContent = '⏸️';
    }
}

window.startGame = startGame;

function togglePause() {
    if (!gameRunning) return;
    gamePaused ? resumeGame() : pauseGame();
}

window.togglePause = togglePause;

function pauseGame() {
    if (!gameRunning) return;
    gamePaused = true;

    setText('pauseScore', String(score));
    setText('pauseLevel', String(currentLevel + 1));

    showEl('pauseOverlay');

    const btn = getEl('pauseBtn');
    if (btn) btn.textContent = '▶️';
}

function resumeGame() {
    gamePaused = false;
    hideEl('pauseOverlay');

    const btn = getEl('pauseBtn');
    if (btn) btn.textContent = '⏸️';
}

window.resumeGame = resumeGame;

function resetGame() {
    [
        'gameOverOverlay', 'finalWinOverlay', 'finalDialogOverlay', 'thankYouOverlay',
        'retryAlert', 'morseCodeOverlay', 'levelCompleteOverlay', 'passwordModal',
        'mysteryAlert', 'gameCountdown', 'hackingOverlay', 'localDecrypterOverlay',
        'cipherTranslationOverlay', 'pauseOverlay', 'morseCountdownOverlay',
        'unlockAnimationOverlay', 'templeWallOverlay', 'cinematicCreditsOverlay',
        'glitchDeleteOverlay', 'finalGoodbyeOverlay'
    ].forEach(hideEl);

    resetGameState();
    reset3DObjects();
    resetPlayerPosition();

    setText('score', '0');
    setText('gems', '0');
    setText('currentLevel', '1');

    const pf = getEl('levelProgressFill');
    if (pf) pf.style.width = '0%';

    updateLivesUI();
    updateGemCounterUI();
    updateHeartProgressUI();
    initLetterSlots();

    const levelCfg = getLevelConfig(0);
    const sp = getEl('storyPanel');
    if (sp) {
        sp.classList.remove('event-active');
        sp.textContent = `${levelCfg.icon} Collect 0/${LETTERS_REQUIRED} runes`;
    }

    hideEl('chaseProgress');

    const pauseBtn = getEl('pauseBtn');
    if (pauseBtn) pauseBtn.classList.add('hidden');
}

function restartGame() {
    if (window.SoundManager) SoundManager.stopBgMusic(300);
    resetGame();
    gameRunning = true;

    const pauseBtn = getEl('pauseBtn');
    if (pauseBtn) {
        pauseBtn.classList.remove('hidden');
        pauseBtn.textContent = '⏸️';
    }
}

window.restartGame = restartGame;

/* ---------------------------------------------------------------------------
   UPDATE LOOP (with mobile camera follow)
--------------------------------------------------------------------------- */

function update(timestamp) {
    deltaTime = Math.min((timestamp - lastTime) / 16.67, 3);
    lastTime = timestamp;

    if (!gameRunning || gamePaused) return;

    score += Math.floor(1 * deltaTime);
    setText('score', String(score));

    const speedSteps = Math.floor(score / 800);
    let baseSpeed = Math.min(
        DIFFICULTY.BASE_SPEED + speedSteps * DIFFICULTY.SPEED_INCREMENT,
        DIFFICULTY.MAX_SPEED
    );

    if (activeBoosts.speed.active) {
        baseSpeed = Math.min(baseSpeed * BOOSTS.SPEED.multiplier, DIFFICULTY.MAX_SPEED * 1.2);
    }

    gameSpeed = baseSpeed;

    updateSpeedIndicatorUI();
    updateBoostTimersUI();
    updateLevelProgressUI();

    if (player) {
        player.position.x += (targetLaneX - player.position.x) * 0.12 * deltaTime;
    }

    if (player && isJumping) {
        player.position.y += jumpVelocity * deltaTime;
        jumpVelocity -= 0.028 * deltaTime;
        if (player.position.y <= 0) {
            player.position.y = 0;
            isJumping = false;
            jumpVelocity = 0;
        }
    }

    if (player) {
        player.scale.y = isSliding ? 0.4 : Math.min(1, player.scale.y + 0.15 * deltaTime);
    }

    updatePlayerAnimations();
    updateEnvironmentAnimations();

    // Create magic trail - always try, QUALITY.maxTrails limits the count
    if (Math.random() < 0.12) createMagicTrail();

    const spd = gameSpeed * deltaTime;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.position.z += spd;
        if (o.position.z > 15) {
            scene.remove(o);
            obstacles.splice(i, 1);
        }
    }

    for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        g.position.z += spd;
        g.rotation.y += 0.045 * deltaTime;
        g.position.y += Math.sin(Date.now() / 220 + i) * 0.008;
        if (g.position.z > 15) {
            scene.remove(g);
            gems.splice(i, 1);
        }
    }

    for (let i = greenGems.length - 1; i >= 0; i--) {
        const g = greenGems[i];
        g.position.z += spd;
        g.rotation.y += 0.06 * deltaTime;
        g.rotation.x += 0.03 * deltaTime;
        g.position.y += Math.sin(Date.now() / 180 + i) * 0.01;
        if (g.position.z > 15) {
            scene.remove(g);
            greenGems.splice(i, 1);
        }
    }

    for (let i = redGems.length - 1; i >= 0; i--) {
        const g = redGems[i];
        g.position.z += spd;
        g.rotation.y += 0.08 * deltaTime;
        g.rotation.z += 0.04 * deltaTime;
        g.position.y += Math.sin(Date.now() / 150 + i) * 0.012;
        if (g.position.z > 15) {
            scene.remove(g);
            redGems.splice(i, 1);
        }
    }

    for (let i = boostItems.length - 1; i >= 0; i--) {
        const b = boostItems[i];
        b.position.z += spd;
        b.rotation.y += 0.07 * deltaTime;
        b.position.y += Math.sin(Date.now() / 200 + i) * 0.01;
        if (b.position.z > 15) {
            scene.remove(b);
            boostItems.splice(i, 1);
        }
    }

    for (let i = letterPickups.length - 1; i >= 0; i--) {
        const l = letterPickups[i];
        l.position.z += spd;
        l.rotation.y += 0.055 * deltaTime;
        if (l.position.z > 15) {
            scene.remove(l);
            letterPickups.splice(i, 1);
        }
    }

    if (!waitingForClearPath && !storyObjectActive) {
        if (Math.random() < DIFFICULTY.OBSTACLE_SPAWN_RATE) createObstacle();
        if (Math.random() < DIFFICULTY.GEM_SPAWN_RATE) createGem();
        if (Math.random() < DIFFICULTY.GREEN_GEM_SPAWN_RATE) createGreenGem();
        if (Math.random() < DIFFICULTY.RED_GEM_SPAWN_RATE) createRedGem();
        if (Math.random() < DIFFICULTY.BOOST_SPAWN_RATE) createBoostItem();

        const lettersNeeded = collectedLetters.filter(Boolean).length < LETTERS_REQUIRED;
        if (Math.random() < DIFFICULTY.LETTER_SPAWN_RATE && lettersNeeded) {
            createLetterPickup();
        }
    }

    /* ====== waitingForClearPath trigger logic ====== */
    if (waitingForClearPath && !storyObjectActive) {
        if (typeof isPathClear === 'function' && isPathClear()) {
            console.log('✅ Path clear! Triggering story event...');
            triggerStoryEvent();
        } else {
            if (!window._pathClearStartTime) {
                window._pathClearStartTime = Date.now();
                console.log('⏱️ Started path clear timeout...');
            }

            if (Date.now() - window._pathClearStartTime > 3000) {
                console.log('⚡ Force clearing path after 3s timeout...');
                if (typeof clearAllObstacles === 'function') {
                    clearAllObstacles();
                }
                window._pathClearStartTime = null;
                triggerStoryEvent();
            }
        }
    }

    if (storyObject && chaseStarted) {
        storyObject.position.z += spd * 0.42;
        storyObject.rotation.y += 0.032 * deltaTime;
        storyObject.position.y = 2 + Math.sin(Date.now() / 380) * 0.45;

        storyObject.userData.moveTimer += deltaTime;
        if (storyObject.userData.moveTimer > 60) {
            storyObject.userData.moveTimer = 0;

            if (storyObject.userData.targetLane >= 2) storyObject.userData.moveDirection = -1;
            else if (storyObject.userData.targetLane <= 0) storyObject.userData.moveDirection = 1;

            storyObject.userData.targetLane += storyObject.userData.moveDirection;
            storyObject.userData.targetLane = Math.max(0, Math.min(2, storyObject.userData.targetLane));
        }

        const targetX = LANES[storyObject.userData.targetLane];
        storyObject.position.x += (targetX - storyObject.position.x) * 0.03 * deltaTime;

        chaseProgress = Math.min(100, chaseProgress + DIFFICULTY.CHASE_FILL_RATE * deltaTime);

        const fill = getEl('chaseFill');
        if (fill) {
            fill.style.width = `${chaseProgress}%`;
            if (chaseProgress > 80) fill.classList.add('danger');
        }

        const distEl = getEl('chaseDistance');
        if (distEl) distEl.textContent = `Distance: ${Math.floor((100 - chaseProgress) * 2)}m`;

        if (chaseProgress >= DIFFICULTY.CHASE_ESCAPE_THRESHOLD) {
            showRetryAlert();
            return;
        }
    }

    if (checkCollisions()) {
        return;
    }

    updateParticles();

    // ====== MOBILE CAMERA FOLLOW ======
    if (player) {
        if (isMobile) {
            // Smoothly move camera horizontally to follow player
            let targetCamX = player.position.x * 0.4; // 40% of player offset keeps road visible
            camera.position.x += (targetCamX - camera.position.x) * 0.1 * deltaTime;

            // Look slightly ahead of player
            let lookAtX = player.position.x * 0.2;
            camera.lookAt(lookAtX, 2, -8);
        } else {
            // Desktop: keep camera centered
            camera.position.x = 0;
            camera.lookAt(0, 2, -8);
        }
    }
}

function animate(timestamp) {
    if (window.__STOP_RENDER__) return;

    requestAnimationFrame(animate);

    if (!assetsLoaded || !renderer || !scene || !camera) return;

    if (gameRunning && !gamePaused) update(timestamp || 0);

    renderer.render(scene, camera);
}

/* ---------------------------------------------------------------------------
   PROGRESSIVE LOAD
--------------------------------------------------------------------------- */

async function progressiveLoad() {
    try {
        updateLoadingBar(5);
        await sleep(80);

        const tip = getEl('loadingTip');
        if (tip) tip.textContent = getRandomLoadingTip();

        initThreeJS();
        updateLoadingBar(25);
        await sleep(80);

        createEnvironment();
        updateLoadingBar(50);
        await sleep(80);

        createElfPlayer();
        updateLoadingBar(70);
        await sleep(80);

        initLetterSlots();

        setText('highscore', String(highscore));
        updateLivesUI();
        updateGemCounterUI();
        updateHeartProgressUI();

        updateLoadingBar(88);
        await sleep(80);

        setTimeout(createMagicBackground, 350);
        startShootingStarsLoop();

        updateLoadingBar(100);

        const ls = getEl('loadingScreen');
        if (ls) {
            ls.style.opacity = '0';
            setTimeout(() => {
                ls.classList.add('hidden');
                assetsLoaded = true;
                requestAnimationFrame(animate);
            }, 500);
        } else {
            assetsLoaded = true;
            requestAnimationFrame(animate);
        }

    } catch (e) {
        console.error('Load error:', e);
        showNotification('Loading failed. Please refresh.', 'error', 5000);
    }
}

/* ---------------------------------------------------------------------------
   DOM READY: BINDINGS
--------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    initCameraPrivacyTranslate();

    const mainPw = getEl('mainPasswordInput');
    if (mainPw) {
        mainPw.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                checkMainPassword();
            }
        });
        mainPw.addEventListener('input', () => {
            mainPw.value = mainPw.value.toUpperCase();
        });
    }

    const cipherPwInput = getEl('cipherFinalPasswordInput');
    if (cipherPwInput) {
        cipherPwInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyCipherFinalPassword();
            }
        });
        cipherPwInput.addEventListener('input', () => {
            cipherPwInput.value = cipherPwInput.value.toUpperCase();
            updateCipherPasswordTypingState(cipherPwInput.value);
        });
    }

    initOptimizations();

    initOptimizations();

    // ✅ Wait for Supabase config preload, then start game loading
    (async () => {
        try {
            await (window.__CONFIG_READY__ || Promise.resolve());
        } catch (e) {
            console.warn('Config preload wait failed:', e);
        }
        progressiveLoad();
    })();
});



/* ---------------------------------------------------------------------------
   OWNER NOTIFICATION HELPER
--------------------------------------------------------------------------- */
/**
 * Notify game owner about YES/NO response.
 * @param {string} answer - 'yes' or 'no'
 */


console.log('✅ 13-main.js loaded (mobile camera follow added)');