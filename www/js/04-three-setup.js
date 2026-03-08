/* ═══════════════════════════════════════════════════════════════════════════
   04-THREE-SETUP.JS
   Mystery Temple - Galaxy Edition
   
   Three.js initialization, scene, camera, environment, and player.
   Galaxy runner visual style.
   OPTIMIZED FOR MOBILE - Reduced geometry complexity
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  THREE.JS INITIALIZATION                                                  ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Initialize Three.js scene, camera, renderer
 */
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030510);
    scene.fog = new THREE.Fog(0x030510, 30, 100);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        200
    );
    camera.position.set(0, 6.5, 13);
    camera.lookAt(0, 2, -8);
    
    // Detect mobile for renderer optimization
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    
    // Create renderer with mobile optimizations
    renderer = new THREE.WebGLRenderer({
        canvas: getEl('gameCanvas'),
        antialias: window.__FORCE_NO_ANTIALIAS__ ? false : (!isMobileDevice && !isLowEnd),
        powerPreference: "high-performance",
        precision: isMobileDevice ? "mediump" : "highp",
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Pixel ratio optimization for mobile
    const perf = window.PERFORMANCE_PROFILE || {};
    let maxPR = window.__PIXEL_RATIO_MAX__;
    
    if (!maxPR) {
        if (isMobileDevice) {
            maxPR = 1; // Force 1x on mobile for performance
        } else {
            maxPR = perf.maxPixelRatio || (isLowEnd ? 1.5 : 2);
        }
    }
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPR));
    
    // Mobile-specific renderer optimizations
    if (isMobileDevice) {
        renderer.setClearColor(0x030510, 1);
        renderer.sortObjects = true;
        renderer.maxMorphTargets = 0;
        renderer.maxLights = 4; // Limit lights on mobile
    }
    
    // Add lights
    createLighting();
    
    // Handle resize
    window.addEventListener('resize', handleResize);
}

/**
 * Create scene lighting
 */
function createLighting() {
    // Ambient light - purple/blue galaxy tint
    const ambient = new THREE.AmbientLight(0x223355, 0.8);
    scene.add(ambient);
    
    // Main directional light
    const dirLight = new THREE.DirectionalLight(0x6688cc, 0.8);
    dirLight.position.set(-10, 30, -20);
    scene.add(dirLight);
    
    // Green accent light (from path)
    const pathLight = new THREE.PointLight(0x00ff88, 0.6, 60);
    pathLight.position.set(0, 5, -30);
    scene.add(pathLight);
    
    // Purple nebula light
    const nebulaLight = new THREE.PointLight(0x8844ff, 0.4, 80);
    nebulaLight.position.set(-30, 20, -50);
    scene.add(nebulaLight);
    
    // Blue distant light
    const blueLight = new THREE.PointLight(0x0088ff, 0.3, 100);
    blueLight.position.set(40, 15, -70);
    scene.add(blueLight);
}

/**
 * Handle window resize
 */
function handleResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Detect mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    
    const perf = window.PERFORMANCE_PROFILE || {};
    let maxPR = window.__PIXEL_RATIO_MAX__;
    
    if (!maxPR) {
        if (isMobileDevice) {
            maxPR = 1;
        } else {
            maxPR = perf.maxPixelRatio || (isLowEnd ? 1.5 : 2);
        }
    }
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPR));
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GALAXY ENVIRONMENT                                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Create full galaxy environment
 */
/* ====== BEGIN REPLACE: createEnvironment ====== */
function createEnvironment() {
    // Clear env references (avoid duplicates if environment ever recreated)
    if (typeof env !== 'undefined') {
        env.planets.length = 0;
        env.rings.length = 0;
        env.nebulas.length = 0;
        env.stars = null;
        env.coloredStars = null;
    }

    createSkyDome();
    createGalaxyPath();
    createSidePlanets();
    createNebulaClouds();
    createStarField();
    createGlowingPillars();
}
/* ====== END REPLACE: createEnvironment ====== */

/**
 * Create sky dome with galaxy texture
 */
