/* ═══════════════════════════════════════════════════════════════════════════
   06-COLLISIONS.JS
   Mystery Temple - Galaxy Edition

   Collision detection and collection logic:
   - Obstacles (with lives system)
   - Gems (with magnet & double points boosts)
   - Letters (runes)
   - Story object catch
   
   ✅ FIXED: Check areAllHeartBarsFilled() after EVERY gem collection
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ====== BEGIN ADD: Check all bars after collection ====== */
/**
 * ✅ NEW: Check if all heart bars are filled and trigger story event.
 * Called after EVERY gem/rune collection.
 */
function checkAndTriggerStoryEvent() {
    // Don't check if already in story mode or waiting
    if (storyObjectActive || waitingForClearPath) return;
    
    // Check if function exists and all bars filled
    if (typeof areAllHeartBarsFilled === 'function' && areAllHeartBarsFilled()) {
        console.log('✅ All 4 bars filled! Triggering story event...');
        waitingForClearPath = true;
        
        const sp = getEl('storyPanel');
        if (sp) sp.textContent = '✨ All requirements met! Path clearing...';
    }
}
/* ====== END ADD: Check all bars after collection ====== */

/**
 * Main collision/collection handler.
 * Called every frame from the game loop.
 *
 * @returns {boolean} true if a fatal collision (game over) happened
 */
function checkCollisions() {
    if (!player) return false;

    // Player hitbox
    const playerBox = new THREE.Box3().setFromObject(player);
    playerBox.min.x += DIFFICULTY.HITBOX_TOLERANCE;
    playerBox.max.x -= DIFFICULTY.HITBOX_TOLERANCE;
    playerBox.min.z += DIFFICULTY.HITBOX_TOLERANCE;
    playerBox.max.z -= DIFFICULTY.HITBOX_TOLERANCE;

    // Obstacles
    if (checkObstacleCollisions(playerBox)) {
        return currentLives <= 0;
    }

    // Gems & boosts & letters
    collectGemsAndBoosts();
    collectLetters();

    // Story object catch (during chase)
    if (storyObject && chaseStarted) {
        const dist = player.position.distanceTo(storyObject.position);
        if (dist < 3.5) {
            if (typeof catchStoryObject === 'function') {
                catchStoryObject();
            }
        }
    }

    return false;
}

/**
 * Check collisions with obstacles and handle lives/boosts.
 * @param {THREE.Box3} playerBox 
 * @returns {boolean} true if hit occurred
 */
function checkObstacleCollisions(playerBox) {
    for (const obs of obstacles) {
        if (obs.position.z > 3 && obs.position.z < 7) {
            const obsBox = new THREE.Box3().setFromObject(obs);

            if (!playerBox.intersectsBox(obsBox)) continue;

            // Slide under barrier
            if (obs.userData.type === 'barrier' && isSliding) continue;

            // Jump over block
            if (player.position.y > obs.userData.height - 0.3) continue;

            // Shield OR SpeedBoost active -> pass through
            if (activeBoosts.shield.active || activeBoosts.speed.active) {
                return false;
            }

            // Normal hit -> lives system
            handlePlayerHit();
            return true;
        }
    }

    return false;
}

/**
 * Handle player hit with obstacle.
 */
function handlePlayerHit() {
    if (isInvincible || isReviving) return;

    if (activeBoosts.shield.active) {
        deactivateBoost('shield');
        showNotification('Shield absorbed the hit!', 'success');
        vibrate([30, 20, 30]);
        return;
    }

    currentLives = Math.max(0, currentLives - 1);
    updateLivesUI();

    if (window.SoundManager) {
        SoundManager.play('hit');
        SoundManager.play('lifeLost');
    }

    if (currentLives > 0) {
        startRevivalSequence();
    } else {
        if (typeof gameOver === 'function') {
            gameOver();
        }
    }
}

/**
 * Start revival sequence.
 */
