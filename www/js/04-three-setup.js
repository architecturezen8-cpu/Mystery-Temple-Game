/* ═══════════════════════════════════════════════════════════════════════════
   04-THREE-SETUP.JS
   Mystery Temple - Galaxy Edition
   
   Three.js initialization, scene, camera, environment, and player.
   Galaxy runner visual style.
   
   FULLY OPTIMIZED FOR ALL DEVICES
   - Smart device profiling (GPU, RAM, CPU detection)
   - Adaptive quality scaling (not brutal downgrade)
   - FPS limiting for battery & thermal management
   - Works on 1GB RAM / 2-core 1.2GHz CPU devices
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  DEVICE PROFILING SYSTEM                                                   ║
   ║  Smart detection - GPU, RAM, CPU, Screen size ඔක්කොම check කරනවා          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

// Global device profile - computed once at startup
let deviceProfile = null;

/**
 * Smart device profiler - determines quality tier without destroying visuals
 * Score-based system: 0-100 points → tier assignment
 * @returns {Object} Device profile with tier, quality settings, pixel ratio etc.
 */
function profileDevice() {
    // Basic device detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;

    const deviceMemory = navigator.deviceMemory || 4; // GB (default 4 if not available)
    const cores = navigator.hardwareConcurrency || 4;
    const screenPixels = window.innerWidth * window.innerHeight;
    const nativePixelRatio = window.devicePixelRatio || 1;

    // GPU detection via WebGL
    let gpuTier = 'unknown';
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

                // Categorize GPU by known model names
                if (gpuRenderer.includes('mali-4') || gpuRenderer.includes('adreno 3') ||
                    gpuRenderer.includes('adreno 2') || gpuRenderer.includes('sgx') ||
                    gpuRenderer.includes('vivante') || gpuRenderer.includes('videocore')) {
                    gpuTier = 'very-weak';
                } else if (gpuRenderer.includes('mali-t') || gpuRenderer.includes('adreno 4') ||
                    gpuRenderer.includes('adreno 5') || gpuRenderer.includes('mali-g51') ||
                    gpuRenderer.includes('powervr')) {
                    gpuTier = 'weak';
                } else if (gpuRenderer.includes('mali-g') || gpuRenderer.includes('adreno 6') ||
                    gpuRenderer.includes('apple gpu') || gpuRenderer.includes('intel')) {
                    gpuTier = 'medium';
                } else {
                    gpuTier = 'strong';
                }
            }
            // Clean up WebGL context
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
        }
    } catch (e) {
        console.warn('GPU detection failed:', e);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCORE-BASED TIER SYSTEM (0-100 points)
    // ═══════════════════════════════════════════════════════════════════
    let score = 50; // Baseline score

    // Memory scoring (-25 to +20)
    if (deviceMemory <= 1) score -= 25;      // 1GB or less - very weak
    else if (deviceMemory <= 2) score -= 15; // 2GB - weak
    else if (deviceMemory <= 3) score -= 5;  // 3GB - below average
    else if (deviceMemory >= 6) score += 10; // 6GB+ - good
    else if (deviceMemory >= 8) score += 20; // 8GB+ - excellent

    // CPU scoring (-20 to +15)
    if (cores <= 2) score -= 20;       // 2 cores or less - very weak
    else if (cores <= 4) score -= 5;   // 4 cores - average
    else if (cores >= 6) score += 5;   // 6 cores - good
    else if (cores >= 8) score += 15;  // 8 cores - excellent

    // GPU scoring (-20 to +15)
    if (gpuTier === 'very-weak') score -= 20;
    else if (gpuTier === 'weak') score -= 10;
    else if (gpuTier === 'medium') score += 5;
    else if (gpuTier === 'strong') score += 15;

    // Mobile penalty (thermals, battery saving modes affect performance)
    if (isMobile) score -= 10;

    // Screen size adjustment (smaller = easier to render)
    if (screenPixels < 500000) score += 10;       // Small screen bonus
    else if (screenPixels > 2000000) score -= 10; // Large screen penalty

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    // ═══════════════════════════════════════════════════════════════════
    // DETERMINE TIER FROM SCORE
    // ═══════════════════════════════════════════════════════════════════
    let tier;
    if (score <= 20) tier = 'ultra-low';
    else if (score <= 40) tier = 'low';
    else if (score <= 65) tier = 'mid';
    else tier = 'high';

    // ═══════════════════════════════════════════════════════════════════
    // SMART PIXEL RATIO - THE KEY FIX
    // Instead of forcing 1x (looks terrible), find sweet spot
    // ═══════════════════════════════════════════════════════════════════
    let targetPixelRatio;
    switch (tier) {
        case 'ultra-low':
            // Even on 1GB/2core, use at least native ratio capped at 1.5
            // Rendering at 1x on 2x screen = 4x fewer pixels = very blurry
            // Rendering at 1.5x on 2x screen = 56% of native = good balance
            targetPixelRatio = Math.min(nativePixelRatio, 1.5);
            break;
        case 'low':
            targetPixelRatio = Math.min(nativePixelRatio, 1.75);
            break;
        case 'mid':
            targetPixelRatio = Math.min(nativePixelRatio, 2.0);
            break;
        case 'high':
            targetPixelRatio = Math.min(nativePixelRatio, 2.5);
            break;
        default:
            targetPixelRatio = Math.min(nativePixelRatio, 2.0);
    }

    // ═══════════════════════════════════════════════════════════════════
    // QUALITY PRESETS PER TIER
    // ═══════════════════════════════════════════════════════════════════
    const qualityPresets = {
        'ultra-low': {
            // Geometry detail
            sphereDetail: 10,
            glowDetail: 6,
            ringDetail: 12,
            cylinderSegments: 6,
            skyDomeDetail: 16,

            // Object counts
            starCount: 150,
            coloredStarCount: 20,
            planetCount: 3,
            nebulaCount: 2,

            // Spacing (larger = fewer objects)
            pillarSpacing: 70,

            // Rendering
            maxLights: 3,
            fogNear: 25,
            fogFar: 70,
            antialias: false,
            precision: 'mediump',
            shadowsEnabled: false,
            renderScale: 0.85,  // Render at 85% then upscale

            // Features
            enablePillarGlow: false,
            enablePillarLights: false,

            // Performance
            targetFPS: 30,

            // Star sizes (larger to compensate for fewer stars)
            starSize: 0.6,
            coloredStarSize: 0.9
        },
        'low': {
            sphereDetail: 14,
            glowDetail: 8,
            ringDetail: 16,
            cylinderSegments: 8,
            skyDomeDetail: 24,

            starCount: 250,
            coloredStarCount: 35,
            planetCount: 4,
            nebulaCount: 3,

            pillarSpacing: 50,

            maxLights: 4,
            fogNear: 28,
            fogFar: 80,
            antialias: false,
            precision: 'mediump',
            shadowsEnabled: false,
            renderScale: 0.9,

            enablePillarGlow: true,
            enablePillarLights: false,

            targetFPS: 45,

            starSize: 0.5,
            coloredStarSize: 0.8
        },
        'mid': {
            sphereDetail: 20,
            glowDetail: 12,
            ringDetail: 24,
            cylinderSegments: 8,
            skyDomeDetail: 32,

            starCount: 400,
            coloredStarCount: 60,
            planetCount: 4,
            nebulaCount: 3,

            pillarSpacing: 35,

            maxLights: 5,
            fogNear: 30,
            fogFar: 90,
            antialias: true,
            precision: 'highp',
            shadowsEnabled: false,
            renderScale: 1.0,

            enablePillarGlow: true,
            enablePillarLights: true,

            targetFPS: 60,

            starSize: 0.5,
            coloredStarSize: 0.8
        },
        'high': {
            sphereDetail: 24,
            glowDetail: 16,
            ringDetail: 32,
            cylinderSegments: 8,
            skyDomeDetail: 32,

            starCount: 500,
            coloredStarCount: 80,
            planetCount: 4,
            nebulaCount: 3,

            pillarSpacing: 35,

            maxLights: 6,
            fogNear: 30,
            fogFar: 100,
            antialias: true,
            precision: 'highp',
            shadowsEnabled: false,
            renderScale: 1.0,

            enablePillarGlow: true,
            enablePillarLights: true,

            targetFPS: 60,

            starSize: 0.5,
            coloredStarSize: 0.8
        }
    };

    // Build final profile object
    const profile = {
        tier,
        score,
        isMobile,
        pixelRatio: targetPixelRatio,
        nativePixelRatio,
        deviceMemory,
        cores,
        gpuTier,
        quality: qualityPresets[tier]
    };

    // Log profile for debugging
    console.log(`📱 Device Profile:`);
    console.log(`   Tier: ${tier} (score: ${score}/100)`);
    console.log(`   Pixel Ratio: ${targetPixelRatio.toFixed(2)} / native ${nativePixelRatio}`);
    console.log(`   Memory: ${deviceMemory}GB, Cores: ${cores}, GPU: ${gpuTier}`);
    console.log(`   Target FPS: ${qualityPresets[tier].targetFPS}`);

    return profile;
}