function createSkyDome() {
    const skyGeo = new THREE.SphereGeometry(180, 32, 32);
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
    // Main ground - darker with subtle glow
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
 * Create decorative planets on sides
 */
/* ====== BEGIN REPLACE: createSidePlanets ====== */
function createSidePlanets() {
    // Detect mobile for reduced geometry
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    const detailLevel = isMobileDevice ? 12 : 24; // Lower detail on mobile
    const glowDetail = isMobileDevice ? 8 : 16;
    
    const planets = [
        { x: -50, y: 40, z: -80,  radius: 12, color: 0x4422aa, ring: true },
        { x:  60, y: 30, z: -100, radius: 8,  color: 0x226688, ring: false },
        { x: -40, y: 60, z: -150, radius: 15, color: 0x884422, ring: true },
        { x:  45, y: 50, z: -120, radius: 6,  color: 0x228844, ring: false }
    ];

    planets.forEach((p) => {
        // Planet body - reduced segments on mobile
        const geo = new THREE.SphereGeometry(p.radius, detailLevel, detailLevel);
        const mat = new THREE.MeshStandardMaterial({
            color: p.color,
            roughness: 0.85,
            metalness: 0.05
        });
        const planet = new THREE.Mesh(geo, mat);
        planet.position.set(p.x, p.y, p.z);
        scene.add(planet);

        // Store for animation
        if (typeof env !== 'undefined') env.planets.push(planet);

        // Glow - reduced segments on mobile
        const glowGeo = new THREE.SphereGeometry(p.radius * 1.15, glowDetail, glowDetail);
        const glowMat = new THREE.MeshBasicMaterial({
            color: p.color,
            transparent: true,
            opacity: 0.15
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(planet.position);
        scene.add(glow);

        // Ring
        if (p.ring) {
            const ringDetail = isMobileDevice ? 16 : 32;
            const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2, ringDetail);
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

            // Store ring for animation
            if (typeof env !== 'undefined') env.rings.push(ring);
        }
    });
}
/* ====== END REPLACE: createSidePlanets ====== */

/**
 * Create nebula cloud effects
 */
/* ====== BEGIN REPLACE: createNebulaClouds ====== */
function createNebulaClouds() {
    // Detect mobile for reduced geometry
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    const detailLevel = isMobileDevice ? 8 : 16;
    
    const nebulaPositions = [
        { x: -80, y: 50, z: -120, color: 0xff0066 },
        { x:  70, y: 60, z: -140, color: 0x0066ff },
        { x:   0, y: 80, z: -180, color: 0x8800ff }
    ];

    nebulaPositions.forEach((n) => {
        const geo = new THREE.SphereGeometry(30, detailLevel, detailLevel);
        const mat = new THREE.MeshBasicMaterial({
            color: n.color,
            transparent: true,
            opacity: 0.08
        });
        const cloud = new THREE.Mesh(geo, mat);
        cloud.position.set(n.x, n.y, n.z);
        cloud.scale.set(2, 1, 1.5);
        scene.add(cloud);

        // Store for animation
        if (typeof env !== 'undefined') env.nebulas.push(cloud);
    });
}
/* ====== END REPLACE: createNebulaClouds ====== */

/**
 * Create star field
 */
/* ====== BEGIN REPLACE: createStarField ====== */
function createStarField() {
    const perf = window.PERFORMANCE_PROFILE || {};
    
    // Detect mobile for reduced star count
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                          window.innerWidth <= 768;
    
    // Aggressive reduction on mobile
    let starCount;
    if (isMobileDevice) {
        starCount = 200; // Half on mobile
    } else if (perf.isTablet) {
        starCount = 400;
    } else if (isLowEnd) {
        starCount = 350;
    } else {
        starCount = 500;
    }

    // White stars
    const starGeo = new THREE.BufferGeometry();
    const starVerts = [];

    for (let i = 0; i < starCount; i++) {
        starVerts.push(
            (Math.random() - 0.5) * 300,
            Math.random() * 100 + 20,
            (Math.random() - 0.5) * 300 - 50
        );
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));

    const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: isMobileDevice ? 0.4 : 0.5,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Colored stars - also reduced on mobile
    let coloredStarCount;
    if (isMobileDevice) {
        coloredStarCount = 30;
    } else if (perf.isTablet) {
        coloredStarCount = 65;
    } else if (isLowEnd) {
        coloredStarCount = 50;
    } else {
        coloredStarCount = 80;
    }
    
    const coloredStarGeo = new THREE.BufferGeometry();
    const coloredVerts = [];
    const coloredColors = [];

    const colors = [
        [0, 1, 0.5],   // green
        [0, 0.5, 1],   // blue
        [1, 0.5, 0],   // orange
        [1, 0, 0.5]    // pink
    ];

    for (let i = 0; i < coloredStarCount; i++) {
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
        size: isMobileDevice ? 0.6 : 0.8,
        transparent: true,
        opacity: 0.9,
        vertexColors: true
    });

    const coloredStars = new THREE.Points(coloredStarGeo, coloredStarMat);
    scene.add(coloredStars);

    // Store references for animation
    if (typeof env !== 'undefined') {
        env.stars = stars;
        env.coloredStars = coloredStars;
    }
}
/* ====== END REPLACE: createStarField ====== */