function startRevivalSequence() {
    isReviving = true;
    isInvincible = true;

    const overlay = getEl('revivalOverlay');
    const livesLeftEl = getEl('revivalLivesLeft');
    const countdownEl = getEl('revivalCountdown');

    if (overlay) showEl(overlay);
    if (livesLeftEl) livesLeftEl.textContent = currentLives.toString();

    let remaining = Math.floor(LIVES_CONFIG.REVIVAL_TIME / 1000);
    if (countdownEl) countdownEl.textContent = `Reviving in ${remaining}...`;

    revivalTimer = setInterval(() => {
        remaining--;
        if (countdownEl) countdownEl.textContent = `Reviving in ${remaining}...`;
        if (remaining <= 0) {
            clearInterval(revivalTimer);
            revivalTimer = null;
            endRevivalSequence();
        }
    }, 1000);
}

/**
 * End revival sequence.
 */
function endRevivalSequence() {
    isReviving = false;
    isInvincible = false;
    hideEl('revivalOverlay');
}

/**
 * Compute gem score with double points boost.
 */
function computeGemScore(baseValue) {
    if (activeBoosts.double.active) {
        return baseValue * BOOSTS.DOUBLE.multiplier;
    }
    return baseValue;
}

/**
 * Collect gems and boosts if player is close enough.
 */
function collectGemsAndBoosts() {
    if (!player) return;

    const playerLaneX = LANES[currentLane];

    const magnetOn = activeBoosts.magnet.active;
    const magnetRangeX = magnetOn ? BOOSTS.MAGNET.range : 1.5;
    const magnetRangeZ = magnetOn ? 28 : 9;

    const tryMagnetPull = (obj) => {
        obj.position.x += (playerLaneX - obj.position.x) * 0.18 * deltaTime;
        obj.position.y += Math.sin(Date.now() / 180) * 0.002;
    };

    const shouldCollectLane = (obj) =>
        obj.position.z > 2 && obj.position.z < 9 && Math.abs(playerLaneX - obj.position.x) < 1.5;

    const shouldMagnetAffect = (obj) =>
        magnetOn &&
        obj.position.z > -magnetRangeZ && obj.position.z < 10 &&
        Math.abs(playerLaneX - obj.position.x) < magnetRangeX;

    // BLUE
    for (let i = gems.length - 1; i >= 0; i--) {
        const gem = gems[i];
        if (!gem || gem.userData.collected) continue;

        if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
        if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
            collectGem(gem, 'blue', i);
        }
    }

    // GREEN
    for (let i = greenGems.length - 1; i >= 0; i--) {
        const gem = greenGems[i];
        if (!gem || gem.userData.collected) continue;

        if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
        if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
            collectGem(gem, 'green', i);
        }
    }

    // RED
    for (let i = redGems.length - 1; i >= 0; i--) {
        const gem = redGems[i];
        if (!gem || gem.userData.collected) continue;

        if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
        if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
            collectGem(gem, 'red', i);
        }
    }

    // BOOST ITEMS
    for (let i = boostItems.length - 1; i >= 0; i--) {
        const b = boostItems[i];
        if (!b || b.userData.collected) continue;

        const laneClose = Math.abs(playerLaneX - b.position.x) < 1.6;
        const zClose = b.position.z > 2 && b.position.z < 9;

        if (laneClose && zClose) {
            collectBoost(b, i);
        }
    }
}

/* ====== BEGIN REPLACE: collectGem (add story event check) ====== */
/**
 * ✅ FIX: Collect a gem and check if all bars filled.
 * @param {THREE.Group} gem 
 * @param {string} type - 'blue' | 'green' | 'red'
 * @param {number} index - index in corresponding array
 */