/**
 * Get cached device profile (computes once, returns cached after)
 * @returns {Object} Device profile
 */
function getDeviceProfile() {
    if (!deviceProfile) {
        deviceProfile = profileDevice();
    }
    return deviceProfile;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FPS LIMITER SYSTEM                                                        ║
   ║  Battery save කරනවා, thermal throttling prevent කරනවා                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

// FPS limiting variables
let targetFPS = 60;
let frameDuration = 1000 / targetFPS;
let lastFrameTime = 0;
let accumulatedTime = 0;
let frameCount = 0;
let fpsDisplayTime = 0;
let currentFPS = 0;

/**
 * Initialize FPS limiter based on device profile
 */
function initFPSLimiter() {
    const profile = getDeviceProfile();
    targetFPS = profile.quality.targetFPS;
    frameDuration = 1000 / targetFPS;

    console.log(`⏱️ FPS Limiter: Target ${targetFPS} FPS (${frameDuration.toFixed(2)}ms per frame)`);
}

/**
 * Check if enough time has passed for next frame
 * @param {number} currentTime - Current timestamp from requestAnimationFrame
 * @returns {Object} { shouldRender: boolean, deltaTime: number }
 */
function checkFrameTiming(currentTime) {
    if (!lastFrameTime) {
        lastFrameTime = currentTime;
        return { shouldRender: false, deltaTime: 0 };
    }

    const elapsed = currentTime - lastFrameTime;
    accumulatedTime += elapsed;
    lastFrameTime = currentTime;

    // FPS counter update (every second)
    frameCount++;
    if (currentTime - fpsDisplayTime >= 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        fpsDisplayTime = currentTime;
    }

    // Check if we should render this frame
    if (accumulatedTime < frameDuration) {
        return { shouldRender: false, deltaTime: 0 };
    }

    // Calculate deltaTime (normalized, capped to prevent huge jumps)
    // deltaTime = 1.0 means exactly target frame time
    // deltaTime = 2.0 means we're running at half speed
    const deltaTime = Math.min(accumulatedTime / 16.67, 3.0);

    // Reset accumulator (use modulo for smoother timing)
    accumulatedTime = accumulatedTime % frameDuration;

    return { shouldRender: true, deltaTime };
}

/**
 * Get current FPS (for display)
 * @returns {number} Current FPS
 */
function getCurrentFPS() {
    return currentFPS;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  THREE.JS INITIALIZATION                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Initialize Three.js scene, camera, renderer
 */
function initThreeJS() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // Initialize FPS limiter
    initFPSLimiter();

    // ═══════════════════════════════════════════════════════════════════
    // CREATE SCENE
    // ═══════════════════════════════════════════════════════════════════
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030510);

    // Adaptive fog - closer fog on weak devices = less to render
    scene.fog = new THREE.Fog(0x030510, q.fogNear, q.fogFar);

    // ═══════════════════════════════════════════════════════════════════
    // CREATE CAMERA
    // ═══════════════════════════════════════════════════════════════════
    const farPlane = profile.tier === 'ultra-low' ? 120 :
        profile.tier === 'low' ? 150 : 200;

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        farPlane
    );
    camera.position.set(0, 6.5, 13);
    camera.lookAt(0, 2, -8);

    // ═══════════════════════════════════════════════════════════════════
    // CREATE RENDERER
    // ═══════════════════════════════════════════════════════════════════
    renderer = new THREE.WebGLRenderer({
        canvas: getEl('gameCanvas'),
        antialias: q.antialias,
        powerPreference: "high-performance",
        precision: q.precision,
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: false,
        alpha: false  // Slight perf gain
    });

    // Apply render scale (render smaller, CSS scales up)
    const renderWidth = Math.floor(window.innerWidth * q.renderScale);
    const renderHeight = Math.floor(window.innerHeight * q.renderScale);
    renderer.setSize(renderWidth, renderHeight);

    // If render scale < 1, let CSS handle upscaling
    if (q.renderScale < 1) {
        renderer.domElement.style.width = window.innerWidth + 'px';
        renderer.domElement.style.height = window.innerHeight + 'px';
    }

    // THE KEY FIX: Smart pixel ratio
    renderer.setPixelRatio(profile.pixelRatio);

    // Renderer optimizations
    renderer.sortObjects = true;
    renderer.shadowMap.enabled = q.shadowsEnabled;

    // ═══════════════════════════════════════════════════════════════════
    // CREATE LIGHTING
    // ═══════════════════════════════════════════════════════════════════
    createLighting();

    // ═══════════════════════════════════════════════════════════════════
    // HANDLE RESIZE
    // ═══════════════════════════════════════════════════════════════════
    window.addEventListener('resize', handleResize);

    console.log(`🎮 Renderer initialized:`);
    console.log(`   Size: ${renderWidth}x${renderHeight} (scale: ${q.renderScale})`);
    console.log(`   Pixel Ratio: ${profile.pixelRatio.toFixed(2)}`);
    console.log(`   Antialias: ${q.antialias}`);
    console.log(`   Precision: ${q.precision}`);
}

