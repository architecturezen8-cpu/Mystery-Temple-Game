/* ═══════════════════════════════════════════════════════════════════════════
   13-MAIN.JS - FULLY OPTIMIZED v2.0
   Mystery Temple - Galaxy Edition
   
   FIXES:
   - ✅ Proper deltaTime handling (single source)
   - ✅ FPS limiting integrated correctly
   - ✅ Camera code inside update()
   - ✅ All animation functions receive deltaTime
   - ✅ Instant UI button response
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ============================================================================
// SUPABASE INTEGRATION
// ============================================================================

let sb = null;

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

async function preloadConfigFromSupabase() {
    // Step 1: Apply from localStorage immediately
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
        window.__PLAYER_CHAT_ID = localStorage.getItem('player_chat_id') || '';
        window.__OWNER_CHAT_ID = localStorage.getItem('owner_chat_id') || '';
    } catch (e) { console.warn('localStorage config error:', e); }

    // Step 2: Sync from Supabase
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
        window.__ACCESS_CODE = data.access_code || '';
        window.__GAME_ROW__ = data;

        if (data.access_code) localStorage.setItem('access_code', data.access_code);
        if (data.receiver_name) localStorage.setItem('receiver_name', data.receiver_name);
        if (data.slug) localStorage.setItem('game_slug', data.slug);

        const existingChatId = localStorage.getItem('player_chat_id');
        if (!existingChatId && data.player_chat_id) {
            localStorage.setItem('player_chat_id', data.player_chat_id);
            window.__PLAYER_CHAT_ID = data.player_chat_id;
        }

        if (data.owner_chat_id) {
            window.__OWNER_CHAT_ID = data.owner_chat_id;
            localStorage.setItem('owner_chat_id', data.owner_chat_id);
        }

        if (data.config && typeof window.applyAdminConfig === 'function') {
            window.applyAdminConfig(data.config);
            localStorage.setItem('game_config', JSON.stringify(data.config));
        }

        console.log('✅ Config synced from Supabase');
        return data;
    } catch (err) {
        console.error('❌ Failed to preload config:', err);
        return null;
    }
}

if (window.__PENDING_LOCALSTORAGE_CONFIG && typeof window.applyAdminConfig === 'function') {
    try {
        window.applyAdminConfig(window.__PENDING_LOCALSTORAGE_CONFIG);
        console.log('✅ localStorage config applied immediately');
    } catch (e) { console.warn('Pending config apply error:', e); }
}

window.__CONFIG_READY__ = preloadConfigFromSupabase();
window.loadGameConfigFromSlug = preloadConfigFromSupabase;
loadGameConfigFromSlug();


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  UI: LETTER / RUNE SLOTS                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  UI: PASSWORD / LEVEL COMPLETE SCREEN                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  STORY EVENT + CHASE FLOW                                                 ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function triggerStoryEvent() {
    console.log('🎯 triggerStoryEvent() called!');

    gamePaused = true;
    storyObjectActive = true;
    waitingForClearPath = false;
    chaseStarted = false;

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LEVEL CONTINUATION                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GAME OVER                                                                 ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PAUSE / RESUME / START / RESTART                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function startGame() {
    hideEl('startOverlay');

    if (window.SoundManager) {
        SoundManager.init();
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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ✅ OPTIMIZED UPDATE LOOP - Accepts deltaTime as parameter                 ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function update(deltaTime) {
    if (!gameRunning || gamePaused) return;

    // ═══════════════════════════════════════════════════════════════════
    // SCORE & SPEED
    // ═══════════════════════════════════════════════════════════════════
    score += Math.floor(1 * deltaTime * 60);
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

    // ═══════════════════════════════════════════════════════════════════
    // PLAYER MOVEMENT
    // ═══════════════════════════════════════════════════════════════════
    if (player) {
        player.position.x += (targetLaneX - player.position.x) * 0.12 * deltaTime * 60;
    }

    if (player && isJumping) {
        player.position.y += jumpVelocity * deltaTime * 60;
        jumpVelocity -= 0.028 * deltaTime * 60;
        if (player.position.y <= 0) {
            player.position.y = 0;
            isJumping = false;
            jumpVelocity = 0;
        }
    }

    if (player) {
        player.scale.y = isSliding ? 0.4 : Math.min(1, player.scale.y + 0.15 * deltaTime * 60);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANIMATIONS (✅ Pass deltaTime)
    // ═══════════════════════════════════════════════════════════════════
    if (typeof updatePlayerAnimations === 'function') {
        updatePlayerAnimations(deltaTime);
    }

    if (typeof updateEnvironmentAnimations === 'function') {
        updateEnvironmentAnimations(deltaTime);
    }

    // Magic trail
    if (Math.random() < 0.12) {
        if (typeof createMagicTrail === 'function') createMagicTrail();
    }

    // ═══════════════════════════════════════════════════════════════════
    // MOVE OBJECTS
    // ═══════════════════════════════════════════════════════════════════
    const spd = gameSpeed * deltaTime * 60;

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.position.z += spd;
        if (o.position.z > 15) {
            scene.remove(o);
            obstacles.splice(i, 1);
        }
    }

    // Blue gems
    for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        g.position.z += spd;
        g.rotation.y += 0.045 * deltaTime * 60;
        g.position.y += Math.sin(Date.now() / 220 + i) * 0.008;
        if (g.position.z > 15) {
            scene.remove(g);
            gems.splice(i, 1);
        }
    }

    // Green gems
    for (let i = greenGems.length - 1; i >= 0; i--) {
        const g = greenGems[i];
        g.position.z += spd;
        g.rotation.y += 0.06 * deltaTime * 60;
        g.rotation.x += 0.03 * deltaTime * 60;
        g.position.y += Math.sin(Date.now() / 180 + i) * 0.01;
        if (g.position.z > 15) {
            scene.remove(g);
            greenGems.splice(i, 1);
        }
    }

    // Red gems
    for (let i = redGems.length - 1; i >= 0; i--) {
        const g = redGems[i];
        g.position.z += spd;
        g.rotation.y += 0.08 * deltaTime * 60;
        g.rotation.z += 0.04 * deltaTime * 60;
        g.position.y += Math.sin(Date.now() / 150 + i) * 0.012;
        if (g.position.z > 15) {
            scene.remove(g);
            redGems.splice(i, 1);
        }
    }

    // Boost items
    for (let i = boostItems.length - 1; i >= 0; i--) {
        const b = boostItems[i];
        b.position.z += spd;
        b.rotation.y += 0.07 * deltaTime * 60;
        b.position.y += Math.sin(Date.now() / 200 + i) * 0.01;
        if (b.position.z > 15) {
            scene.remove(b);
            boostItems.splice(i, 1);
        }
    }

    // Letter pickups
    for (let i = letterPickups.length - 1; i >= 0; i--) {
        const l = letterPickups[i];
        l.position.z += spd;
        l.rotation.y += 0.055 * deltaTime * 60;
        if (l.position.z > 15) {
            scene.remove(l);
            letterPickups.splice(i, 1);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPAWN OBJECTS
    // ═══════════════════════════════════════════════════════════════════
    if (!waitingForClearPath && !storyObjectActive) {
        if (Math.random() < DIFFICULTY.OBSTACLE_SPAWN_RATE) {
            if (typeof createObstacle === 'function') createObstacle();
        }
        if (Math.random() < DIFFICULTY.GEM_SPAWN_RATE) {
            if (typeof createGem === 'function') createGem();
        }
        if (Math.random() < DIFFICULTY.GREEN_GEM_SPAWN_RATE) {
            if (typeof createGreenGem === 'function') createGreenGem();
        }
        if (Math.random() < DIFFICULTY.RED_GEM_SPAWN_RATE) {
            if (typeof createRedGem === 'function') createRedGem();
        }
        if (Math.random() < DIFFICULTY.BOOST_SPAWN_RATE) {
            if (typeof createBoostItem === 'function') createBoostItem();
        }

        const lettersNeeded = collectedLetters.filter(Boolean).length < LETTERS_REQUIRED;
        if (Math.random() < DIFFICULTY.LETTER_SPAWN_RATE && lettersNeeded) {
            if (typeof createLetterPickup === 'function') createLetterPickup();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PATH CLEAR TRIGGER
    // ═══════════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════════
    // STORY OBJECT / CHASE
    // ═══════════════════════════════════════════════════════════════════
    if (storyObject && chaseStarted) {
        storyObject.position.z += spd * 0.42;
        storyObject.rotation.y += 0.032 * deltaTime * 60;
        storyObject.position.y = 2 + Math.sin(Date.now() / 380) * 0.45;

        storyObject.userData.moveTimer = (storyObject.userData.moveTimer || 0) + deltaTime * 60;
        if (storyObject.userData.moveTimer > 60) {
            storyObject.userData.moveTimer = 0;

            if (storyObject.userData.targetLane >= 2) storyObject.userData.moveDirection = -1;
            else if (storyObject.userData.targetLane <= 0) storyObject.userData.moveDirection = 1;

            storyObject.userData.targetLane += storyObject.userData.moveDirection;
            storyObject.userData.targetLane = Math.max(0, Math.min(2, storyObject.userData.targetLane));
        }

        const targetX = LANES[storyObject.userData.targetLane];
        storyObject.position.x += (targetX - storyObject.position.x) * 0.03 * deltaTime * 60;

        chaseProgress = Math.min(100, chaseProgress + DIFFICULTY.CHASE_FILL_RATE * deltaTime * 60);

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

    // ═══════════════════════════════════════════════════════════════════
    // COLLISIONS
    // ═══════════════════════════════════════════════════════════════════
    if (typeof checkCollisions === 'function' && checkCollisions()) {
        return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PARTICLES
    // ═══════════════════════════════════════════════════════════════════
    if (typeof updateParticles === 'function') {
        updateParticles();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✅ MOBILE CAMERA FOLLOW (Moved inside update)
    // ═══════════════════════════════════════════════════════════════════
    if (player && camera) {
        const isMobile = window.isMobile || (window.DeviceProfiler?.detect && window.DeviceProfiler.detect().isMobile);

        if (isMobile) {
            // Smoothly move camera horizontally to follow player
            const targetCamX = player.position.x * 0.4;
            camera.position.x += (targetCamX - camera.position.x) * 0.1 * deltaTime * 60;

            // Look slightly ahead of player
            const lookAtX = player.position.x * 0.2;
            camera.lookAt(lookAtX, 2, -8);
        } else {
            // Desktop: keep camera centered
            camera.position.x = 0;
            camera.lookAt(0, 2, -8);
        }
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ✅ OPTIMIZED ANIMATE LOOP - Single deltaTime source                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let lastAnimateTime = 0;

function animate(timestamp) {
    if (window.__STOP_RENDER__) return;

    requestAnimationFrame(animate);

    if (!assetsLoaded || !renderer || !scene || !camera) return;

    // ═══════════════════════════════════════════════════════════════════
    // ✅ SINGLE SOURCE OF DELTA TIME
    // ═══════════════════════════════════════════════════════════════════
    let deltaTime = 0.016; // Default 60fps (1/60)

    if (window.FPSManager && typeof window.FPSManager.checkFrameTiming === 'function') {
        // Use FPS Manager for timing
        const timing = window.FPSManager.checkFrameTiming(timestamp);

        if (!timing.shouldRender) {
            return; // Skip this frame - too soon (FPS limiting)
        }

        deltaTime = timing.deltaTime || 0.016;
    } else {
        // Fallback: Calculate deltaTime manually
        const now = timestamp || performance.now();

        if (lastAnimateTime > 0) {
            const elapsed = now - lastAnimateTime;
            deltaTime = Math.min(elapsed / 1000, 0.1); // Cap at 100ms
        }

        lastAnimateTime = now;
    }

    // ═══════════════════════════════════════════════════════════════════
    // UPDATE & RENDER
    // ═══════════════════════════════════════════════════════════════════
    if (gameRunning && !gamePaused) {
        update(deltaTime); // ✅ Pass deltaTime to update
    }

    renderer.render(scene, camera);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PROGRESSIVE LOAD                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

async function progressiveLoad() {
    try {
        updateLoadingBar(5);
        await sleep(80);

        const tip = getEl('loadingTip');
        if (tip && typeof getRandomLoadingTip === 'function') {
            tip.textContent = getRandomLoadingTip();
        }

        if (typeof initThreeJS === 'function') {
            initThreeJS();
        }
        updateLoadingBar(25);
        await sleep(80);

        if (typeof createEnvironment === 'function') {
            createEnvironment();
        }
        updateLoadingBar(50);
        await sleep(80);

        if (typeof createElfPlayer === 'function') {
            createElfPlayer();
        }
        updateLoadingBar(70);
        await sleep(80);

        initLetterSlots();

        setText('highscore', String(highscore));

        if (typeof updateLivesUI === 'function') updateLivesUI();
        if (typeof updateGemCounterUI === 'function') updateGemCounterUI();
        if (typeof updateHeartProgressUI === 'function') updateHeartProgressUI();

        updateLoadingBar(88);
        await sleep(80);

        if (typeof createMagicBackground === 'function') {
            setTimeout(createMagicBackground, 350);
        }

        if (typeof startShootingStarsLoop === 'function') {
            startShootingStarsLoop();
        }

        updateLoadingBar(100);

        const ls = getEl('loadingScreen');
        if (ls) {
            ls.style.opacity = '0';
            setTimeout(() => {
                ls.classList.add('hidden');
                assetsLoaded = true;
                lastAnimateTime = performance.now();
                requestAnimationFrame(animate);
            }, 500);
        } else {
            assetsLoaded = true;
            lastAnimateTime = performance.now();
            requestAnimationFrame(animate);
        }

        console.log('✅ Game loaded successfully!');

    } catch (e) {
        console.error('Load error:', e);
        if (typeof showNotification === 'function') {
            showNotification('Loading failed. Please refresh.', 'error', 5000);
        }
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  INSTANT BUTTON BINDINGS                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function bindAllUIButtons() {
    const bindFn = window.fastBindBtn || window.bindUIButton;

    if (!bindFn) {
        console.warn('⚠️ fastBindBtn not available');
        return;
    }

    const buttonBindings = {
        'playBtn': startGame,
        'startBtn': startGame,
        'pauseBtn': togglePause,
        'resumeBtn': resumeGame,
        'pauseResumeBtn': resumeGame,
        'restartBtn': restartGame,
        'retryBtn': retryLevel,
        'gameOverRestartBtn': restartGame,
        'countdownStartBtn': startCountdownOnScreen,
        'goPasswordBtn': goToPasswordPage,
        'continueBtn': continueToNextLevel,
        'submitPasswordBtn': checkMainPassword,
        'closePasswordBtn': closeMainPasswordModal,
        'submitCipherBtn': () => {
            if (typeof verifyCipherFinalPassword === 'function') {
                verifyCipherFinalPassword();
            }
        },
        'closeBtn': () => {
            document.querySelectorAll('.overlay').forEach(el => {
                el.classList.add('hidden');
            });
        }
    };

    Object.entries(buttonBindings).forEach(([id, fn]) => {
        bindFn(id, fn);
    });

    // Bind onclick attributes
    document.querySelectorAll('[onclick]').forEach(el => {
        const onclickStr = el.getAttribute('onclick');
        if (!onclickStr) return;

        const match = onclickStr.match(/^(\w+)\(/);
        if (!match) return;

        const fnName = match[1];
        const fn = window[fnName];

        if (typeof fn === 'function') {
            el.removeAttribute('onclick');
            bindFn(el, fn);
        }
    });

    console.log('✅ All UI buttons bound');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  DOM READY                                                                 ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

document.addEventListener('DOMContentLoaded', () => {
    // Init controls
    if (typeof initControls === 'function') {
        initControls();
    }

    // Init camera privacy translate
    if (typeof initCameraPrivacyTranslate === 'function') {
        initCameraPrivacyTranslate();
    }

    // Password input handlers
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
                if (typeof verifyCipherFinalPassword === 'function') {
                    verifyCipherFinalPassword();
                }
            }
        });
        cipherPwInput.addEventListener('input', () => {
            cipherPwInput.value = cipherPwInput.value.toUpperCase();
            if (typeof updateCipherPasswordTypingState === 'function') {
                updateCipherPasswordTypingState(cipherPwInput.value);
            }
        });
    }

    // Init optimizations
    if (typeof initOptimizations === 'function') {
        initOptimizations();
    }

    // Bind buttons after controls are ready
    setTimeout(bindAllUIButtons, 100);

    // Start game loading after config is ready
    (async () => {
        try {
            await (window.__CONFIG_READY__ || Promise.resolve());
        } catch (e) {
            console.warn('Config preload wait failed:', e);
        }
        progressiveLoad();
    })();
});


console.log('✅ 13-main.js loaded (OPTIMIZED v2.0 - fixed deltaTime)');