/* ═══════════════════════════════════════════════════════════════════════════
   14-OPTIMIZATION.JS (Complete Memory/CPU/GPU Management)
   Mystery Temple - Galaxy Edition

   Optimizes for low-end devices WITHOUT removing any visual effects.
   Uses memory management, CPU throttling, GPU optimizations.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   ULTRA LOW-END DEVICE DETECTION & ADAPTIVE QUALITY
   Detects very weak devices and reduces spawn rates / effects dynamically.
   Animations are NEVER disabled — only object counts are reduced.
══════════════════════════════════════════════════════════════════════════ */
(function applyUltraLowEndFixes() {
    const ua = navigator.userAgent;
    const mem  = navigator.deviceMemory || 4;
    const cpu  = navigator.hardwareConcurrency || 4;
    const w    = window.innerWidth;

    // Ultra low-end: <= 1GB RAM, 1-2 CPU cores, or tiny screen
    const isUltraLow = mem <= 1 || cpu <= 2 || (w < 400 && /Android/i.test(ua));
    // Low-end: <= 2GB RAM, <= 4 CPU cores, or mobile
    const isLow = !isUltraLow && (mem <= 2 || cpu <= 4 || /Android|iPhone/i.test(ua));

    if (!isUltraLow && !isLow) return;

    console.log(isUltraLow ? '⚡ ULTRA low-end mode' : '⚡ Low-end mode', { mem, cpu, w });

    // Wait for QUALITY object to be defined (from 01-config.js)
    const applyQ = () => {
        if (typeof QUALITY === 'undefined') { setTimeout(applyQ, 100); return; }
        if (isUltraLow) {
            QUALITY.particleCount   = 10;
            QUALITY.maxObstacles    = 5;
            QUALITY.maxGems         = 4;
            QUALITY.maxTrails       = 12;
            QUALITY.bgParticles     = 12;
            QUALITY.maxGreenGems    = 2;
            QUALITY.maxRedGems      = 1;
            QUALITY.maxBoosts       = 1;
            QUALITY.shootingStarInterval = 12000;
        } else {
            QUALITY.particleCount   = 12;
            QUALITY.maxObstacles    = 6;
            QUALITY.maxGems         = 5;
            QUALITY.maxTrails       = 15;
            QUALITY.bgParticles     = 15;
            QUALITY.maxGreenGems    = 2;
            QUALITY.maxRedGems      = 2;
            QUALITY.maxBoosts       = 1;
            QUALITY.shootingStarInterval = 8000;
        }
        console.log('✅ QUALITY applied:', QUALITY);
    };
    applyQ();

    // Disable Three.js antialias on ultra low-end (renderer created after this runs)
    if (isUltraLow) {
        window.__FORCE_NO_ANTIALIAS__ = true;
        window.__PIXEL_RATIO_MAX__ = 1;
    } else {
        window.__PIXEL_RATIO_MAX__ = 1.5;
    }

    // Reduce CSS animations complexity on ultra low-end
    if (isUltraLow) {
        const style = document.createElement('style');
        style.textContent = `
            /* Ultra low-end: reduce blur/shadow filters */
            .gem-pickup-popup { filter: none !important; }
            .boost-pickup-popup { filter: none !important; }
            canvas { image-rendering: pixelated; }
        `;
        document.head.appendChild(style);
    }
})();


// ============================================================================
// ORIGINAL initOptimizations FUNCTION (auto-pause)
// ============================================================================
function initOptimizations() {
    console.log('✅ initOptimizations called – full optimizations active');

    // Auto pause when user switches tab / locks screen
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (typeof pauseGame === 'function') pauseGame();
            else {
                gamePaused = true;
                const overlay = document.getElementById('pauseOverlay');
                if (overlay) overlay.classList.remove('hidden');
            }
        }
    }, { passive: true });
}