/**
 * Create scene lighting - adaptive based on device tier
 */
function createLighting() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // Ambient light - always needed, very cheap
    const ambient = new THREE.AmbientLight(0x223355, 0.8);
    scene.add(ambient);

    // Main directional light - cheap, always include
    const dirLight = new THREE.DirectionalLight(0x6688cc, 0.8);
    dirLight.position.set(-10, 30, -20);
    scene.add(dirLight);

    // Green accent light from path - important for atmosphere
    const pathLight = new THREE.PointLight(0x00ff88, 0.6, 60);
    pathLight.position.set(0, 5, -30);
    scene.add(pathLight);

    // Additional lights only if we have budget
    if (q.maxLights >= 4) {
        const nebulaLight = new THREE.PointLight(0x8844ff, 0.4, 80);
        nebulaLight.position.set(-30, 20, -50);
        scene.add(nebulaLight);
    }

    if (q.maxLights >= 5) {
        const blueLight = new THREE.PointLight(0x0088ff, 0.3, 100);
        blueLight.position.set(40, 15, -70);
        scene.add(blueLight);
    }

    if (q.maxLights >= 6) {
        const accentLight = new THREE.PointLight(0xff4488, 0.25, 90);
        accentLight.position.set(-50, 25, -80);
        scene.add(accentLight);
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    if (!camera || !renderer) return;

    const profile = getDeviceProfile();
    const q = profile.quality;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    const renderWidth = Math.floor(window.innerWidth * q.renderScale);
    const renderHeight = Math.floor(window.innerHeight * q.renderScale);
    renderer.setSize(renderWidth, renderHeight);

    if (q.renderScale < 1) {
        renderer.domElement.style.width = window.innerWidth + 'px';
        renderer.domElement.style.height = window.innerHeight + 'px';
    }

    renderer.setPixelRatio(profile.pixelRatio);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GALAXY ENVIRONMENT                                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Create full galaxy environment
 */
function createEnvironment() {
    // Clear env references (avoid duplicates)
    if (typeof env !== 'undefined' && env) {
        if (env.planets) env.planets.length = 0;
        if (env.rings) env.rings.length = 0;
        if (env.nebulas) env.nebulas.length = 0;
        env.stars = null;
        env.coloredStars = null;
    }

    createSkyDome();
    createGalaxyPath();
    createSidePlanets();
    createNebulaClouds();
    createStarField();
    createGlowingPillars();

    console.log('🌌 Galaxy environment created');
}

/**
 * Create sky dome
 */
function createSkyDome() {
    const profile = getDeviceProfile();
    const detail = profile.quality.skyDomeDetail;

    const skyGeo = new THREE.SphereGeometry(180, detail, detail);
    const skyMat = new THREE.MeshBasicMaterial({
        color: 0x030510,
        side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
}

/**
 * Create the galaxy running path
 */
function createGalaxyPath() {
    // Main ground
    const groundGeo = new THREE.PlaneGeometry(18, 400);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a18,
        roughness: 0.7,
        metalness: 0.2,
        emissive: 0x050510,
        emissiveIntensity: 0.3
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -180;
    scene.add(ground);

    // Glowing lane lines
    const lineMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.7
    });

    LANES.forEach(x => {
        const lineGeo = new THREE.PlaneGeometry(0.1, 400);
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.02, -180);
        scene.add(line);
    });

    // Edge glow lines
    const edgeMat = new THREE.MeshBasicMaterial({
        color: 0x4400ff,
        transparent: true,
        opacity: 0.5
    });

    [-9, 9].forEach(x => {
        const edgeGeo = new THREE.PlaneGeometry(0.15, 400);
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(x, 0.02, -180);
        scene.add(edge);
    });
}