/**
 * Create glowing pillars along the path
 */
function createGlowingPillars() {
    for (let z = -25; z > -200; z -= 35) {
        createGlowPillar(-10, z);
        createGlowPillar(10, z);
    }
}

/**
 * Create single glowing pillar
 * @param {number} x 
 * @param {number} z 
 */
function createGlowPillar(x, z) {
    // Pillar base
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 12, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.4,
        metalness: 0.3
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 6, z);
    scene.add(pillar);
    
    // Glowing orb on top
    const orbGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const orbColor = x < 0 ? 0x00ffcc : 0xff00cc;
    const orbMat = new THREE.MeshBasicMaterial({
        color: orbColor,
        transparent: true,
        opacity: 0.9
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(x, 12.5, z);
    scene.add(orb);
    
    // Orb glow
    const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: orbColor,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(orb.position);
    scene.add(glow);
    
    // Point light
    const light = new THREE.PointLight(orbColor, 0.4, 15);
    light.position.copy(orb.position);
    scene.add(light);
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
    if (activeBoosts.shield.active && playerGlow) {
        playerGlow.material.color.setHex(0x00ffff);
        playerGlow.material.opacity = 0.2 + Math.sin(time / 100) * 0.1;
    } else if (playerGlow) {
        playerGlow.material.color.setHex(0x00ff88);
    }
    
    // Invincibility blink
    if (isInvincible) {
        player.visible = Math.floor(time / LIVES_CONFIG.REVIVAL_BLINK_RATE) % 2 === 0;
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
    
    currentLane = 1;
    targetLaneX = 0;
    isJumping = false;
    isSliding = false;
    jumpVelocity = 0;
}


/* ====== BEGIN ADD: updateEnvironmentAnimations ====== */
function updateEnvironmentAnimations() {
    if (typeof env === 'undefined' || !env) return;

    const t = performance.now() * 0.001;

    // Planets: rotate + float
    env.planets.forEach((p, i) => {
        if (!p) return;
        p.rotation.y += (0.002 + i * 0.0005) * deltaTime;
        p.rotation.x += 0.0008 * deltaTime;
        p.position.y += Math.sin(t + i) * 0.01;
    });

    // Rings: slow spin
    env.rings.forEach((r, i) => {
        if (!r) return;
        r.rotation.z += (0.0015 + i * 0.0003) * deltaTime;
    });

    // Nebulas: opacity breathing + slow rotation
    env.nebulas.forEach((n, i) => {
        if (!n || !n.material) return;
        n.material.opacity = 0.06 + (Math.sin(t * 0.6 + i) * 0.02);
        n.rotation.y += 0.0005 * deltaTime;
    });

    // Starfields: rotate slowly
    if (env.stars) env.stars.rotation.y += 0.0004 * deltaTime;
    if (env.coloredStars) env.coloredStars.rotation.y -= 0.0003 * deltaTime;
}
/* ====== END ADD: updateEnvironmentAnimations ====== */

console.log('✅ 04-three-setup.js loaded');
