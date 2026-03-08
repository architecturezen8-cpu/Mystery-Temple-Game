/* ═══════════════════════════════════════════════════════════════════════════
   07-EFFECTS.JS
   Mystery Temple - Galaxy Edition

   Visual-only helpers:
   - Loading bar & tips
   - Background magic particles & shooting stars
   - Gem popups, sparkles, particles, trails, bursts
   - HUD UI updates (gems, hearts, lives, speed)
   - Boost activation UI
   
   ✅ FIXED: Heart progress bars - Yellow/Blue/Red/Green must all fill to complete level
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  SOUND MANAGER (SFX)                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/* ═══════════════════════════════════════════════════════════════════════════
   SOUND MANAGER — Web Audio API Synthesizer (no external files needed)
   All sounds are procedurally generated. Works on all devices.
═══════════════════════════════════════════════════════════════════════════ */

const SoundManager = (() => {
    let ctx = null;
    let bgNode = null, bgGain = null;
    let enabled = true;

    function getCtx() {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        }
        return ctx;
    }

    // Safely resume context after user gesture
    function resume() {
        const c = getCtx();
        if (c && c.state === 'suspended') c.resume().catch(() => {});
        return c;
    }

    function tone(freq, type, duration, vol, startFreq, attack, decay) {
        if (!enabled) return;
        const c = resume(); if (!c) return;
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = type || 'sine';
        const t = c.currentTime;
        const atk = attack || 0.01;
        const dec = decay || duration;
        if (startFreq && startFreq !== freq) {
            o.frequency.setValueAtTime(startFreq, t);
            o.frequency.exponentialRampToValueAtTime(freq, t + duration * 0.5);
        } else {
            o.frequency.setValueAtTime(freq, t);
        }
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol || 0.3, t + atk);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        o.start(t);
        o.stop(t + dec + 0.05);
    }

    function noise(duration, vol, type) {
        if (!enabled) return;
        const c = resume(); if (!c) return;
        const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        const src = c.createBufferSource();
        const g = c.createGain();
        const filt = c.createBiquadFilter();
        filt.type = type || 'bandpass';
        filt.frequency.value = 800;
        src.buffer = buf;
        src.connect(filt); filt.connect(g); g.connect(c.destination);
        const t = c.currentTime;
        g.gain.setValueAtTime(vol || 0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.start(t); src.stop(t + duration + 0.05);
    }

    const SOUNDS = {
        jump()         { tone(260, 'sine', 0.18, 0.28, 180, 0.01, 0.16); tone(520, 'sine', 0.12, 0.12, 400, 0.01, 0.1); },
        slide()        { tone(140, 'sawtooth', 0.2, 0.2, 300, 0.01, 0.18); noise(0.15, 0.08); },
        gemBlue()      { tone(660, 'sine', 0.25, 0.25, 440, 0.01, 0.22); tone(880, 'sine', 0.15, 0.1, 880, 0.01, 0.12); },
        gemGreen()     { tone(523, 'sine', 0.22, 0.28, 523, 0.01, 0.2); tone(784, 'triangle', 0.12, 0.12, 784, 0.02, 0.1); },
        gemRed()       { tone(392, 'triangle', 0.2, 0.3, 500, 0.01, 0.18); tone(784, 'sine', 0.1, 0.12, 784, 0.02, 0.08); },
        boost()        { tone(330, 'sawtooth', 0.3, 0.3, 220, 0.02, 0.28); tone(660, 'sine', 0.15, 0.15, 440, 0.02, 0.12); tone(990, 'sine', 0.08, 0.08, 660, 0.03, 0.1); },
        hit()          { noise(0.25, 0.35, 'lowpass'); tone(80, 'sawtooth', 0.2, 0.25, 200, 0.01, 0.18); },
        lifeLost()     { tone(300, 'sawtooth', 0.35, 0.3, 500, 0.02, 0.32); tone(150, 'sine', 0.25, 0.22, 300, 0.05, 0.3); },
        gameOver()     { [400,300,200,120].forEach((f,i) => { setTimeout(() => tone(f, 'sawtooth', 0.4, 0.28, f+100, 0.02, 0.35), i*200); }); },
        artifactCatch(){ [523,659,784,1047].forEach((f,i) => { setTimeout(() => tone(f, 'sine', 0.3, 0.3, f, 0.01, 0.25), i*80); }); },
        rune()         { tone(880, 'sine', 0.4, 0.35, 440, 0.02, 0.38); tone(1320, 'sine', 0.25, 0.2, 880, 0.03, 0.3); },
        qrReveal()     { [523,659,784,1047,1319].forEach((f,i) => { setTimeout(() => tone(f, 'sine', 0.5, 0.25, f, 0.01, 0.45), i*100); }); },
        introSweep()   { tone(220, 'sine', 1.5, 0.2, 110, 0.1, 1.4); tone(440, 'sine', 1.0, 0.1, 220, 0.2, 0.9); },
        keyClick()     { noise(0.04, 0.15, 'highpass'); tone(800, 'square', 0.04, 0.08, 800, 0.005, 0.035); },
        accessGranted(){ [262,330,392,523,659,784].forEach((f,i) => { setTimeout(() => tone(f, 'sine', 0.5, 0.28, f, 0.01, 0.45), i*100); }); }
    };

    /* ── Background music — gentle procedural ambient loop ── */
    function startBgMusic() {
        const c = resume(); if (!c || bgNode) return;
        const masterGain = c.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(c.destination);
        bgGain = masterGain;

        // Fade in over 3s
        const t = c.currentTime;
        masterGain.gain.linearRampToValueAtTime(0.12, t + 3);

        // Create ambient drone layers
        function drone(freq, type, vol) {
            const o = c.createOscillator();
            const g = c.createGain();
            const lfo = c.createOscillator();
            const lfoG = c.createGain();
            lfo.frequency.value = 0.3 + Math.random() * 0.4;
            lfo.connect(lfoG); lfoG.gain.value = 0.015;
            lfoG.connect(g.gain);
            o.type = type; o.frequency.value = freq;
            o.connect(g); g.gain.value = vol;
            g.connect(masterGain);
            lfo.start(); o.start();
            return { o, lfo };
        }
        // Mystical drone chord
        const nodes = [
            drone(55, 'sine', 0.5),
            drone(110, 'sine', 0.3),
            drone(165, 'triangle', 0.2),
            drone(220, 'sine', 0.15),
            drone(82.4, 'sine', 0.25),
        ];

        // Occasional melodic shimmer
        const shimmerNotes = [220,277,330,440,554,659,880];
        function shimmer() {
            if (!bgGain) return;
            const f = shimmerNotes[Math.floor(Math.random()*shimmerNotes.length)];
            const o = c.createOscillator(); const g = c.createGain();
            o.type = 'sine'; o.frequency.value = f;
            o.connect(g); g.connect(masterGain);
            const now = c.currentTime;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.06, now + 0.3);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
            o.start(now); o.stop(now + 2.6);
            setTimeout(shimmer, 1500 + Math.random()*3000);
        }
        setTimeout(shimmer, 2000);
        bgNode = nodes;
    }

    function stopBgMusic(fadeDur) {
        if (!bgGain) return;
        const c = getCtx(); if (!c) return;
        const dur = fadeDur || 1000;
        bgGain.gain.linearRampToValueAtTime(0, c.currentTime + dur/1000);
        setTimeout(() => {
            if (bgNode) { bgNode.forEach(n => { try{n.o.stop();n.lfo.stop();}catch(e){} }); bgNode = null; }
            bgGain = null;
        }, dur + 100);
    }

    return {
        enabled: true,
        play(id) {
            if (!this.enabled) return;
            if (SOUNDS[id]) try { SOUNDS[id](); } catch(e) {}
        },
        startBgMusic,
        stopBgMusic,
        init() { /* called on first user gesture */ resume(); },
        setEnabled(v) { this.enabled = v; if (!v) stopBgMusic(500); else if (!bgNode) startBgMusic(); }
    };
})();