/**
 * Create decorative planets - adaptive detail & count
 */
function createSidePlanets() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    const allPlanets = [
        { x: -50, y: 40, z: -80, radius: 12, color: 0x4422aa, ring: true },
        { x: 60, y: 30, z: -100, radius: 8, color: 0x226688, ring: false },
        { x: -40, y: 60, z: -150, radius: 15, color: 0x884422, ring: true },
        { x: 45, y: 50, z: -120, radius: 6, color: 0x228844, ring: false }
    ];

    // Use only planetCount planets
    const planets = allPlanets.slice(0, q.planetCount);

    planets.forEach((p) => {
        // Planet body
        const geo = new THREE.SphereGeometry(p.radius, q.sphereDetail, q.sphereDetail);
        const mat = new THREE.MeshStandardMaterial({
            color: p.color,
            roughness: 0.85,
            metalness: 0.05
        });
        const planet = new THREE.Mesh(geo, mat);
        planet.position.set(p.x, p.y, p.z);
        scene.add(planet);

        if (typeof env !== 'undefined' && env.planets) {
            env.planets.push(planet);
        }

        // Glow sphere
        const glowGeo = new THREE.SphereGeometry(p.radius * 1.15, q.glowDetail, q.glowDetail);
        const glowMat = new THREE.MeshBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(planet.position);
        scene.add(glow);

        // Ring (only for some planets)
        if (p.ring) {
            const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2, q.ringDetail);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(planet.position);
            ring.rotation.x = Math.PI / 3;
            ring.rotation.z = Math.PI / 6;
            scene.add(ring);

            if (typeof env !== 'undefined' && env.rings) {
                env.rings.push(ring);
            }
        }
    });
}

