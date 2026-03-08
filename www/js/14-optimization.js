/* ═══════════════════════════════════════════════════════════════════════════
   14-OPTIMIZATION.JS (Complete Memory/CPU/GPU Management)
   Mystery Temple - Galaxy Edition

   Mobile-optimized version with FPS monitoring, adaptive quality,
   object pooling, and touch optimizations.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE DEVICE DETECTION & FPS TRACKING
   ══════════════════════════════════════════════════════════════════════════ */

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 768);

// FPS tracking system
const FPSTracker = {
    frames: [],
    lastTime: performance.now(),
    currentFPS: 60,
    targetFPS: 60,
    
    update: function() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        this.frames.push(delta);
        if (this.frames.length > 60) this.frames.shift();
        
        if (this.frames.length >= 30) {
            const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
            this.currentFPS = Math.round(1000 / avgDelta);
        }
        
        return this.currentFPS;
    },
    
    getAverageFPS: function() {
        return this.currentFPS;
    }
};

// Adaptive quality system
const AdaptiveQuality = {
    qualityLevel: 1,
    lowFPSCount: 0,
    highFPSCount: 0,
    
    update: function(fps) {
        if (fps < 30) {
            this.lowFPSCount++;
            this.highFPSCount = 0;
            
            if (this.lowFPSCount >= 10 && this.qualityLevel > 0.4) {
                this.qualityLevel = Math.max(0.4, this.qualityLevel - 0.1);
                this.applyQualitySettings();
                this.lowFPSCount = 0;
                console.log('⚡ Quality reduced to:', this.qualityLevel);
            }
        } else if (fps > 55) {
            this.highFPSCount++;
            this.lowFPSCount = 0;
            
            if (this.highFPSCount >= 20 && this.qualityLevel < 1) {
                this.qualityLevel = Math.min(1, this.qualityLevel + 0.05);
                this.applyQualitySettings();
                this.highFPSCount = 0;
            }
        }
    },
    
    applyQualitySettings: function() {
        if (typeof QUALITY !== 'undefined') {
            const q = this.qualityLevel;
            QUALITY.particleCount = Math.floor(20 * q);
            QUALITY.maxTrails = Math.floor(20 * q);
            QUALITY.bgParticles = Math.floor(20 * q);
            QUALITY.shootingStarInterval = Math.floor(5000 / q);
        }
        
        if (typeof renderer !== 'undefined' && renderer) {
            const pr = Math.max(1, renderer.getPixelRatio() * this.qualityLevel);
            renderer.setPixelRatio(Math.min(pr, 1.5));
        }
    }
};

/* ══════════════════════════════════════════════════════════════════════════
   ULTRA LOW-END DEVICE DETECTION & ADAPTIVE QUALITY
   ══════════════════════════════════════════════════════════════════════════ */
(function applyUltraLowEndFixes() {
    const ua = navigator.userAgent;
    const mem = navigator.deviceMemory || 4;
    const cpu = navigator.hardwareConcurrency || 4;
    const w = window.innerWidth;

    const isUltraLow = mem <= 1 || cpu <= 2 || (w < 400 && /Android/i.test(ua));
    const isLow = !isUltraLow && (mem <= 2 || cpu <= 4 || /Android|iPhone|iPad|iPod/i.test(ua));

    console.log('📱 Device detected:', { isMobile, isLow, isUltraLow, mem, cpu, w });

    if (!isUltraLow && !isLow) return;

    console.log(isUltraLow ? '⚡ ULTRA low-end mode' : '⚡ Low-end mode', { mem, cpu, w });

    const applyQ = () => {
        if (typeof QUALITY === 'undefined') { setTimeout(applyQ, 100); return; }
        if (isUltraLow) {
            QUALITY.particleCount = 10;
            QUALITY.maxObstacles = 5;
            QUALITY.maxGems = 4;
            QUALITY.maxTrails = 12;
            QUALITY.bgParticles = 12;
            QUALITY.maxGreenGems = 2;
            QUALITY.maxRedGems = 1;
            QUALITY.maxBoosts = 1;
            QUALITY.shootingStarInterval = 12000;
        } else {
            QUALITY.particleCount = 12;
            QUALITY.maxObstacles = 6;
            QUALITY.maxGems = 5;
            QUALITY.maxTrails = 15;
            QUALITY.bgParticles = 15;
            QUALITY.maxGreenGems = 2;
            QUALITY.maxRedGems = 2;
            QUALITY.maxBoosts = 1;
            QUALITY.shootingStarInterval = 8000;
        }
        console.log('✅ QUALITY applied:', QUALITY);
    };
    applyQ();

    if (isUltraLow) {
        window.__FORCE_NO_ANTIALIAS__ = true;
        window.__PIXEL_RATIO_MAX__ = 1;
    } else {
        window.__PIXEL_RATIO_MAX__ = 1.5;
    }

    if (isUltraLow) {
        const style = document.createElement('style');
        style.textContent = `
            .gem-pickup-popup { filter: none !important; }
            .boost-pickup-popup { filter: none !important; }
            canvas { image-rendering: pixelated; }
        `;
        document.head.appendChild(style);
    }
})();