window.SoundManager = SoundManager;

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LOADING BAR & TIPS                                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Update loading bar percentage.
 * @param {number} percent 
 */
function updateLoadingBar(percent) {
    const bar = getEl('loadingBar');
    const txt = getEl('loadingPercent');
    const tip = getEl('loadingTip');

    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.textContent = `${Math.floor(percent)}%`;

    if (tip && percent < 20) {
        tip.textContent = getRandomLoadingTip();
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  BACKGROUND MAGIC PARTICLES                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Create floating magic particles in the background.
 */
function createMagicBackground() {
    const container = getEl('magicParticles');
    if (!container) return;

    const colors = ['#0ff', '#0f8', '#f0f', '#ff0', '#0af'];

    for (let i = 0; i < QUALITY.bgParticles; i++) {
        setTimeout(() => {
            const p = document.createElement('div');
            p.className = 'magic-particle';
            p.style.left = `${Math.random() * 100}%`;

            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.background = `radial-gradient(circle, ${color}, transparent)`;

            const size = 3 + Math.random() * 5;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.setProperty('--tx', `${(Math.random() - 0.5) * 220}px`);
            p.style.animationDuration = `${10 + Math.random() * 15}s`;
            p.style.animationDelay = `${Math.random() * 10}s`;

            container.appendChild(p);
        }, i * 80);
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  SHOOTING STARS                                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Spawn a single shooting star in DOM layer.
 */
function spawnShootingStar() {
    const container = getEl('shootingStars');
    if (!container) return;

    const star = document.createElement('div');
    star.className = 'shooting-star';

    const startX = Math.random() * window.innerWidth * 0.6;
    const startY = Math.random() * window.innerHeight * 0.4;

    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;

    container.appendChild(star);
    setTimeout(() => star.remove(), 1500);
}

/**
 * Periodically spawn shooting stars.
 */
function startShootingStarsLoop() {
    if (!getEl('shootingStars')) return;

    lastShootingStarTime = performance.now();

    const loop = () => {
        if (!gameRunning) {
            requestAnimationFrame(loop);
            return;
        }

        const now = performance.now();
        if (now - lastShootingStarTime > QUALITY.shootingStarInterval) {
            spawnShootingStar();
            lastShootingStarTime = now;
        }

        requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GEM & RUNE POPUPS                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Show a generic gem popup (+score and emoji).
 * @param {number} screenX 
 * @param {number} screenY 
 * @param {number} value 
 * @param {string} emoji 
 */
function showGemPopup(screenX, screenY, value, emoji = '💎') {
    const popup = document.createElement('div');
    popup.className = 'gem-collect-popup';
    popup.innerHTML = `+${value} ${emoji}`;
    popup.style.left = `${screenX - 50}px`;
    popup.style.top = `${screenY - 50}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

/**
 * Convenience wrappers for specific gem colors.
 */
function showGreenGemPopup(x, y, value = 100) {
    const popup = document.createElement('div');
    popup.className = 'gem-collect-popup gem-popup-green';
    popup.innerHTML = `+${value} 💚`;
    popup.style.left = `${x - 50}px`;
    popup.style.top = `${y - 50}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

function showRedGemPopup(x, y, value = 200) {
    const popup = document.createElement('div');
    popup.className = 'gem-collect-popup gem-popup-red';
    popup.innerHTML = `+${value} ❤️`;
    popup.style.left = `${x - 50}px`;
    popup.style.top = `${y - 50}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

/**
 * Show rune collected popup.
 */
function showRunePopup(x, y) {
    const popup = document.createElement('div');
    popup.className = 'gem-collect-popup gem-popup-gold';
    popup.innerHTML = '★ RUNE! ★';
    popup.style.left = `${x - 60}px`;
    popup.style.top = `${y - 50}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  BOOST POPUP                                                              ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Show center-screen boost popup.
 * @param {string} label 
 */
function showBoostPopup(label, icon = '✨') {
    const popup = getEl('boostPopup');
    const iconEl = getEl('boostPopupIcon');
    const textEl = getEl('boostPopupText');

    if (!popup || !iconEl || !textEl) return;

    iconEl.textContent = icon;
    textEl.textContent = label;

    popup.classList.remove('hidden');
    popup.classList.remove('hiding');

    setTimeout(() => {
        popup.classList.add('hiding');
        setTimeout(() => popup.classList.add('hidden'), 300);
    }, 4000);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  SPARKLES & 3D PARTICLES                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Create DOM sparkles from a screen position.
 * @param {number} x 
 * @param {number} y 
 * @param {string} color 
 */
function createSparkleEffect(x, y, color) {
    const container = document.createElement('div');
    container.className = 'sparkle-container';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;

    for (let i = 0; i < 12; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.style.background = `radial-gradient(circle, #fff, ${color || '#0f8'})`;
        const angle = (i / 12) * Math.PI * 2;
        const dist = 50 + Math.random() * 40;
        s.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
        s.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
        container.appendChild(s);
    }

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 1000);
}

/**
 * Create 3D particle burst at a world position.
 * @param {THREE.Vector3} position 
 * @param {number} color 
 * @param {number} count 
 */
function createParticleEffect(position, color, count) {
    if (!scene) return;

    const actual = Math.min(count, QUALITY.particleCount);
    const geo = new THREE.SphereGeometry(0.08, 6, 6);

    for (let i = 0; i < actual; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        p.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.4 + 0.15,
                (Math.random() - 0.5) * 0.4
            ),
            life: 1
        };
        scene.add(p);
        particles.push(p);
    }
}

/**
 * Create small glowing trail behind player.
 */
function createMagicTrail() {
    if (!gameRunning || gamePaused || !player) return;
    if (magicTrails.length >= QUALITY.maxTrails) return;

    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.75
    });
    const t = new THREE.Mesh(geo, mat);
    t.position.set(
        player.position.x + (Math.random() - 0.5) * 0.4,
        player.position.y + 0.8 + Math.random() * 1.2,
        player.position.z - 0.4
    );
    t.userData = { life: 1 };
    scene.add(t);
    magicTrails.push(t);
}

/**
 * Create expanding ring burst for high-value events.
 * @param {THREE.Vector3} pos 
 * @param {number} [color] 
 */
function createGemBurst(pos, color = 0x00ff88) {
    if (!scene) return;

    const geo = new THREE.RingGeometry(0.3, 0.5, 16);
    const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.lookAt(camera.position);
    ring.userData = { life: 1, scale: 1 };
    scene.add(ring);
    gemBursts.push(ring);
}

/**
 * Update all 3D particles & effects.
 */
function updateParticles() {
    // Simple spheres - update every frame for smooth animation
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.velocity);
        p.userData.velocity.y -= 0.012;
        p.userData.life -= 0.05;
        p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    // Trails
    for (let i = magicTrails.length - 1; i >= 0; i--) {
        const t = magicTrails[i];
        t.userData.life -= 0.07;
        t.material.opacity = t.userData.life * 0.75;
        t.scale.multiplyScalar(0.93);
        if (t.userData.life <= 0) {
            scene.remove(t);
            magicTrails.splice(i, 1);
        }
    }

    // Ring bursts
    for (let i = gemBursts.length - 1; i >= 0; i--) {
        const r = gemBursts[i];
        r.userData.life -= 0.06;
        r.userData.scale += 0.15;
        r.scale.setScalar(r.userData.scale);
        r.material.opacity = r.userData.life * 0.8;
        if (r.userData.life <= 0) {
            scene.remove(r);
            gemBursts.splice(i, 1);
        }
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  HUD UI UPDATE HELPERS                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Update gem counters on left panel.
 */
function updateGemCounterUI() {
    setText('redGemCount', redGemsCollected.toString());
    setText('greenGemCount', greenGemsCollected.toString());
    setText('blueGemCount', blueGemsCollected.toString());
}

/* ====== BEGIN REPLACE: updateHeartProgressUI (all 4 bars must fill) ====== */
/**
 * ✅ FIX: Update heart progress bars (Red, Green, Blue, Yellow).
 * All 4 bars must reach maxHearts (20) to complete level.
 */
/**
 * ✅ FIX: Update heart progress bars.
 * Yellow bar: Max is LETTERS_REQUIRED (4 per level), not 20.
 * Other bars: Max is 20.
 */
/**
 * ✅ FIX: Update heart progress bars.
 * Yellow = current level runes (4 per level)
 * Red/Green/Blue = gems collected (use admin config requirements)
 * 
 * All 4 bars must fill to trigger story event.
 */
function updateHeartProgressUI() {
    // Get requirements from current level configuration
    const currentLevelConfig = LEVELS[currentLevel] || LEVELS[0];
    const redMax = currentLevelConfig?.redRequired || 20;
    const greenMax = currentLevelConfig?.greenRequired || 20;
    const blueMax = currentLevelConfig?.blueRequired || 20;
    const runesMax = LETTERS_REQUIRED || 4;

    const setBar = (barId, textId, val, max) => {
        const barEl = getEl(barId);
        const txtEl = getEl(textId);
        const clamped = Math.min(val, max);
        const pct = (clamped / max) * 100;
        if (barEl) barEl.style.width = `${pct}%`;
        if (txtEl) txtEl.textContent = `${clamped}/${max}`;
    };

    // Red, Green, Blue = gems (use config requirements)
    setBar('heartBarRed', 'heartTextRed', redGemsCollected, redMax);
    setBar('heartBarGreen', 'heartTextGreen', greenGemsCollected, greenMax);
    setBar('heartBarBlue', 'heartTextBlue', blueGemsCollected, blueMax);

    // Yellow = current level runes (max 4)
    const currentLevelRunes = collectedLetters.filter(Boolean).length;
    setBar('heartBarYellow', 'heartTextYellow', currentLevelRunes, runesMax);
}

/**
 * ✅ NEW: Reset heart progress bars for new level.
 * Called when continuing to next level.
 */
function resetHeartProgressForNewLevel() {
    // Reset gem counters
    redGemsCollected = 0;
    greenGemsCollected = 0;
    blueGemsCollected = 0;
    // Note: totalRunesCollected is cumulative across all levels

    // Update UI
    updateHeartProgressUI();
    updateGemCounterUI();

    console.log('✅ Heart progress reset for new level');
}

/**
 * ✅ FIX: Check if all 4 heart bars are filled.
 * Yellow runes: Only need LETTERS_REQUIRED (4) per level, not 20.
 * Other gems: Use requirements from current level config (admin panel).
 */
function areAllHeartBarsFilled() {
    // Get requirements from current level configuration (currentLevel is 0-indexed)
    const currentLevelConfig = LEVELS[currentLevel] || LEVELS[0];
    const redRequired = currentLevelConfig?.redRequired || 20;
    const greenRequired = currentLevelConfig?.greenRequired || 20;
    const blueRequired = currentLevelConfig?.blueRequired || 20;
    const runesNeededPerLevel = LETTERS_REQUIRED || 4;

    console.log(`🔍 Checking heart bars for Level ${currentLevel}:`, {
        redCollected: redGemsCollected,
        redRequired,
        greenCollected: greenGemsCollected,
        greenRequired,
        blueCollected: blueGemsCollected,
        blueRequired,
        runesCollected: collectedLetters.filter(Boolean).length,
        runesRequired: runesNeededPerLevel
    });

    // Yellow bar: Check if current level runes collected (4 per level)
    const yellowFilled = collectedLetters.filter(Boolean).length >= runesNeededPerLevel;

    // Other bars: Check if gems reach configured requirements
    const redFilled = redGemsCollected >= redRequired;
    const greenFilled = greenGemsCollected >= greenRequired;
    const blueFilled = blueGemsCollected >= blueRequired;

    const allFilled = yellowFilled && redFilled && greenFilled && blueFilled;
    
    console.log(`✅ Heart bars status:`, {
        yellowFilled,
        redFilled,
        greenFilled,
        blueFilled,
        allFilled
    });

    return allFilled;
}

// Expose for use in main.js
window.areAllHeartBarsFilled = areAllHeartBarsFilled;
window.resetHeartProgressForNewLevel = resetHeartProgressForNewLevel;
/* ====== END REPLACE: updateHeartProgressUI (all 4 bars must fill) ====== */

/**
 * Update lives hearts UI.
 */
function updateLivesUI() {
    for (let i = 1; i <= LIVES_CONFIG.MAX_LIVES; i++) {
        const heart = getEl(`life${i}`);
        if (!heart) continue;
        if (i <= currentLives) {
            heart.classList.add('active');
            heart.classList.remove('lost');
        } else {
            heart.classList.remove('active');
            heart.classList.add('lost');
        }
    }
    setText('livesCount', currentLives.toString());
}

/**
 * Update speed indicator (bottom).
 */
function updateSpeedIndicatorUI() {
    const speedEl = getEl('speedValue');
    if (!speedEl) return;

    const speedMultiplier = (gameSpeed / DIFFICULTY.BASE_SPEED).toFixed(1);
    speedEl.textContent = `${speedMultiplier}x`;
}

/**
 * Update level progress bar and story panel text.
 */
function updateLevelProgressUI() {
    const levelEl = getEl('currentLevel');
    const fillEl = getEl('levelProgressFill');
    const storyEl = getEl('storyPanel');

    if (levelEl) levelEl.textContent = (currentLevel + 1).toString();

    const filled = collectedLetters.filter(l => l).length;
    if (fillEl) fillEl.style.width = `${(filled / LETTERS_REQUIRED) * 100}%`;

    if (!storyObjectActive && !waitingForClearPath && storyEl) {
        const lvlCfg = getLevelConfig(currentLevel);
        storyEl.textContent = `${lvlCfg.icon} Collect ${filled}/${LETTERS_REQUIRED} runes`;
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  BOOST ACTIVATION / DEACTIVATION                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Activate a boost by ID ('speed' | 'shield' | 'magnet' | 'double').
 * Handles timer + UI.
 * @param {string} boostId 
 */
function activateBoost(boostId) {
    const id = boostId.toLowerCase();
    const config = Object.values(BOOSTS).find(b => b.id === id);
    if (!config) return;

    const now = Date.now();
    const state = activeBoosts[id];
    if (!state) return;

    // If already active, extend duration
    state.active = true;
    state.endTime = now + config.duration;

    // Clear old timer
    if (state.timer) clearTimeout(state.timer);

    // Setup timer to deactivate
    state.timer = setTimeout(() => deactivateBoost(id), config.duration);

    // UI feedback
    updateBoostUI(id, true, config);

    // Additional logic for speed
    if (id === 'speed') {
        gameSpeed = Math.min(gameSpeed * config.multiplier, DIFFICULTY.MAX_SPEED * 1.2);
    }
}

/**
 * Deactivate a boost.
 * @param {string} boostId 
 */
function deactivateBoost(boostId) {
    const id = boostId.toLowerCase();
    const state = activeBoosts[id];
    if (!state || !state.active) return;

    state.active = false;
    state.endTime = 0;
    if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
    }

    updateBoostUI(id, false);

    if (id === 'speed') {
        gameSpeed = Math.min(gameSpeed, DIFFICULTY.MAX_SPEED);
    }
}

/**
 * Update active boosts panel UI.
 * @param {string} id 
 * @param {boolean} active 
 * @param {object} [config] 
 */
function updateBoostUI(id, active, config) {
    const panel = getEl('activeBoostsPanel');
    if (!panel) return;

    const boostEl = getEl(`boost${capitalize(id)}`);
    if (!boostEl) return;

    if (active) {
        showEl(panel);
        showEl(boostEl);
        // Timer bar handled in main loop by reading activeBoosts[*].endTime
    } else {
        hideEl(boostEl);
        // Hide panel if no boosts active
        const anyActive = Object.values(activeBoosts).some(b => b.active);
        if (!anyActive) hideEl(panel);
    }
}

/**
 * Update boost timer bars each frame.
 */
function updateBoostTimersUI() {
    const now = Date.now();

    Object.keys(activeBoosts).forEach(id => {
        const boost = activeBoosts[id];
        const cfg = Object.values(BOOSTS).find(b => b.id === id);
        const el = getEl(`boost${capitalize(id)}Timer`);
        if (!boost || !cfg || !el) return;

        if (!boost.active) {
            el.style.setProperty('--timer-pct', '0%');
            return;
        }

        const remaining = Math.max(0, boost.endTime - now);
        const pct = Math.max(0, Math.min(100, (remaining / cfg.duration) * 100));

        // vertical fill uses height percentage
        el.style.setProperty('--timer-pct', `${pct}%`);
    });
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  UTILITY: CAPITALIZE STRING                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Capitalize first letter of string.
 * @param {string} str 
 * @returns {string}
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


console.log('✅ 07-effects.js loaded');