/**
 * Create nebula cloud effects - adaptive count
 */
function createNebulaClouds() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    const allNebulas = [
        { x: -80, y: 50, z: -120, color: 0xff0066 },
        { x: 70, y: 60, z: -140, color: 0x0066ff },
        { x: 0, y: 80, z: -180, color: 0x8800ff }
    ];

    const nebulaPositions = allNebulas.slice(0, q.nebulaCount);

    nebulaPositions.forEach((n) => {
        const geo = new THREE.SphereGeometry(30, q.glowDetail, q.glowDetail);
        const mat = new THREE.MeshBasicMaterial({
            color: n.color,
            transparent: true,
            opacity: 0.08
        });
        const cloud = new THREE.Mesh(geo, mat);
        cloud.position.set(n.x, n.y, n.z);
        cloud.scale.set(2, 1, 1.5);
        scene.add(cloud);

        if (typeof env !== 'undefined' && env.nebulas) {
            env.nebulas.push(cloud);
        }
    });
}

/**
 * Create star field - adaptive count with maintained visual quality
 */
function createStarField() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // ═══════════════════════════════════════════════════════════════════
    // WHITE STARS
    // ═══════════════════════════════════════════════════════════════════
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];

    for (let i = 0; i < q.starCount; i++) {
        starVerts.push(
            (Math.random() - 0.5) * 300,
            Math.random() * 100 + 20,
            (Math.random() - 0.5) * 300 - 50
        );
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));

    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: q.starSize,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ═══════════════════════════════════════════════════════════════════
    // COLORED STARS
    // ═══════════════════════════════════════════════════════════════════
    const coloredStarGeo = new THREE.BufferGeometry();
    const coloredVerts = [];
    const coloredColors = [];

    const colors = [
        [0, 1, 0.5],   // green
        [0, 0.5, 1],   // blue
        [1, 0.5, 0],   // orange
        [1, 0, 0.5]    // pink
    ];

    for (let i = 0; i < q.coloredStarCount; i++) {
        coloredVerts.push(
            (Math.random() - 0.5) * 280,
            Math.random() * 80 + 30,
            (Math.random() - 0.5) * 280 - 40
        );

        const c = colors[Math.floor(Math.random() * colors.length)];
        coloredColors.push(c[0], c[1], c[2]);
    }

    coloredStarGeo.setAttribute('position', new THREE.Float32BufferAttribute(coloredVerts, 3));
    coloredStarGeo.setAttribute('color', new THREE.Float32BufferAttribute(coloredColors, 3));

    const coloredStarMat = new THREE.PointsMaterial({
        size: q.coloredStarSize,
        transparent: true,
        opacity: 0.9,
        vertexColors: true,
        sizeAttenuation: true
    });

    const coloredStars = new THREE.Points(coloredStarGeo, coloredStarMat);
    scene.add(coloredStars);

    // Store references for animation
    if (typeof env !== 'undefined') {
        env.stars = stars;
        env.coloredStars = coloredStars;
    }
}