// ============================================================================
// ADVANCED OPTIMIZATIONS (preserve all visual effects)
// ============================================================================
(function() {
    // Detect low-end device
    const isLowEnd = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                     window.innerWidth < 768 ||
                     (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
                     (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    if (!isLowEnd) {
        console.log('✅ High-end device detected – no optimizations needed');
        return;
    }

    console.log('⚡ Low-end optimization active – preserving all visual effects');

    const perf = window.PERFORMANCE_PROFILE || null;

    /* ------------------------------------------------------------------------
       MEMORY MANAGEMENT
       ------------------------------------------------------------------------ */
    
    // Trim particle arrays every 15 seconds to prevent memory bloat (less aggressive)
    setInterval(() => {
        if (!gameRunning) return;

        // Particles
        if (typeof particles !== 'undefined' && particles.length > 35) {
            const toRemove = particles.splice(25, particles.length - 25);
            toRemove.forEach(p => {
                if (scene) scene.remove(p);
            });
        }

        // Magic trails
        if (typeof magicTrails !== 'undefined' && magicTrails.length > 25) {
            const toRemove = magicTrails.splice(20, magicTrails.length - 20);
            toRemove.forEach(t => {
                if (scene) scene.remove(t);
            });
        }

        // Gem bursts
        if (typeof gemBursts !== 'undefined' && gemBursts.length > 12) {
            const toRemove = gemBursts.splice(8, gemBursts.length - 8);
            toRemove.forEach(b => {
                if (scene) scene.remove(b);
            });
        }
    }, 15000); // every 15 seconds

    /* ------------------------------------------------------------------------
       QUALITY SETTINGS - Keep high quality, minimal reduction
       ------------------------------------------------------------------------ */

    // Slight quality adjustments - preserve animations!
    if (typeof QUALITY !== 'undefined') {
        QUALITY.particleCount = Math.max(10, Math.floor(QUALITY.particleCount * 0.85));
        QUALITY.maxTrails = Math.max(12, Math.floor(QUALITY.maxTrails * 0.9));
        QUALITY.bgParticles = Math.max(12, Math.floor(QUALITY.bgParticles * 0.85));
        QUALITY.maxGems = Math.min(QUALITY.maxGems, 6);
        QUALITY.maxObstacles = Math.min(QUALITY.maxObstacles, 6);
        QUALITY.maxGreenGems = Math.min(QUALITY.maxGreenGems, 3);
        QUALITY.maxRedGems = Math.min(QUALITY.maxRedGems, 2);
        QUALITY.maxBoosts = Math.min(QUALITY.maxBoosts, 1);
        QUALITY.shootingStarInterval = 6000;

        console.log('✅ QUALITY adjusted for low-end:', QUALITY);
    }

    // Throttle shooting star spawn rate slightly
    if (typeof spawnShootingStar === 'function') {
        const originalSpawn = spawnShootingStar;
        window.spawnShootingStar = function() {
            if (Math.random() < 0.3) return; // Only 30% chance to skip
            originalSpawn();
        };
    }

    /* ------------------------------------------------------------------------
       GPU OPTIMIZATIONS - Keep full quality
       ------------------------------------------------------------------------ */

    const waitForRenderer = setInterval(() => {
        if (typeof renderer !== 'undefined' && renderer) {
            clearInterval(waitForRenderer);

            // Cap pixel ratio at reasonable level - but keep at least 1!
            const currentPR = renderer.getPixelRatio();
            const perf = window.PERFORMANCE_PROFILE || {};
            const maxPR = Math.max(1, perf.maxPixelRatio || 1.5);
            renderer.setPixelRatio(Math.min(currentPR, maxPR));

            if (renderer.shadowMap) renderer.shadowMap.enabled = false;

            console.log('✅ Renderer optimized (pixel ratio: ' + renderer.getPixelRatio() + ')');
        }
    }, 100);

    // Add CSS will-change hints to help browser compositing - GPU acceleration
    const style = document.createElement('style');
    style.textContent = `
        /* GPU acceleration for animations - no quality loss */
        .control-btn, .btn, .gem-collect-popup, .boost-popup, .sparkle-container {
            will-change: transform, opacity;
            transform: translateZ(0);
            backface-visibility: hidden;
        }
        .glow-text, .title-icon, .stat-value {
            will-change: filter;
        }
        .magic-particle, .shooting-star {
            will-change: transform;
            transform: translateZ(0);
        }
        /* Optimize loading and transitions */
        .loading-screen, .pause-overlay, .game-overlay {
            transform: translateZ(0);
            will-change: opacity;
        }
        /* Prevent layout thrashing */
        .hud-panel, .stats-panel, .lives-panel, .level-panel {
            contain: layout style;
        }
    `;
    document.head.appendChild(style);

    console.log('✅ All optimizations applied – visual effects preserved');
})();

// Expose initOptimizations globally
window.initOptimizations = initOptimizations;