/* ══════════════════════════════════════════════════════════════════════════
   OBJECT POOLING SYSTEM
   ══════════════════════════════════════════════════════════════════════════ */
const ObjectPool = {
    pools: {},
    
    getPool: function(name, createFn, initialSize) {
        if (!this.pools[name]) {
            this.pools[name] = {
                available: [],
                inUse: [],
                createFn: createFn
            };
            
            for (let i = 0; i < initialSize; i++) {
                this.pools[name].available.push(createFn());
            }
        }
        return this.pools[name];
    },
    
    acquire: function(name) {
        const pool = this.pools[name];
        if (!pool) return null;
        
        let obj;
        if (pool.available.length > 0) {
            obj = pool.available.pop();
        } else {
            obj = pool.createFn();
        }
        pool.inUse.push(obj);
        return obj;
    },
    
    release: function(name, obj) {
        const pool = this.pools[name];
        if (!pool) return;
        
        const idx = pool.inUse.indexOf(obj);
        if (idx > -1) {
            pool.inUse.splice(idx, 1);
            pool.available.push(obj);
        }
    },
    
    cleanup: function(name) {
        const pool = this.pools[name];
        if (!pool) return;
        
        while (pool.inUse.length > 0) {
            pool.available.push(pool.inUse.pop());
        }
    }
};