/**
 * Create glowing pillars along the path - adaptive spacing
 */
function createGlowingPillars() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    for (let z = -25; z > -200; z -= q.pillarSpacing) {
        createGlowPillar(-10, z);
        createGlowPillar(10, z);
    }
}

/**
 * Create single glowing pillar
 * @param {number} x - X position
 * @param {number} z - Z position
 */
function createGlowPillar(x, z) {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // Pillar base
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 12, q.cylinderSegments);
    const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.4,
        metalness: 0.3
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 6, z);
    scene.add(pillar);

    // Glowing orb on top
    const orbGeo = new THREE.SphereGeometry(0.45, q.glowDetail, q.glowDetail);
    const orbColor = x < 0 ? 0x00ffcc : 0xff00cc;
    const orbMat = new THREE.MeshBasicMaterial({
        color: orbColor,
        transparent: true,
        opacity: 0.9
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(x, 12.5, z);
    scene.add(orb);

    // Orb glow (skip on ultra-low - the orb itself is enough)
    if (q.enablePillarGlow) {
        const glowGeo = new THREE.SphereGeometry(0.8, q.glowDetail, q.glowDetail);
        const glowMat = new THREE.MeshBasicMaterial({
            color: orbColor,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(orb.position);
        scene.add(glow);
    }

    // Point light (skip on low-end devices)
    if (q.enablePillarLights) {
        const light = new THREE.PointLight(orbColor, 0.4, 15);
        light.position.copy(orb.position);
        scene.add(light);
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PLAYER (ELF) CREATION                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Create the elf player character
 */
function createElfPlayer() {
    const elfGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.32, 0.65, 1.9, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x2a4070,
        roughness: 0.5,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.15;
    elfGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.42, 14, 14);
    const headMat = new THREE.MeshStandardMaterial({
        color: 0xffd8b8,
        roughness: 0.55
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.5;
    elfGroup.add(head);

    // Ears (pointy elf ears)
    const earGeo = new THREE.ConeGeometry(0.1, 0.45, 6);
    const earMat = new THREE.MeshStandardMaterial({
        color: 0xffd8b8,
        roughness: 0.55
    });

    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.42, 2.68, 0);
    leftEar.rotation.z = 1.15;
    elfGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(0.42, 2.68, 0);
    rightEar.rotation.z = -1.15;
    elfGroup.add(rightEar);

    // Hair
    const hairGeo = new THREE.ConeGeometry(0.48, 1.1, 9);
    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        roughness: 0.4,
        metalness: 0.2
    });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 2.35, -0.12);
    hair.rotation.x = 0.28;
    elfGroup.add(hair);

    // Glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 2.55, 0.36);
    elfGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 2.55, 0.36);
    elfGroup.add(rightEye);

    // Amulet
    const amuletGeo = new THREE.OctahedronGeometry(0.16);
    const amuletMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.9
    });
    const amulet = new THREE.Mesh(amuletGeo, amuletMat);
    amulet.position.set(0, 1.85, 0.52);
    elfGroup.add(amulet);

    // Lights
    const eyeLight = new THREE.PointLight(0x00ffcc, 0.3, 2);
    eyeLight.position.set(0, 2.55, 0.45);
    elfGroup.add(eyeLight);

    const amuletLight = new THREE.PointLight(0x00ff88, 0.5, 3);
    amuletLight.position.set(0, 1.85, 0.52);
    elfGroup.add(amuletLight);

    // Wings
    const wingMat = new THREE.MeshBasicMaterial({
        color: 0x88ffff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
    });

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.45, 0.45, 0.75, 1.4, 0.28, 1.85);
    wingShape.bezierCurveTo(0.1, 1.4, 0.1, 0.45, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.28, 1.7, -0.28);
    leftWing.rotation.y = -0.45;
    leftWing.scale.set(0.75, 0.75, 0.75);
    elfGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.28, 1.7, -0.28);
    rightWing.rotation.y = 0.45;
    rightWing.scale.set(-0.75, 0.75, 0.75);
    elfGroup.add(rightWing);

    elfWings = { left: leftWing, right: rightWing };

    // Glow aura
    const glowGeo = new THREE.SphereGeometry(1.1, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.08
    });
    playerGlow = new THREE.Mesh(glowGeo, glowMat);
    playerGlow.position.y = 1.4;
    elfGroup.add(playerGlow);

    // Set player reference
    player = elfGroup;
    player.position.set(0, 0, 5);
    scene.add(player);

    console.log('🧝 Elf player created');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PLAYER VISUAL UPDATES                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Update player idle animations
 */