function collectGem(gem, type, index) {
    gem.userData.collected = true;
    const pos = gem.position.clone();
    const scr = worldToScreen(pos);

    // Score
    const base = gem.userData.baseValue ||
        (type === 'blue' ? 50 : type === 'green' ? 100 : 200);
    const value = computeGemScore(base);
    score += value;
    collectedGems++;

    if (type === 'blue') blueGemsCollected++;
    if (type === 'green') greenGemsCollected++;
    if (type === 'red') redGemsCollected++;

    // Update UI
    setText('score', score.toString());
    setText('gems', collectedGems.toString());
    updateGemCounterUI();
    updateHeartProgressUI();

    // Remove from scene/array
    if (type === 'blue') {
        scene.remove(gem);
        gems.splice(index, 1);
    } else if (type === 'green') {
        scene.remove(gem);
        greenGems.splice(index, 1);
    } else {
        scene.remove(gem);
        redGems.splice(index, 1);
    }

    // Visual effects
    if (type === 'blue') {
        showGemPopup(scr.x, scr.y, value, '💎');
        createSparkleEffect(scr.x, scr.y, '#0af');
        createParticleEffect(pos, 0x0088ff, 8);
        if (window.SoundManager) SoundManager.play('gemBlue');
    } else if (type === 'green') {
        showGemPopup(scr.x, scr.y, value, '💚');
        createSparkleEffect(scr.x, scr.y, '#0f8');
        createParticleEffect(pos, 0x00ff88, 10);
        createGemBurst(pos, 0x00ff88);
        if (window.SoundManager) SoundManager.play('gemGreen');
    } else {
        showGemPopup(scr.x, scr.y, value, '❤️');
        createSparkleEffect(scr.x, scr.y, '#f44');
        createParticleEffect(pos, 0xff4444, 12);
        createGemBurst(pos, 0xff4444);
        if (window.SoundManager) SoundManager.play('gemRed');
    }

    vibrate([40, 20, 40]);

    // ✅ FIX: Check if all bars filled after EVERY gem collection
    checkAndTriggerStoryEvent();
}
/* ====== END REPLACE: collectGem (add story event check) ====== */

/**
 * Collect a boost item and activate its effect.
 */
function collectBoost(boost, index) {
    boost.userData.collected = true;
    const pos = boost.position.clone();
    const scr = worldToScreen(pos);
    const boostId = boost.userData.boostId;

    if (typeof activateBoost === 'function') {
        activateBoost(boostId);
    }

    const boostConfig = Object.values(BOOSTS).find(b => b.id === boostId);
    const label = boostConfig ? boostConfig.name : 'BOOST';
    const icon = boostConfig ? boostConfig.icon : '✨';
    showBoostPopup(label, icon);
    createSparkleEffect(scr.x, scr.y, '#ff0');
    createParticleEffect(pos, 0xffff00, 12);
    vibrate([60, 40, 60]);

    if (window.SoundManager) SoundManager.play('boost');

    scene.remove(boost);
    boostItems.splice(index, 1);
}

/* ====== BEGIN REPLACE: collectLetters (add story event check) ====== */
/**
 * ✅ FIX: Collect rune letters and check if all bars filled.
 */
function collectLetters() {
    if (!player) return;

    const playerLaneX = LANES[currentLane];
    const playerPos = player.position.clone();

    for (let i = letterPickups.length - 1; i >= 0; i--) {
        const letter = letterPickups[i];
        if (!letter || letter.userData.collected) continue;

        if (letter.position.z > 3 && letter.position.z < 8) {
            const horizontalDiff = Math.abs(playerLaneX - letter.position.x);
            const dist = playerPos.distanceTo(letter.position);

            if (horizontalDiff < 1.5 && dist < 3) {
                letter.userData.collected = true;

                const pos = letter.position.clone();
                const scr = worldToScreen(pos);

                collectedLetters[letter.userData.letterIndex] = letter.userData.letter;
                totalRunesCollected++;

                // UI updates
                if (typeof updateLetterDisplay === 'function') {
                    updateLetterDisplay();
                }
                updateHeartProgressUI();

                scene.remove(letter);
                letterPickups.splice(i, 1);

                showRunePopup(scr.x, scr.y);
                createSparkleEffect(scr.x, scr.y, '#fc0');
                createParticleEffect(pos, 0xffaa00, 15);
                vibrate([50, 30, 50]);

                if (window.SoundManager) SoundManager.play('rune');

                // ✅ FIX: Check if all bars filled after rune collection
                checkAndTriggerStoryEvent();
            }
        }
    }
}
/* ====== END REPLACE: collectLetters (add story event check) ====== */

console.log('✅ 06-collisions.js loaded');