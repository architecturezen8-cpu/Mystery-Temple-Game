/* ═══════════════════════════════════════════════════════════════════════════
   14-OPTIMIZATION.JS (Complete Memory/CPU/GPU Management)
   Mystery Temple - Galaxy Edition

   FIXED VERSION:
   - Smart pixel ratio (not brutal 1x force)
   - Proper device profiling with GPU detection
   - FPS limiting for battery/thermal management
   - Consolidated device detection (no duplicates)
   - Object pooling & memory management
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  DEVICE PROFILING SYSTEM (Single Source of Truth)                         ║
   ║  GPU, RAM, CPU detect කරලා smart quality decide කරනවා                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const DeviceProfiler = {
    profile: null,
    
    /**
     * Detect and score device capabilities
     * @returns {Object} Complete device profile
     */
    detect: function() {
        if (this.profile) return this.profile;
        
        // Basic detection
        const ua = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
                         window.innerWidth <= 768;
        
        const deviceMemory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;
        const screenPixels = window.innerWidth * window.innerHeight;
        const nativePixelRatio = window.devicePixelRatio || 1;
        
        // GPU detection
        let gpuTier = 'unknown';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                    
                    if (gpu.includes('mali-4') || gpu.includes('adreno 3') || 
                        gpu.includes('adreno 2') || gpu.includes('sgx') ||
                        gpu.includes('vivante') || gpu.includes('videocore')) {
                        gpuTier = 'very-weak';
                    } else if (gpu.includes('mali-t') || gpu.includes('adreno 4') ||
                               gpu.includes('adreno 5') || gpu.includes('mali-g51') ||
                               gpu.includes('powervr')) {
                        gpuTier = 'weak';
                    } else if (gpu.includes('mali-g') || gpu.includes('adreno 6') ||
                               gpu.includes('apple') || gpu.includes('intel')) {
                        gpuTier = 'medium';
                    } else {
                        gpuTier = 'strong';
                    }
                }
                // Cleanup
                const ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
            }
        } catch(e) {}
        
        // Score calculation (0-100)
        let score = 50;
        
        // Memory scoring
        if (deviceMemory <= 1) score -= 25;
        else if (deviceMemory <= 2) score -= 15;
        else if (deviceMemory <= 3) score -= 5;
        else if (deviceMemory >= 6) score += 10;
        else if (deviceMemory >= 8) score += 20;
        
        // CPU scoring
        if (cores <= 2) score -= 20;
        else if (cores <= 4) score -= 5;
        else if (cores >= 6) score += 5;
        else if (cores >= 8) score += 15;
        
        // GPU scoring
        if (gpuTier === 'very-weak') score -= 20;
        else if (gpuTier === 'weak') score -= 10;
        else if (gpuTier === 'medium') score += 5;
        else if (gpuTier === 'strong') score += 15;
        
        // Mobile penalty
        if (isMobile) score -= 10;
        
        // Screen size
        if (screenPixels < 500000) score += 10;
        else if (screenPixels > 2000000) score -= 10;
        
        // Clamp
        score = Math.max(0, Math.min(100, score));
        
        // Determine tier
        let tier;
        if (score <= 20) tier = 'ultra-low';
        else if (score <= 40) tier = 'low';
        else if (score <= 65) tier = 'mid';
        else tier = 'high';
        
        // ═══════════════════════════════════════════════════════════════
        // SMART PIXEL RATIO - THE KEY FIX
        // 1x looks TERRIBLE on 2x screens. Use 1.5x minimum.
        // ═══════════════════════════════════════════════════════════════
        let pixelRatio;
        switch(tier) {
            case 'ultra-low':
                // Even on 1GB/2core, 1.5x is acceptable
                // 1x on 2x screen = 4x fewer pixels = very blurry
                pixelRatio = Math.min(nativePixelRatio, 1.5);
                break;
            case 'low':
                pixelRatio = Math.min(nativePixelRatio, 1.75);
                break;
            case 'mid':
                pixelRatio = Math.min(nativePixelRatio, 2.0);
                break;
            case 'high':
                pixelRatio = Math.min(nativePixelRatio, 2.5);
                break;
            default:
                pixelRatio = Math.min(nativePixelRatio, 2.0);
        }
        
        // Build profile
        this.profile = {
            tier,
            score,
            isMobile,
            pixelRatio,
            nativePixelRatio,
            deviceMemory,
            cores,
            gpuTier,
            isUltraLow: tier === 'ultra-low',
            isLowEnd: tier === 'ultra-low' || tier === 'low'
        };
        
        console.log(`📱 Device Profile:`);
        console.log(`   Tier: ${tier} (score: ${score}/100)`);
        console.log(`   Pixel Ratio: ${pixelRatio.toFixed(2)} / native ${nativePixelRatio}`);
        console.log(`   Memory: ${deviceMemory}GB, Cores: ${cores}, GPU: ${gpuTier}`);
        
        return this.profile;
    },
    
    /**
     * Get quality settings based on device tier
     * @returns {Object} Quality configuration
     */
    getQualitySettings: function() {
        const profile = this.detect();
        
        const presets = {
            'ultra-low': {
                particleCount: 8,
                maxObstacles: 4,
                maxGems: 3,
                maxTrails: 10,
                bgParticles: 8,
                maxGreenGems: 2,
                maxRedGems: 1,
                maxBoosts: 1,
                shootingStarInterval: 15000,
                antialias: false,
                targetFPS: 30,
                renderScale: 0.85
            },
            'low': {
                particleCount: 12,
                maxObstacles: 5,
                maxGems: 4,
                maxTrails: 15,
                bgParticles: 12,
                maxGreenGems: 2,
                maxRedGems: 1,
                maxBoosts: 1,
                shootingStarInterval: 10000,
                antialias: false,
                targetFPS: 45,
                renderScale: 0.9
            },
            'mid': {
                particleCount: 18,
                maxObstacles: 6,
                maxGems: 5,
                maxTrails: 20,
                bgParticles: 18,
                maxGreenGems: 3,
                maxRedGems: 2,
                maxBoosts: 2,
                shootingStarInterval: 6000,
                antialias: true,
                targetFPS: 60,
                renderScale: 1.0
            },
            'high': {
                particleCount: 25,
                maxObstacles: 8,
                maxGems: 6,
                maxTrails: 25,
                bgParticles: 25,
                maxGreenGems: 3,
                maxRedGems: 2,
                maxBoosts: 2,
                shootingStarInterval: 4000,
                antialias: true,
                targetFPS: 60,
                renderScale: 1.0
            }
        };
        
        return presets[profile.tier] || presets['mid'];
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FPS TRACKING & LIMITING SYSTEM                                           ║
   ║  Battery save කරනවා, thermal throttling prevent කරනවා                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const FPSManager = {
    // Tracking
    frames: [],
    lastTime: 0,
    currentFPS: 60,
    
    // Limiting
    targetFPS: 60,
    frameDuration: 16.67,
    lastFrameTime: 0,
    accumulatedTime: 0,
    
    // Display
    frameCount: 0,
    fpsDisplayTime: 0,
    
    /**
     * Initialize FPS manager with device-appropriate target
     */
    init: function() {
        const quality = DeviceProfiler.getQualitySettings();
        this.targetFPS = quality.targetFPS;
        this.frameDuration = 1000 / this.targetFPS;
        this.lastTime = performance.now();
        this.lastFrameTime = performance.now();
        
        console.log(`⏱️ FPS Manager: Target ${this.targetFPS} FPS`);
    },
    
    /**
     * Update FPS tracking (call every frame)
     * @returns {number} Current FPS
     */
    update: function() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        // Track frames for average
        this.frames.push(delta);
        if (this.frames.length > 60) this.frames.shift();
        
        // Calculate average FPS
        if (this.frames.length >= 30) {
            const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
            this.currentFPS = Math.round(1000 / avgDelta);
        }
        
        return this.currentFPS;
    },
    
    /**
     * Check if we should render this frame (FPS limiting)
     * @param {number} currentTime - Timestamp from requestAnimationFrame
     * @returns {Object} { shouldRender: boolean, deltaTime: number }
     */
    checkFrameTiming: function(currentTime) {
        if (!this.lastFrameTime) {
            this.lastFrameTime = currentTime;
            return { shouldRender: false, deltaTime: 0 };
        }
        
        const elapsed = currentTime - this.lastFrameTime;
        this.accumulatedTime += elapsed;
        this.lastFrameTime = currentTime;
        
        // FPS counter
        this.frameCount++;
        if (currentTime - this.fpsDisplayTime >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.fpsDisplayTime = currentTime;
        }
        
        // Should we render?
        if (this.accumulatedTime < this.frameDuration) {
            return { shouldRender: false, deltaTime: 0 };
        }
        
        // Calculate deltaTime (normalized, capped)
        const deltaTime = Math.min(this.accumulatedTime / 16.67, 3.0);
        this.accumulatedTime = this.accumulatedTime % this.frameDuration;
        
        return { shouldRender: true, deltaTime };
    },
    
    /**
     * Get current FPS for display
     * @returns {number}
     */
    getFPS: function() {
        return this.currentFPS;
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ADAPTIVE QUALITY SYSTEM                                                   ║
   ║  FPS monitor කරලා quality auto-adjust කරනවා                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const AdaptiveQuality = {
    qualityMultiplier: 1.0,
    lowFPSCount: 0,
    highFPSCount: 0,
    lastAdjustTime: 0,
    
    /**
     * Update quality based on current FPS
     * @param {number} fps - Current FPS
     */
    update: function(fps) {
        const now = performance.now();
        
        // Don't adjust too frequently (wait 2 seconds between adjustments)
        if (now - this.lastAdjustTime < 2000) return;
        
        const profile = DeviceProfiler.detect();
        const targetFPS = FPSManager.targetFPS;
        const minFPS = targetFPS * 0.5; // 50% of target
        const goodFPS = targetFPS * 0.9; // 90% of target
        
        if (fps < minFPS) {
            this.lowFPSCount++;
            this.highFPSCount = 0;
            
            // If consistently low, reduce quality
            if (this.lowFPSCount >= 5 && this.qualityMultiplier > 0.5) {
                this.qualityMultiplier = Math.max(0.5, this.qualityMultiplier - 0.1);
                this.applyQuality();
                this.lastAdjustTime = now;
                this.lowFPSCount = 0;
                console.log(`⬇️ Quality reduced to ${(this.qualityMultiplier * 100).toFixed(0)}%`);
            }
        } else if (fps > goodFPS) {
            this.highFPSCount++;
            this.lowFPSCount = 0;
            
            // If consistently good, increase quality
            if (this.highFPSCount >= 20 && this.qualityMultiplier < 1.0) {
                this.qualityMultiplier = Math.min(1.0, this.qualityMultiplier + 0.05);
                this.applyQuality();
                this.lastAdjustTime = now;
                this.highFPSCount = 0;
                console.log(`⬆️ Quality increased to ${(this.qualityMultiplier * 100).toFixed(0)}%`);
            }
        } else {
            // Reset counters if FPS is acceptable
            this.lowFPSCount = Math.max(0, this.lowFPSCount - 1);
            this.highFPSCount = Math.max(0, this.highFPSCount - 1);
        }
    },
    
    /**
     * Apply current quality multiplier to QUALITY settings
     */
    applyQuality: function() {
        if (typeof QUALITY === 'undefined') return;
        
        const base = DeviceProfiler.getQualitySettings();
        const q = this.qualityMultiplier;
        
        QUALITY.particleCount = Math.max(5, Math.floor(base.particleCount * q));
        QUALITY.maxTrails = Math.max(5, Math.floor(base.maxTrails * q));
        QUALITY.bgParticles = Math.max(5, Math.floor(base.bgParticles * q));
        QUALITY.maxGems = Math.max(2, Math.floor(base.maxGems * q));
        QUALITY.maxObstacles = Math.max(3, Math.floor(base.maxObstacles * q));
        
        // Don't change these dynamically (game balance)
        QUALITY.maxGreenGems = base.maxGreenGems;
        QUALITY.maxRedGems = base.maxRedGems;
        QUALITY.maxBoosts = base.maxBoosts;
        QUALITY.shootingStarInterval = base.shootingStarInterval;
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  OBJECT POOLING SYSTEM                                                     ║
   ║  Memory allocation reduce කරනවා - GC pauses avoid කරනවා                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const ObjectPool = {
    pools: {},
    
    /**
     * Get or create a pool
     */
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
    
    /**
     * Acquire an object from pool
     */
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
    
    /**
     * Release an object back to pool
     */
    release: function(name, obj) {
        const pool = this.pools[name];
        if (!pool) return;
        
        const idx = pool.inUse.indexOf(obj);
        if (idx > -1) {
            pool.inUse.splice(idx, 1);
            pool.available.push(obj);
        }
    },
    
    /**
     * Return all objects to available
     */
    cleanup: function(name) {
        const pool = this.pools[name];
        if (!pool) return;
        
        while (pool.inUse.length > 0) {
            pool.available.push(pool.inUse.pop());
        }
    },
    
    /**
     * Get pool stats
     */
    getStats: function(name) {
        const pool = this.pools[name];
        if (!pool) return null;
        return {
            available: pool.available.length,
            inUse: pool.inUse.length,
            total: pool.available.length + pool.inUse.length
        };
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MEMORY CLEANUP SYSTEM                                                     ║
   ║  Periodic cleanup to prevent memory leaks                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const MemoryManager = {
    cleanupInterval: null,
    
    /**
     * Start periodic cleanup
     */
    start: function() {
        const profile = DeviceProfiler.detect();
        
        // More aggressive cleanup on low-end devices
        const interval = profile.isUltraLow ? 8000 : 
                        profile.isLowEnd ? 12000 : 20000;
        
        this.cleanupInterval = setInterval(() => this.cleanup(), interval);
        console.log(`🧹 Memory cleanup: Every ${interval/1000}s`);
    },
    
    /**
     * Stop periodic cleanup
     */
    stop: function() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    },
    
    /**
     * Perform cleanup
     */
    cleanup: function() {
        if (typeof gameRunning !== 'undefined' && !gameRunning) return;
        
        const profile = DeviceProfiler.detect();
        
        // Particle cleanup
        const particleLimit = profile.isUltraLow ? 15 : profile.isLowEnd ? 25 : 40;
        if (typeof particles !== 'undefined' && particles.length > particleLimit) {
            const excess = particles.length - particleLimit;
            const toRemove = particles.splice(0, excess);
            toRemove.forEach(p => {
                if (typeof scene !== 'undefined' && scene && p) {
                    scene.remove(p);
                    if (p.geometry) p.geometry.dispose();
                    if (p.material) p.material.dispose();
                }
            });
        }
        
        // Trail cleanup
        const trailLimit = profile.isUltraLow ? 10 : profile.isLowEnd ? 18 : 30;
        if (typeof magicTrails !== 'undefined' && magicTrails.length > trailLimit) {
            const excess = magicTrails.length - trailLimit;
            const toRemove = magicTrails.splice(0, excess);
            toRemove.forEach(t => {
                if (typeof scene !== 'undefined' && scene && t) {
                    scene.remove(t);
                    if (t.geometry) t.geometry.dispose();
                    if (t.material) t.material.dispose();
                }
            });
        }
        
        // Gem burst cleanup
        const burstLimit = profile.isUltraLow ? 5 : profile.isLowEnd ? 8 : 15;
        if (typeof gemBursts !== 'undefined' && gemBursts.length > burstLimit) {
            const excess = gemBursts.length - burstLimit;
            const toRemove = gemBursts.splice(0, excess);
            toRemove.forEach(b => {
                if (typeof scene !== 'undefined' && scene && b) {
                    scene.remove(b);
                }
            });
        }
        
        // Pool cleanup
        ObjectPool.cleanup('particles');
        
        // Request GC if available (usually only in debug builds)
        if (window.gc) {
            try { window.gc(); } catch(e) {}
        }
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  RENDERER OPTIMIZER                                                        ║
   ║  Renderer settings optimize කරනවා device එකට ගැලපෙන්න                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const RendererOptimizer = {
    applied: false,
    
    /**
     * Apply renderer optimizations (call after renderer is created)
     */
    apply: function() {
        if (this.applied) return;
        if (typeof renderer === 'undefined' || !renderer) return;
        
        const profile = DeviceProfiler.detect();
        const quality = DeviceProfiler.getQualitySettings();
        
        // ═══════════════════════════════════════════════════════════════
        // SMART PIXEL RATIO - THE KEY FIX
        // Don't force 1x - use smart ratio from profiler
        // ═══════════════════════════════════════════════════════════════
        renderer.setPixelRatio(profile.pixelRatio);
        
        // Disable shadows on low-end
        if (renderer.shadowMap) {
            renderer.shadowMap.enabled = !profile.isLowEnd;
        }
        
        // Color space & tone mapping
        if (THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        
        // Sort objects for better batching
        renderer.sortObjects = true;
        
        // Apply render scale if needed
        if (quality.renderScale < 1) {
            const width = Math.floor(window.innerWidth * quality.renderScale);
            const height = Math.floor(window.innerHeight * quality.renderScale);
            renderer.setSize(width, height);
            renderer.domElement.style.width = window.innerWidth + 'px';
            renderer.domElement.style.height = window.innerHeight + 'px';
        }
        
        this.applied = true;
        
        console.log(`🎮 Renderer optimized:`);
        console.log(`   Pixel Ratio: ${profile.pixelRatio.toFixed(2)}`);
        console.log(`   Render Scale: ${quality.renderScale}`);
        console.log(`   Shadows: ${!profile.isLowEnd}`);
    },
    
    /**
     * Wait for renderer and apply optimizations
     */
    waitAndApply: function() {
        if (typeof renderer !== 'undefined' && renderer) {
            this.apply();
        } else {
            const check = setInterval(() => {
                if (typeof renderer !== 'undefined' && renderer) {
                    clearInterval(check);
                    this.apply();
                }
            }, 100);
            
            // Give up after 10 seconds
            setTimeout(() => clearInterval(check), 10000);
        }
    }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CSS PERFORMANCE OPTIMIZATIONS                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function applyCSSOptimizations() {
    const profile = DeviceProfiler.detect();
    
    const style = document.createElement('style');
    style.id = 'perf-optimizations';
    
    let css = `
        /* GPU acceleration for interactive elements */
        canvas {
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
        
        .control-btn, .btn, .gem-collect-popup, .boost-popup {
            will-change: transform, opacity;
            transform: translateZ(0);
            backface-visibility: hidden;
        }
        
        .hud-panel, .stats-panel, .lives-panel, .level-panel {
            contain: layout style;
            transform: translateZ(0);
        }
        
        .magic-particle, .shooting-star {
            will-change: transform;
            transform: translateZ(0);
        }
    `;
    
    // Extra optimizations for low-end
    if (profile.isLowEnd) {
        css += `
            /* Reduce animation complexity on low-end */
            .gem-pickup-popup, .boost-pickup-popup {
                animation-duration: 0.3s !important;
            }
            
            /* Disable expensive filters */
            .glow-text {
                text-shadow: none !important;
                filter: none !important;
            }
        `;
    }
    
    // Ultra-low specific
    if (profile.isUltraLow) {
        css += `
            /* Remove all filters on ultra-low */
            .gem-pickup-popup, .boost-pickup-popup {
                filter: none !important;
            }
            
            /* Pixelated rendering for speed */
            canvas {
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
            }
            
            /* Disable transitions */
            *, *::before, *::after {
                transition-duration: 0.1s !important;
            }
        `;
    }
    
    style.textContent = css;
    document.head.appendChild(style);
    
    console.log('✅ CSS optimizations applied');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  INITIALIZATION                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Main initialization function
 */
function initOptimizations() {
    console.log('⚡ Initializing optimization systems...');
    
    // 1. Profile device first
    const profile = DeviceProfiler.detect();
    const quality = DeviceProfiler.getQualitySettings();
    
    // 2. Set global flags based on profile
    window.isMobile = profile.isMobile;
    window.__PIXEL_RATIO_MAX__ = profile.pixelRatio;
    window.__FORCE_NO_ANTIALIAS__ = !quality.antialias;
    window.__TARGET_FPS__ = quality.targetFPS;
    
    // 3. Apply QUALITY settings
    if (typeof QUALITY !== 'undefined') {
        Object.assign(QUALITY, {
            particleCount: quality.particleCount,
            maxObstacles: quality.maxObstacles,
            maxGems: quality.maxGems,
            maxTrails: quality.maxTrails,
            bgParticles: quality.bgParticles,
            maxGreenGems: quality.maxGreenGems,
            maxRedGems: quality.maxRedGems,
            maxBoosts: quality.maxBoosts,
            shootingStarInterval: quality.shootingStarInterval
        });
        console.log('✅ QUALITY settings applied:', QUALITY);
    }
    
    // 4. Initialize FPS manager
    FPSManager.init();
    
    // 5. Apply CSS optimizations
    applyCSSOptimizations();
    
    // 6. Wait for renderer and optimize it
    RendererOptimizer.waitAndApply();
    
    // 7. Start memory cleanup
    MemoryManager.start();
    
    // 8. Initialize particle pool
    if (profile.isMobile || profile.isLowEnd) {
        window.__PARTICLE_POOL__ = ObjectPool.getPool('particles', function() {
            const geo = new THREE.SphereGeometry(0.08, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            return new THREE.Mesh(geo, mat);
        }, 20);
    }
    
    // 9. Visibility change handler (pause when tab hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (typeof pauseGame === 'function') {
                pauseGame();
            } else if (typeof gamePaused !== 'undefined') {
                gamePaused = true;
                const overlay = document.getElementById('pauseOverlay');
                if (overlay) overlay.classList.remove('hidden');
            }
        }
    }, { passive: true });
    
    // 10. Touch optimization for mobile
    if (profile.isMobile) {
        document.addEventListener('touchmove', function(e) {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    console.log('✅ All optimizations initialized');
    console.log(`   Device: ${profile.tier} (score: ${profile.score})`);
    console.log(`   Target FPS: ${quality.targetFPS}`);
    console.log(`   Pixel Ratio: ${profile.pixelRatio.toFixed(2)}`);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GAME LOOP INTEGRATION                                                     ║
   ║  FPS limiting ඔයාගේ game loop එකට integrate කරන්න                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Wrap existing animate function with FPS limiting & adaptive quality
 */
(function wrapGameLoop() {
    // Wait for animate function to exist
    const waitForAnimate = setInterval(() => {
        if (typeof window.animate === 'function' && !window.__animateWrapped__) {
            clearInterval(waitForAnimate);
            
            const originalAnimate = window.animate;
            
            window.animate = function(currentTime) {
                // Update FPS tracking
                const fps = FPSManager.update();
                
                // Adaptive quality (only on low-end devices)
                const profile = DeviceProfiler.detect();
                if (profile.isLowEnd) {
                    AdaptiveQuality.update(fps);
                }
                
                // Call original animate
                if (typeof originalAnimate === 'function') {
                    originalAnimate.apply(this, arguments);
                }
            };
            
            window.__animateWrapped__ = true;
            console.log('✅ Game loop wrapped with FPS tracking');
        }
    }, 100);
    
    // Give up after 10 seconds
    setTimeout(() => clearInterval(waitForAnimate), 10000);
})();


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPORTS                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

// Export to window for global access
window.DeviceProfiler = DeviceProfiler;
window.FPSManager = FPSManager;
window.AdaptiveQuality = AdaptiveQuality;
window.ObjectPool = ObjectPool;
window.MemoryManager = MemoryManager;
window.RendererOptimizer = RendererOptimizer;
window.initOptimizations = initOptimizations;

// Legacy compatibility
window.FPSTracker = {
    update: function() { return FPSManager.update(); },
    getAverageFPS: function() { return FPSManager.getFPS(); },
    get currentFPS() { return FPSManager.currentFPS; }
};

// Auto-detect mobile
window.isMobile = DeviceProfiler.detect().isMobile;


console.log('✅ 14-optimization.js loaded (fixed version)');