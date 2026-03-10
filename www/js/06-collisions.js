/* ═══════════════════════════════════════════════════════════════════════════
   06-COLLISIONS.JS - OPTIMIZED v2.0
   Mystery Temple - Galaxy Edition

   FIXES:
   - ✅ deltaTime now global (or uses fallback)
   - ✅ Reusable Box3 objects (no GC overhead)
   - ✅ Proper function existence checks
   - ✅ Story event trigger after gem collection
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  REUSABLE COLLISION OBJECTS (Avoid GC)                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const CollisionCache = {
    playerBox: null,
    obstacleBox: null,

    init: function () {
        if (typeof THREE !== 'undefined' && !this.playerBox) {
            this.playerBox = new THREE.Box3();
            this.obstacleBox = new THREE.Box3();
        }
    },

    getPlayerBox: function () {
        this.init();
        return this.playerBox;
    },

    getObstacleBox: function () {
        this.init();
        return this.obstacleBox;
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  HELPER: Get Delta Time                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function getDeltaTime() {
    // Try global deltaTime first
    if (typeof window.deltaTime !== 'undefined') {
        return window.deltaTime;
    }
    // Fallback
    return 0.016; // 60fps default
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CHECK & TRIGGER STORY EVENT                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MAIN COLLISION CHECK                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function checkCollisions() {
    if (!player) return false;

    // ✅ Reuse Box3 objects
    const playerBox = CollisionCache.getPlayerBox();
    if (!playerBox) return false;

    playerBox.setFromObject(player);

    // Apply hitbox tolerance
    if (typeof DIFFICULTY !== 'undefined' && DIFFICULTY.HITBOX_TOLERANCE) {
        playerBox.min.x += DIFFICULTY.HITBOX_TOLERANCE;
        playerBox.max.x -= DIFFICULTY.HITBOX_TOLERANCE;
        playerBox.min.z += DIFFICULTY.HITBOX_TOLERANCE;
        playerBox.max.z -= DIFFICULTY.HITBOX_TOLERANCE;
    }

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  OBSTACLE COLLISIONS                                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function checkObstacleCollisions(playerBox) {
    if (!obstacles || obstacles.length === 0) return false;

    const obsBox = CollisionCache.getObstacleBox();
    if (!obsBox) return false;

    for (const obs of obstacles) {
        if (obs.position.z > 3 && obs.position.z < 7) {
            obsBox.setFromObject(obs);

            if (!playerBox.intersectsBox(obsBox)) continue;

            // Slide under barrier
            if (obs.userData.type === 'barrier' && isSliding) continue;

            // Jump over block
            if (player.position.y > (obs.userData.height || 1.5) - 0.3) continue;

            // Shield OR SpeedBoost active -> pass through
            if (activeBoosts && (activeBoosts.shield?.active || activeBoosts.speed?.active)) {
                return false;
            }

            // Normal hit -> lives system
            handlePlayerHit();
            return true;
        }
    }

    return false;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  HANDLE PLAYER HIT                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function handlePlayerHit() {
    if (isInvincible || isReviving) return;

    // Shield absorbs hit
    if (activeBoosts && activeBoosts.shield?.active) {
        if (typeof deactivateBoost === 'function') {
            deactivateBoost('shield');
        }
        if (typeof showNotification === 'function') {
            showNotification('Shield absorbed the hit!', 'success');
        }
        if (typeof vibrate === 'function') {
            vibrate([30, 20, 30]);
        }
        return;
    }

    // Lose a life
    currentLives = Math.max(0, currentLives - 1);

    if (typeof updateLivesUI === 'function') {
        updateLivesUI();
    }

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


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  REVIVAL SEQUENCE                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function startRevivalSequence() {
    isReviving = true;
    isInvincible = true;

    const overlay = getEl('revivalOverlay');
    const livesLeftEl = getEl('revivalLivesLeft');
    const countdownEl = getEl('revivalCountdown');

    if (overlay) {
        if (typeof showEl === 'function') {
            showEl(overlay);
        } else {
            overlay.classList.remove('hidden');
        }
    }

    if (livesLeftEl) livesLeftEl.textContent = currentLives.toString();

    const revivalTime = (typeof LIVES_CONFIG !== 'undefined' && LIVES_CONFIG.REVIVAL_TIME)
        ? LIVES_CONFIG.REVIVAL_TIME
        : 2000;

    let remaining = Math.floor(revivalTime / 1000);
    if (countdownEl) countdownEl.textContent = `Reviving in ${remaining}...`;

    // Clear any existing timer
    if (revivalTimer) clearInterval(revivalTimer);

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

function endRevivalSequence() {
    isReviving = false;

    // Start invincibility period
    const invincibilityTime = (typeof LIVES_CONFIG !== 'undefined' && LIVES_CONFIG.INVINCIBILITY_TIME)
        ? LIVES_CONFIG.INVINCIBILITY_TIME
        : 2000;

    setTimeout(() => {
        isInvincible = false;
    }, invincibilityTime);

    if (typeof hideEl === 'function') {
        hideEl('revivalOverlay');
    } else {
        const overlay = getEl('revivalOverlay');
        if (overlay) overlay.classList.add('hidden');
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COMPUTE GEM SCORE                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function computeGemScore(baseValue) {
    if (activeBoosts && activeBoosts.double?.active && typeof BOOSTS !== 'undefined') {
        return baseValue * (BOOSTS.DOUBLE?.multiplier || 2);
    }
    return baseValue;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COLLECT GEMS & BOOSTS                                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function collectGemsAndBoosts() {
    if (!player || typeof LANES === 'undefined') return;

    const playerLaneX = LANES[currentLane] || 0;
    const dt = getDeltaTime(); // ✅ Use helper function

    const magnetOn = activeBoosts && activeBoosts.magnet?.active;
    const magnetRange = (typeof BOOSTS !== 'undefined' && BOOSTS.MAGNET?.range) || 8;
    const magnetRangeX = magnetOn ? magnetRange : 1.5;
    const magnetRangeZ = magnetOn ? 28 : 9;

    // Magnet pull function
    const tryMagnetPull = (obj) => {
        obj.position.x += (playerLaneX - obj.position.x) * 0.18 * dt * 60;
        obj.position.y += Math.sin(Date.now() / 180) * 0.002;
    };

    // Check if should collect
    const shouldCollectLane = (obj) =>
        obj.position.z > 2 && obj.position.z < 9 && Math.abs(playerLaneX - obj.position.x) < 1.5;

    const shouldMagnetAffect = (obj) =>
        magnetOn &&
        obj.position.z > -magnetRangeZ && obj.position.z < 10 &&
        Math.abs(playerLaneX - obj.position.x) < magnetRangeX;

    // BLUE GEMS
    if (typeof gems !== 'undefined') {
        for (let i = gems.length - 1; i >= 0; i--) {
            const gem = gems[i];
            if (!gem || gem.userData.collected) continue;

            if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
            if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
                collectGem(gem, 'blue', i);
            }
        }
    }

    // GREEN GEMS
    if (typeof greenGems !== 'undefined') {
        for (let i = greenGems.length - 1; i >= 0; i--) {
            const gem = greenGems[i];
            if (!gem || gem.userData.collected) continue;

            if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
            if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
                collectGem(gem, 'green', i);
            }
        }
    }

    // RED GEMS
    if (typeof redGems !== 'undefined') {
        for (let i = redGems.length - 1; i >= 0; i--) {
            const gem = redGems[i];
            if (!gem || gem.userData.collected) continue;

            if (shouldMagnetAffect(gem)) tryMagnetPull(gem);
            if (shouldCollectLane(gem) || (magnetOn && shouldMagnetAffect(gem) && gem.position.z > 1.5)) {
                collectGem(gem, 'red', i);
            }
        }
    }

    // BOOST ITEMS
    if (typeof boostItems !== 'undefined') {
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
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COLLECT GEM                                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function collectGem(gem, type, index) {
    gem.userData.collected = true;
    const pos = gem.position.clone();

    // Screen position for popup
    let scr = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (typeof worldToScreen === 'function') {
        scr = worldToScreen(pos);
    }

    // Calculate score
    const base = gem.userData.baseValue ||
        (type === 'blue' ? 50 : type === 'green' ? 100 : 200);
    const value = computeGemScore(base);

    score += value;
    collectedGems++;

    // Track by type
    if (type === 'blue' && typeof blueGemsCollected !== 'undefined') blueGemsCollected++;
    if (type === 'green' && typeof greenGemsCollected !== 'undefined') greenGemsCollected++;
    if (type === 'red' && typeof redGemsCollected !== 'undefined') redGemsCollected++;

    // Update UI
    if (typeof setText === 'function') {
        setText('score', score.toString());
        setText('gems', collectedGems.toString());
    }
    if (typeof updateGemCounterUI === 'function') updateGemCounterUI();
    if (typeof updateHeartProgressUI === 'function') updateHeartProgressUI();

    // Remove from scene/array
    if (type === 'blue' && typeof gems !== 'undefined') {
        scene.remove(gem);
        gems.splice(index, 1);
    } else if (type === 'green' && typeof greenGems !== 'undefined') {
        scene.remove(gem);
        greenGems.splice(index, 1);
    } else if (type === 'red' && typeof redGems !== 'undefined') {
        scene.remove(gem);
        redGems.splice(index, 1);
    }

    // Visual effects (with existence checks)
    const colors = {
        blue: { hex: 0x0088ff, css: '#0af', icon: '💎' },
        green: { hex: 0x00ff88, css: '#0f8', icon: '💚' },
        red: { hex: 0xff4444, css: '#f44', icon: '❤️' }
    };
    const c = colors[type];

    if (typeof showGemPopup === 'function') {
        showGemPopup(scr.x, scr.y, value, c.icon);
    }
    if (typeof createSparkleEffect === 'function') {
        createSparkleEffect(scr.x, scr.y, c.css);
    }
    if (typeof createParticleEffect === 'function') {
        createParticleEffect(pos, c.hex, type === 'blue' ? 8 : 10);
    }
    if (type !== 'blue' && typeof createGemBurst === 'function') {
        createGemBurst(pos, c.hex);
    }

    // Sound
    if (window.SoundManager) {
        SoundManager.play('gem' + type.charAt(0).toUpperCase() + type.slice(1));
    }

    // Vibrate
    if (typeof vibrate === 'function') {
        vibrate([40, 20, 40]);
    }

    // ✅ Check if all bars filled
    checkAndTriggerStoryEvent();
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COLLECT BOOST                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function collectBoost(boost, index) {
    boost.userData.collected = true;
    const pos = boost.position.clone();

    let scr = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (typeof worldToScreen === 'function') {
        scr = worldToScreen(pos);
    }

    const boostId = boost.userData.boostId;

    // Activate boost
    if (typeof activateBoost === 'function') {
        activateBoost(boostId);
    }

    // Get boost config
    let label = 'BOOST';
    let icon = '✨';
    if (typeof BOOSTS !== 'undefined') {
        const boostConfig = Object.values(BOOSTS).find(b => b.id === boostId);
        if (boostConfig) {
            label = boostConfig.name || label;
            icon = boostConfig.icon || icon;
        }
    }

    // Effects
    if (typeof showBoostPopup === 'function') {
        showBoostPopup(label, icon);
    }
    if (typeof createSparkleEffect === 'function') {
        createSparkleEffect(scr.x, scr.y, '#ff0');
    }
    if (typeof createParticleEffect === 'function') {
        createParticleEffect(pos, 0xffff00, 12);
    }
    if (typeof vibrate === 'function') {
        vibrate([60, 40, 60]);
    }

    if (window.SoundManager) SoundManager.play('boost');

    scene.remove(boost);
    if (typeof boostItems !== 'undefined') {
        boostItems.splice(index, 1);
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COLLECT LETTERS                                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function collectLetters() {
    if (!player || typeof letterPickups === 'undefined' || typeof LANES === 'undefined') return;

    const playerLaneX = LANES[currentLane] || 0;
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
                let scr = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                if (typeof worldToScreen === 'function') {
                    scr = worldToScreen(pos);
                }

                // Store collected letter
                if (typeof collectedLetters !== 'undefined') {
                    collectedLetters[letter.userData.letterIndex] = letter.userData.letter;
                }
                if (typeof totalRunesCollected !== 'undefined') {
                    totalRunesCollected++;
                }

                // UI updates
                if (typeof updateLetterDisplay === 'function') {
                    updateLetterDisplay();
                }
                if (typeof updateHeartProgressUI === 'function') {
                    updateHeartProgressUI();
                }

                // Remove
                scene.remove(letter);
                letterPickups.splice(i, 1);

                // Effects
                if (typeof showRunePopup === 'function') {
                    showRunePopup(scr.x, scr.y);
                }
                if (typeof createSparkleEffect === 'function') {
                    createSparkleEffect(scr.x, scr.y, '#fc0');
                }
                if (typeof createParticleEffect === 'function') {
                    createParticleEffect(pos, 0xffaa00, 15);
                }
                if (typeof vibrate === 'function') {
                    vibrate([50, 30, 50]);
                }

                if (window.SoundManager) SoundManager.play('rune');

                // ✅ Check if all bars filled
                checkAndTriggerStoryEvent();
            }
        }
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPORTS                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

window.checkCollisions = checkCollisions;
window.checkObstacleCollisions = checkObstacleCollisions;
window.handlePlayerHit = handlePlayerHit;
window.startRevivalSequence = startRevivalSequence;
window.endRevivalSequence = endRevivalSequence;
window.collectGem = collectGem;
window.collectBoost = collectBoost;
window.collectLetters = collectLetters;
window.checkAndTriggerStoryEvent = checkAndTriggerStoryEvent;

console.log('✅ 06-collisions.js loaded (OPTIMIZED v2.0)');