function updatePlayerAnimations() {
    if (!player) return;

    const time = Date.now();

    // Subtle sway
    player.rotation.z = Math.sin(time / 130) * 0.05;

    // Wing flapping
    if (elfWings) {
        const wingFlap = Math.sin(time / 75) * 0.28;
        elfWings.left.rotation.y = -0.45 + wingFlap;
        elfWings.right.rotation.y = 0.45 - wingFlap;
    }

    // Glow pulsing
    if (playerGlow) {
        playerGlow.material.opacity = 0.06 + Math.sin(time / 350) * 0.03;
        playerGlow.scale.setScalar(1 + Math.sin(time / 450) * 0.08);
    }

    // Shield effect when active
    if (typeof activeBoosts !== 'undefined' && activeBoosts.shield && activeBoosts.shield.active && playerGlow) {
        playerGlow.material.color.setHex(0x00ffff);
        playerGlow.material.opacity = 0.2 + Math.sin(time / 100) * 0.1;
    } else if (playerGlow) {
        playerGlow.material.color.setHex(0x00ff88);
    }

    // Invincibility blink
    if (typeof isInvincible !== 'undefined' && isInvincible) {
        const blinkRate = (typeof LIVES_CONFIG !== 'undefined') ? LIVES_CONFIG.REVIVAL_BLINK_RATE : 100;
        player.visible = Math.floor(time / blinkRate) % 2 === 0;
    } else {
        player.visible = true;
    }
}