(function initParticlePool() {
    if (!isMobile) return;
    
    window.__PARTICLE_POOL__ = ObjectPool.getPool('particles', function() {
        const geo = new THREE.SphereGeometry(0.08, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        return new THREE.Mesh(geo, mat);
    }, 30);
})();


/* ══════════════════════════════════════════════════════════════════════════
   initOptimizations FUNCTION
   ══════════════════════════════════════════════════════════════════════════ */
function initOptimizations() {
    console.log('✅ initOptimizations called');

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
    
    if (isMobile) {
        initMobileOptimizations();
    }
}

function initMobileOptimizations() {
    console.log('📱 Applying mobile optimizations...');
    
    document.addEventListener('touchmove', function(e) {
        if (e.target.tagName === 'CANVAS') {
            e.preventDefault();
        }
    }, { passive: false });
    
    if (window.GameTouchHandler) {
        GameTouchHandler.throttle = true;
        GameTouchHandler.throttleDelay = 16;
    }
    
    const style = document.createElement('style');
    style.textContent = `
        canvas {
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
        .hud-panel, .stats-panel {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
        }
        @media (max-width: 768px) {
            .gem-pickup-popup, .boost-pickup-popup {
                animation-duration: 0.3s !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    setInterval(function() {
        if (!gameRunning || gamePaused) return;
        
        if (window.gc) window.gc();
        
        if (window.__PARTICLE_POOL__) {
            ObjectPool.cleanup('particles');
        }
        
    }, 30000);
    
    console.log('✅ Mobile optimizations applied');
}


/* ══════════════════════════════════════════════════════════════════════════
   ADVANCED OPTIMIZATIONS
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
    const isLowEnd = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                     window.innerWidth < 768 ||
                     (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
                     (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    if (!isLowEnd && !isMobile) {
        console.log('✅ High-end device detected');
        return;
    }

    console.log('⚡ Low-end/mobile optimization active');

    const cleanupInterval = isMobile ? 10000 : 15000;
    
    setInterval(() => {
        if (!gameRunning) return;

        const particleLimit = isMobile ? 20 : 35;
        if (typeof particles !== 'undefined' && particles.length > particleLimit) {
            const removeCount = isMobile ? 15 : 10;
            const toRemove = particles.splice(removeCount, particles.length - removeCount);
            toRemove.forEach(p => {
                if (scene && p) scene.remove(p);
            });
        }

        const trailLimit = isMobile ? 15 : 25;
        if (typeof magicTrails !== 'undefined' && magicTrails.length > trailLimit) {
            const removeCount = isMobile ? 10 : 5;
            const toRemove = magicTrails.splice(removeCount, magicTrails.length - removeCount);
            toRemove.forEach(t => {
                if (scene && t) scene.remove(t);
            });
        }

        const burstLimit = isMobile ? 8 : 12;
        if (typeof gemBursts !== 'undefined' && gemBursts.length > burstLimit) {
            const removeCount = isMobile ? 5 : 4;
            const toRemove = gemBursts.splice(removeCount, gemBursts.length - removeCount);
            toRemove.forEach(b => {
                if (scene && b) scene.remove(b);
            });
        }
    }, cleanupInterval);

    if (typeof QUALITY !== 'undefined') {
        const reduction = isMobile ? 0.7 : 0.85;
        QUALITY.particleCount = Math.max(8, Math.floor(QUALITY.particleCount * reduction));
        QUALITY.maxTrails = Math.max(8, Math.floor(QUALITY.maxTrails * reduction));
        QUALITY.bgParticles = Math.max(8, Math.floor(QUALITY.bgParticles * reduction));
        QUALITY.maxGems = Math.min(QUALITY.maxGems, isMobile ? 4 : 6);
        QUALITY.maxObstacles = Math.min(QUALITY.maxObstacles, isMobile ? 4 : 6);
        QUALITY.maxGreenGems = Math.min(QUALITY.maxGreenGems, 2);
        QUALITY.maxRedGems = Math.min(QUALITY.maxRedGems, 1);
        QUALITY.maxBoosts = 1;
        QUALITY.shootingStarInterval = isMobile ? 10000 : 6000;

        console.log('✅ QUALITY adjusted:', QUALITY);
    }

    const waitForRenderer = setInterval(() => {
        if (typeof renderer !== 'undefined' && renderer) {
            clearInterval(waitForRenderer);

            const maxPR = isMobile ? 1 : (window.__PIXEL_RATIO_MAX__ || 1.5);
            const currentPR = renderer.getPixelRatio();
            renderer.setPixelRatio(Math.min(currentPR, maxPR));

            if (renderer.shadowMap) {
                renderer.shadowMap.enabled = false;
            }

            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1;

            console.log('✅ Renderer optimized (pixel ratio:', renderer.getPixelRatio() + ')');
        }
    }, 100);

    const style = document.createElement('style');
    style.textContent = `
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
        .loading-screen, .pause-overlay, .game-overlay {
            transform: translateZ(0);
            will-change: opacity;
        }
        .hud-panel, .stats-panel, .lives-panel, .level-panel {
            contain: layout style;
        }
        @media (max-width: 768px) {
            .particle {
                transform: translateZ(0);
            }
        }
    `;
    document.head.appendChild(style);

    console.log('✅ All optimizations applied');
})();


/* ══════════════════════════════════════════════════════════════════════════
   GAME LOOP OPTIMIZATION
   ══════════════════════════════════════════════════════════════════════════ */
(function optimizeGameLoop() {
    const originalAnimate = window.animate;
    
    window.animate = function() {
        const fps = FPSTracker.update();
        
        if (isMobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            AdaptiveQuality.update(fps);
        }
        
        if (typeof originalAnimate === 'function') {
            originalAnimate.apply(this, arguments);
        }
    };
    
    window.FPSTracker = FPSTracker;
    window.AdaptiveQuality = AdaptiveQuality;
})();


window.initOptimizations = initOptimizations;
window.isMobile = isMobile;
