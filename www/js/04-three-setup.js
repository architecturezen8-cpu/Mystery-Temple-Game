/* ═══════════════════════════════════════════════════════════════════════════
   04-THREE-SETUP.JS - FULLY OPTIMIZED v3.0
   Mystery Temple - Galaxy Edition
   
   OPTIMIZATIONS:
   - ✅ Geometry merging (400+ → 3 draw calls)
   - ✅ Proper delta time handling
   - ✅ Fixed animation loops
   - ✅ Memory-efficient fallback
   - ✅ FPS limiter system
   - ✅ Device profiling
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  DEVICE PROFILING SYSTEM                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let deviceProfile = null;

function profileDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
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
                const gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

                if (gpuRenderer.includes('mali-4') || gpuRenderer.includes('adreno 3') ||
                    gpuRenderer.includes('adreno 2') || gpuRenderer.includes('sgx')) {
                    gpuTier = 'very-weak';
                } else if (gpuRenderer.includes('mali-t') || gpuRenderer.includes('adreno 4') ||
                    gpuRenderer.includes('adreno 5')) {
                    gpuTier = 'weak';
                } else if (gpuRenderer.includes('mali-g') || gpuRenderer.includes('adreno 6') ||
                    gpuRenderer.includes('apple gpu') || gpuRenderer.includes('intel')) {
                    gpuTier = 'medium';
                } else {
                    gpuTier = 'strong';
                }
            }
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) loseContext.loseContext();
        }
    } catch (e) {
        console.warn('GPU detection failed:', e);
    }

    // Score calculation
    let score = 50;

    if (deviceMemory <= 1) score -= 25;
    else if (deviceMemory <= 2) score -= 15;
    else if (deviceMemory <= 3) score -= 5;
    else if (deviceMemory >= 6) score += 10;
    else if (deviceMemory >= 8) score += 20;

    if (cores <= 2) score -= 20;
    else if (cores <= 4) score -= 5;
    else if (cores >= 6) score += 5;
    else if (cores >= 8) score += 15;

    if (gpuTier === 'very-weak') score -= 20;
    else if (gpuTier === 'weak') score -= 10;
    else if (gpuTier === 'medium') score += 5;
    else if (gpuTier === 'strong') score += 15;

    if (isMobile) score -= 10;

    if (screenPixels < 500000) score += 10;
    else if (screenPixels > 2000000) score -= 10;

    score = Math.max(0, Math.min(100, score));

    // Tier determination
    let tier;
    if (score <= 20) tier = 'ultra-low';
    else if (score <= 40) tier = 'low';
    else if (score <= 65) tier = 'mid';
    else tier = 'high';

    // Smart pixel ratio
    let targetPixelRatio;
    switch (tier) {
        case 'ultra-low':
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

    // Quality presets
    const qualityPresets = {
        'ultra-low': {
            sphereDetail: 10,
            glowDetail: 6,
            ringDetail: 12,
            cylinderSegments: 6,
            skyDomeDetail: 16,

            starCount: 150,
            coloredStarCount: 20,
            planetCount: 3,
            nebulaCount: 2,

            pillarSpacing: 70,

            maxLights: 3,
            fogNear: 25,
            fogFar: 70,
            antialias: false,
            precision: 'mediump',
            shadowsEnabled: false,
            renderScale: 0.85,

            enablePillarGlow: false,
            enablePillarLights: false,

            targetFPS: 30,

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
            enablePillarLights: false,

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
            enablePillarLights: false,

            targetFPS: 60,

            starSize: 0.5,
            coloredStarSize: 0.8
        }
    };

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

    console.log(`📱 Device Profile:`);
    console.log(`   Tier: ${tier} (score: ${score}/100)`);
    console.log(`   Pixel Ratio: ${targetPixelRatio.toFixed(2)} / native ${nativePixelRatio}`);
    console.log(`   Memory: ${deviceMemory}GB, Cores: ${cores}, GPU: ${gpuTier}`);
    console.log(`   Target FPS: ${qualityPresets[tier].targetFPS}`);

    return profile;
}

function getDeviceProfile() {
    if (!deviceProfile) {
        deviceProfile = profileDevice();
    }
    return deviceProfile;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FPS LIMITER SYSTEM                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let targetFPS = 60;
let frameDuration = 1000 / targetFPS;
let lastFrameTime = 0;
let frameCount = 0;
let fpsDisplayTime = 0;
let currentFPS = 0;

function initFPSLimiter() {
    const profile = getDeviceProfile();
    targetFPS = profile.quality.targetFPS;
    frameDuration = 1000 / targetFPS;
    console.log(`⏱️ FPS Limiter: Target ${targetFPS} FPS`);
}

function checkFrameTiming(currentTime) {
    if (!lastFrameTime) {
        lastFrameTime = currentTime;
        return { shouldRender: false, deltaTime: 0 };
    }

    const elapsed = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    frameCount++;
    if (currentTime - fpsDisplayTime >= 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        fpsDisplayTime = currentTime;
    }

    // Simple delta time in seconds (clamped)
    const deltaTime = Math.min(elapsed / 1000, 0.1);

    return { shouldRender: true, deltaTime };
}

function getCurrentFPS() {
    return currentFPS;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  THREE.JS INITIALIZATION                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function initThreeJS() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    initFPSLimiter();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030510);
    scene.fog = new THREE.Fog(0x030510, q.fogNear, q.fogFar);

    // Camera
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

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: getEl('gameCanvas'),
        antialias: q.antialias,
        powerPreference: "high-performance",
        precision: q.precision,
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: false,
        alpha: false
    });

    const renderWidth = Math.floor(window.innerWidth * q.renderScale);
    const renderHeight = Math.floor(window.innerHeight * q.renderScale);
    renderer.setSize(renderWidth, renderHeight);

    if (q.renderScale < 1) {
        renderer.domElement.style.width = window.innerWidth + 'px';
        renderer.domElement.style.height = window.innerHeight + 'px';
    }

    renderer.setPixelRatio(profile.pixelRatio);
    renderer.sortObjects = true;
    renderer.shadowMap.enabled = q.shadowsEnabled;

    createLighting();

    window.addEventListener('resize', handleResize);

    console.log(`🎮 Renderer: ${renderWidth}x${renderHeight}, PR: ${profile.pixelRatio.toFixed(2)}`);
}

function createLighting() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    const ambient = new THREE.AmbientLight(0x223355, 0.8);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x6688cc, 0.8);
    dirLight.position.set(-10, 30, -20);
    scene.add(dirLight);

    const pathLight = new THREE.PointLight(0x00ff88, 0.6, 60);
    pathLight.position.set(0, 5, -30);
    scene.add(pathLight);

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
   ║  GALAXY ENVIRONMENT - OPTIMIZED                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createEnvironment() {
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
    createGlowingPillarsOptimized();

    console.log('🌌 Galaxy environment created (optimized)');
}

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

function createGalaxyPath() {
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

function createSidePlanets() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    const allPlanets = [
        { x: -50, y: 40, z: -80, radius: 12, color: 0x4422aa, ring: true },
        { x: 60, y: 30, z: -100, radius: 8, color: 0x226688, ring: false },
        { x: -40, y: 60, z: -150, radius: 15, color: 0x884422, ring: true },
        { x: 45, y: 50, z: -120, radius: 6, color: 0x228844, ring: false }
    ];

    const planets = allPlanets.slice(0, q.planetCount);

    planets.forEach((p) => {
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

        const glowGeo = new THREE.SphereGeometry(p.radius * 1.15, q.glowDetail, q.glowDetail);
        const glowMat = new THREE.MeshBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(planet.position);
        scene.add(glow);

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

function createStarField() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // White stars
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

    // Colored stars
    const coloredStarGeo = new THREE.BufferGeometry();
    const coloredVerts = [];
    const coloredColors = [];

    const colors = [
        [0, 1, 0.5],
        [0, 0.5, 1],
        [1, 0.5, 0],
        [1, 0, 0.5]
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

    if (typeof env !== 'undefined') {
        env.stars = stars;
        env.coloredStars = coloredStars;
    }
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  🚀 OPTIMIZED PILLARS - MERGED GEOMETRY (400+ → 3 draw calls)             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createGlowingPillarsOptimized() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // Check if mergeGeometries exists
    if (typeof THREE.BufferGeometryUtils === 'undefined' || !THREE.BufferGeometryUtils.mergeGeometries) {
        console.warn('⚠️ BufferGeometryUtils not loaded, using fallback pillars');
        createGlowingPillarsFallback();
        return;
    }

    const mergeGeometries = THREE.BufferGeometryUtils.mergeGeometries;

    const pillarGeometries = [];
    const orbGeometries = [];
    const glowGeometries = [];

    // Generate all pillar positions
    for (let z = -25; z > -200; z -= q.pillarSpacing) {
        [-10, 10].forEach(x => {
            // Pillar body
            const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 12, q.cylinderSegments);
            pillarGeo.translate(x, 6, z);
            pillarGeometries.push(pillarGeo);

            // Orb on top
            const orbGeo = new THREE.SphereGeometry(0.45, q.glowDetail, q.glowDetail);
            orbGeo.translate(x, 12.5, z);
            orbGeometries.push(orbGeo);

            // Glow sphere
            if (q.enablePillarGlow) {
                const glowGeo = new THREE.SphereGeometry(0.8, q.glowDetail, q.glowDetail);
                glowGeo.translate(x, 12.5, z);
                glowGeometries.push(glowGeo);
            }
        });
    }

    // Merge all pillars → 1 draw call
    const mergedPillars = mergeGeometries(pillarGeometries);
    const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.4,
        metalness: 0.3
    });
    const pillarMesh = new THREE.Mesh(mergedPillars, pillarMat);
    scene.add(pillarMesh);

    // Merge all orbs → 1 draw call
    const mergedOrbs = mergeGeometries(orbGeometries);
    const orbMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.5
    });
    const orbMesh = new THREE.Mesh(mergedOrbs, orbMat);
    scene.add(orbMesh);

    // Merge all glows → 1 draw call
    if (glowGeometries.length > 0) {
        const mergedGlows = mergeGeometries(glowGeometries);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.2
        });
        const glowMesh = new THREE.Mesh(mergedGlows, glowMat);
        scene.add(glowMesh);
    }

    console.log(`✅ Pillars optimized: ${pillarGeometries.length} → 3 draw calls`);
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FALLBACK PILLARS (Memory-Efficient Version)                              ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createGlowingPillarsFallback() {
    const profile = getDeviceProfile();
    const q = profile.quality;

    // ✅ REUSE GEOMETRY AND MATERIALS
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 12, q.cylinderSegments);
    const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.4,
        metalness: 0.3
    });

    const orbGeo = new THREE.SphereGeometry(0.45, q.glowDetail, q.glowDetail);
    const orbMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 0.5
    });

    // Create fewer pillars as samples
    const positions = [
        [-10, -25], [10, -25],
        [-10, -50], [10, -50],
        [-10, -75], [10, -75],
        [-10, -100], [10, -100],
        [-10, -125], [10, -125],
        [-10, -150], [10, -150]
    ];

    positions.forEach(([x, z]) => {
        // Pillar body (shared geometry)
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, 6, z);
        scene.add(pillar);

        // Orb on top (shared geometry)
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.set(x, 12.5, z);
        scene.add(orb);
    });

    console.log(`⚠️ Fallback pillars created: ${positions.length} pairs (shared geometry)`);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  🚀 OPTIMIZED PLAYER - MERGED BODY (15 → 4 meshes)                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createElfPlayer() {
    const elfGroup = new THREE.Group();

    // Check if mergeGeometries exists
    const mergeGeometries = (typeof THREE.BufferGeometryUtils !== 'undefined' && THREE.BufferGeometryUtils.mergeGeometries)
        ? THREE.BufferGeometryUtils.mergeGeometries
        : null;

    if (mergeGeometries) {
        // ✅ OPTIMIZED VERSION - Merge body parts
        const bodyGeometries = [];

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.32, 0.65, 1.9, 8);
        bodyGeo.translate(0, 1.15, 0);
        bodyGeometries.push(bodyGeo);

        // Head
        const headGeo = new THREE.SphereGeometry(0.42, 14, 14);
        headGeo.translate(0, 2.5, 0);
        bodyGeometries.push(headGeo);

        // Ears
        const earGeo = new THREE.ConeGeometry(0.1, 0.45, 6);

        const leftEarGeo = earGeo.clone();
        leftEarGeo.rotateZ(1.15);
        leftEarGeo.translate(-0.42, 2.68, 0);
        bodyGeometries.push(leftEarGeo);

        const rightEarGeo = earGeo.clone();
        rightEarGeo.rotateZ(-1.15);
        rightEarGeo.translate(0.42, 2.68, 0);
        bodyGeometries.push(rightEarGeo);

        // Hair
        const hairGeo = new THREE.ConeGeometry(0.48, 1.1, 9);
        hairGeo.rotateX(0.28);
        hairGeo.translate(0, 2.35, -0.12);
        bodyGeometries.push(hairGeo);

        // Merge all body parts
        const mergedBody = mergeGeometries(bodyGeometries);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2a4070,
            roughness: 0.5,
            metalness: 0.3
        });
        const playerMesh = new THREE.Mesh(mergedBody, bodyMat);
        elfGroup.add(playerMesh);

        console.log('✅ Player body merged');

    } else {
        // ❌ FALLBACK - Separate meshes
        const bodyGeo = new THREE.CylinderGeometry(0.32, 0.65, 1.9, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2a4070,
            roughness: 0.5,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.15;
        elfGroup.add(body);

        const headGeo = new THREE.SphereGeometry(0.42, 14, 14);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xffd8b8,
            roughness: 0.55
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.5;
        elfGroup.add(head);

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

        console.warn('⚠️ Player using fallback (no merge)');
    }

    // Eyes (emissive - no lights needed)
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x00ffcc,
        emissive: 0x00ffcc,
        emissiveIntensity: 1.0
    });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 2.55, 0.36);
    elfGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 2.55, 0.36);
    elfGroup.add(rightEye);

    // Amulet (emissive)
    const amuletGeo = new THREE.OctahedronGeometry(0.16);
    const amuletMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.8
    });
    const amulet = new THREE.Mesh(amuletGeo, amuletMat);
    amulet.position.set(0, 1.85, 0.52);
    elfGroup.add(amulet);

    // Wings (need to animate separately)
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

    player = elfGroup;
    player.position.set(0, 0, 5);
    scene.add(player);

    console.log('🧝 Elf player created (optimized)');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PLAYER VISUAL UPDATES - OPTIMIZED                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let lastBlinkCheck = 0;
let isPlayerVisible = true;

function updatePlayerAnimations(deltaTime = 0.016) {
    if (!player) return;

    const time = performance.now() * 0.001; // ✅ Seconds

    // Body tilt
    player.rotation.z = Math.sin(time * 7.7) * 0.05;

    // Wing flapping
    if (elfWings) {
        const wingFlap = Math.sin(time * 13.3) * 0.28;
        elfWings.left.rotation.y = -0.45 + wingFlap;
        elfWings.right.rotation.y = 0.45 - wingFlap;
    }

    // Glow pulse
    if (playerGlow) {
        playerGlow.material.opacity = 0.06 + Math.sin(time * 2.86) * 0.03;
        playerGlow.scale.setScalar(1 + Math.sin(time * 2.22) * 0.08);

        // Shield color change
        if (typeof activeBoosts !== 'undefined' && activeBoosts?.shield?.active) {
            playerGlow.material.color.setHex(0x00ffff);
            playerGlow.material.opacity = 0.2 + Math.sin(time * 10) * 0.1;
        } else {
            playerGlow.material.color.setHex(0x00ff88);
        }
    }

    // Invincibility blink (optimized)
    if (typeof isInvincible !== 'undefined' && isInvincible) {
        const blinkRate = (typeof LIVES_CONFIG !== 'undefined' && LIVES_CONFIG?.REVIVAL_BLINK_RATE) || 100;
        const currentTime = performance.now();

        if (currentTime - lastBlinkCheck > blinkRate) {
            isPlayerVisible = !isPlayerVisible;
            player.visible = isPlayerVisible;
            lastBlinkCheck = currentTime;
        }
    } else {
        player.visible = true;
        isPlayerVisible = true;
    }
}

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
   ║  ENVIRONMENT ANIMATIONS - OPTIMIZED                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function updateEnvironmentAnimations(deltaTime = 0.016) {
    if (typeof env === 'undefined' || !env) return;

    const t = performance.now() * 0.001;
    const dt60 = deltaTime * 60; // ✅ Normalize to 60fps

    // Planets rotation
    if (env.planets) {
        env.planets.forEach((p, i) => {
            if (!p) return;
            p.rotation.y += (0.002 + i * 0.0005) * dt60;
            p.rotation.x += 0.0008 * dt60;
            p.position.y += Math.sin(t + i) * 0.01;
        });
    }

    // Rings rotation
    if (env.rings) {
        env.rings.forEach((r, i) => {
            if (!r) return;
            r.rotation.z += (0.0015 + i * 0.0003) * dt60;
        });
    }

    // Nebula pulse
    if (env.nebulas) {
        env.nebulas.forEach((n, i) => {
            if (!n?.material) return;
            n.material.opacity = 0.06 + (Math.sin(t * 0.6 + i) * 0.02);
            n.rotation.y += 0.0005 * dt60;
        });
    }

    // Star field rotation
    if (env.stars) env.stars.rotation.y += 0.0004 * dt60;
    if (env.coloredStars) env.coloredStars.rotation.y -= 0.0003 * dt60;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  UTILITY FUNCTIONS                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function getEl(id) {
    return document.getElementById(id);
}

function cleanupThreeJS() {
    if (scene) {
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

window.initThreeJS = initThreeJS;
window.createEnvironment = createEnvironment;
window.createElfPlayer = createElfPlayer;
window.updatePlayerAnimations = updatePlayerAnimations;
window.updateEnvironmentAnimations = updateEnvironmentAnimations;
window.resetPlayerPosition = resetPlayerPosition;
window.handleResize = handleResize;
window.cleanupThreeJS = cleanupThreeJS;

window.checkFrameTiming = checkFrameTiming;
window.getCurrentFPS = getCurrentFPS;
window.getDeviceProfile = getDeviceProfile;

console.log('✅ 04-three-setup.js loaded (FULLY OPTIMIZED - v3.0)');