/**
 * Reset player position and state
 */
function resetPlayerPosition() {
    if (!player) return;

    player.position.set(0, 0, 5);
    player.scale.set(1, 1, 1);
    player.rotation.set(0, 0, 0);
    player.visible = true;

    if (typeof currentLane !== 'undefined') currentLane = 1;
    if (typeof targetLaneX !== 'undefined') targetLaneX = 0;
    if (typeof isJumping !== 'undefined') isJumping = false;
    if (typeof isSliding !== 'undefined') isSliding = false;
    if (typeof jumpVelocity !== 'undefined') jumpVelocity = 0;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ENVIRONMENT ANIMATIONS                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Update environment animations (planets, nebulas, stars)
 */
function updateEnvironmentAnimations() {
    if (typeof env === 'undefined' || !env) return;
    if (typeof deltaTime === 'undefined') return;

    const t = performance.now() * 0.001;

    // Planets: rotate + float
    if (env.planets) {
        env.planets.forEach((p, i) => {
            if (!p) return;
            p.rotation.y += (0.002 + i * 0.0005) * deltaTime;
            p.rotation.x += 0.0008 * deltaTime;
            p.position.y += Math.sin(t + i) * 0.01;
        });
    }

    // Rings: slow spin
    if (env.rings) {
        env.rings.forEach((r, i) => {
            if (!r) return;
            r.rotation.z += (0.0015 + i * 0.0003) * deltaTime;
        });
    }

    // Nebulas: opacity breathing + slow rotation
    if (env.nebulas) {
        env.nebulas.forEach((n, i) => {
            if (!n || !n.material) return;
            n.material.opacity = 0.06 + (Math.sin(t * 0.6 + i) * 0.02);
            n.rotation.y += 0.0005 * deltaTime;
        });
    }

    // Starfields: rotate slowly
    if (env.stars) env.stars.rotation.y += 0.0004 * deltaTime;
    if (env.coloredStars) env.coloredStars.rotation.y -= 0.0003 * deltaTime;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  UTILITY FUNCTIONS                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Get element by ID (helper)
 * @param {string} id - Element ID
 * @returns {HTMLElement} Element
 */
function getEl(id) {
    return document.getElementById(id);
}

/**
 * Clean up Three.js resources (for memory management)
 */
function cleanupThreeJS() {
    if (scene) {
        // Dispose geometries and materials
        scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        // Clear scene
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    if (renderer) {
        renderer.dispose();
    }

    console.log('🧹 Three.js resources cleaned up');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPORTS / GLOBAL ACCESS                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

// Make key functions available globally (if using modules, export these instead)
window.initThreeJS = initThreeJS;
window.createEnvironment = createEnvironment;
window.createElfPlayer = createElfPlayer;
window.updatePlayerAnimations = updatePlayerAnimations;
window.updateEnvironmentAnimations = updateEnvironmentAnimations;
window.resetPlayerPosition = resetPlayerPosition;
window.handleResize = handleResize;
window.cleanupThreeJS = cleanupThreeJS;

// FPS system
window.checkFrameTiming = checkFrameTiming;
window.getCurrentFPS = getCurrentFPS;
window.getDeviceProfile = getDeviceProfile;


console.log('✅ 04-three-setup.js loaded (fully optimized)');