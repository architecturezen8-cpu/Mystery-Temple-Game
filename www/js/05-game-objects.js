/* ═══════════════════════════════════════════════════════════════════════════
   05-GAME-OBJECTS.JS - OPTIMIZED v2.0
   Mystery Temple - Galaxy Edition

   OPTIMIZATIONS:
   - ✅ Shared geometry & materials (reused)
   - ✅ NO PointLights on collectibles (use emissive instead)
   - ✅ Cached boost icon textures
   - ✅ reset3DObjects() function added
   - ✅ Proper cleanup
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  SHARED GEOMETRIES & MATERIALS (Reused for all objects)                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const SharedGeometry = {
    // Gems
    gemCore: null,
    gemGlow: null,

    // Obstacles
    block: null,
    barrier: null,

    // Boosts
    boostCore: null,
    boostGlow: null,

    // Letters
    letterBox: null,
    letterGlow: null,

    // Initialize (call once)
    init: function () {
        if (this.gemCore) return; // Already initialized

        // Gem geometries
        this.gemCore = new THREE.OctahedronGeometry(0.4);
        this.gemGlow = new THREE.SphereGeometry(0.6, 8, 8);

        // Obstacle geometries
        this.block = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        this.barrier = new THREE.BoxGeometry(2.6, 1, 0.4);

        // Boost geometries
        this.boostCore = new THREE.SphereGeometry(0.5, 12, 12);
        this.boostGlow = new THREE.SphereGeometry(0.9, 8, 8);

        // Letter geometries
        this.letterBox = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.letterGlow = new THREE.SphereGeometry(1.0, 8, 8);

        console.log('✅ Shared geometries initialized');
    }
};

const SharedMaterials = {
    // Gems
    blueGemCore: null,
    blueGemGlow: null,
    greenGemCore: null,
    greenGemGlow: null,
    redGemCore: null,
    redGemGlow: null,

    // Obstacles
    blockMat: null,
    barrierMat: null,

    // Letters
    letterCore: null,
    letterGlow: null,

    // Initialize (call once)
    init: function () {
        if (this.blueGemCore) return; // Already initialized

        // Blue gem
        this.blueGemCore = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            emissive: 0x0066cc,
            emissiveIntensity: 0.8, // ✅ Higher emissive = no PointLight needed
            roughness: 0.3,
            metalness: 0.5
        });
        this.blueGemGlow = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.25
        });

        // Green gem
        this.greenGemCore = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00cc66,
            emissiveIntensity: 0.9,
            roughness: 0.3,
            metalness: 0.5
        });
        this.greenGemGlow = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.3
        });

        // Red gem
        this.redGemCore = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            emissive: 0xcc2222,
            emissiveIntensity: 1.0,
            roughness: 0.3,
            metalness: 0.5
        });
        this.redGemGlow = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.35
        });

        // Obstacles
        this.blockMat = new THREE.MeshStandardMaterial({
            color: 0x8844aa,
            transparent: true,
            opacity: 0.85,
            roughness: 0.4,
            metalness: 0.3
        });
        this.barrierMat = new THREE.MeshStandardMaterial({
            color: 0x446688,
            roughness: 0.7
        });

        // Letters
        this.letterCore = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.9,
            roughness: 0.3,
            metalness: 0.5
        });
        this.letterGlow = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.35
        });

        console.log('✅ Shared materials initialized');
    }
};

// Boost icon texture cache
const BoostTextureCache = {};

function getBoostIconTexture(icon, color) {
    const key = `${icon}_${color}`;

    if (BoostTextureCache[key]) {
        return BoostTextureCache[key];
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64; // Smaller = faster
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 64, 64);
    ctx.font = '40px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(icon, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    BoostTextureCache[key] = texture;

    return texture;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  INITIALIZE SHARED RESOURCES                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function initGameObjects() {
    SharedGeometry.init();
    SharedMaterials.init();
    console.log('✅ Game objects system initialized');
}

// Auto-init when Three.js is ready
if (typeof THREE !== 'undefined') {
    initGameObjects();
} else {
    window.addEventListener('load', initGameObjects);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE OBSTACLE                                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createObstacle() {
    if (typeof QUALITY === 'undefined' || obstacles.length >= QUALITY.maxObstacles) return;

    SharedGeometry.init();
    SharedMaterials.init();

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const isBlock = Math.random() < 0.65;
    let obstacle;

    if (isBlock) {
        obstacle = new THREE.Mesh(SharedGeometry.block, SharedMaterials.blockMat);
        obstacle.position.y = 0.75;
        obstacle.userData = { type: 'block', height: 1.5 };
    } else {
        obstacle = new THREE.Mesh(SharedGeometry.barrier, SharedMaterials.barrierMat);
        obstacle.position.y = 2.6;
        obstacle.userData = { type: 'barrier', height: 3.6 };
    }

    obstacle.position.x = laneX;
    obstacle.position.z = -80;

    scene.add(obstacle);
    obstacles.push(obstacle);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE BLUE GEM (No PointLight - uses emissive)                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createGem() {
    if (typeof QUALITY === 'undefined' || gems.length >= QUALITY.maxGems) return;

    SharedGeometry.init();
    SharedMaterials.init();

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const group = new THREE.Group();

    // Core (shared geometry & material)
    const core = new THREE.Mesh(SharedGeometry.gemCore, SharedMaterials.blueGemCore);
    group.add(core);

    // Glow (shared)
    const glow = new THREE.Mesh(SharedGeometry.gemGlow, SharedMaterials.blueGemGlow);
    group.add(glow);

    // ✅ NO PointLight - emissive material provides glow!

    group.position.set(laneX, 1.0, -80);
    group.userData = {
        collected: false,
        type: 'blue',
        baseValue: 50
    };

    scene.add(group);
    gems.push(group);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE GREEN GEM                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createGreenGem() {
    if (typeof QUALITY === 'undefined' || greenGems.length >= QUALITY.maxGreenGems) return;

    SharedGeometry.init();
    SharedMaterials.init();

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];
    const height = 1.2 + Math.random() * 1.0;

    const group = new THREE.Group();

    const core = new THREE.Mesh(SharedGeometry.gemCore, SharedMaterials.greenGemCore);
    core.scale.setScalar(1.1); // Slightly bigger
    group.add(core);

    const glow = new THREE.Mesh(SharedGeometry.gemGlow, SharedMaterials.greenGemGlow);
    glow.scale.setScalar(1.1);
    group.add(glow);

    group.position.set(laneX, height, -80);
    group.userData = {
        collected: false,
        type: 'green',
        baseValue: 100
    };

    scene.add(group);
    greenGems.push(group);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE RED GEM                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createRedGem() {
    if (typeof QUALITY === 'undefined' || redGems.length >= QUALITY.maxRedGems) return;

    SharedGeometry.init();
    SharedMaterials.init();

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];
    const height = 1.4 + Math.random() * 0.9;

    const group = new THREE.Group();

    const core = new THREE.Mesh(SharedGeometry.gemCore, SharedMaterials.redGemCore);
    core.scale.setScalar(1.25); // Biggest
    group.add(core);

    const glow = new THREE.Mesh(SharedGeometry.gemGlow, SharedMaterials.redGemGlow);
    glow.scale.setScalar(1.3);
    group.add(glow);

    group.position.set(laneX, height, -80);
    group.userData = {
        collected: false,
        type: 'red',
        baseValue: 200
    };

    scene.add(group);
    redGems.push(group);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE BOOST ITEM                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createBoostItem() {
    if (typeof QUALITY === 'undefined' || boostItems.length >= QUALITY.maxBoosts) return;
    if (typeof BOOSTS === 'undefined') return;

    SharedGeometry.init();

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const boostTypes = Object.values(BOOSTS);
    const boost = boostTypes[Math.floor(Math.random() * boostTypes.length)];

    const group = new THREE.Group();

    // Core with boost color
    const coreMat = new THREE.MeshStandardMaterial({
        color: boost.color,
        emissive: boost.color,
        emissiveIntensity: 1.0,
        roughness: 0.3,
        metalness: 0.5
    });
    const core = new THREE.Mesh(SharedGeometry.boostCore, coreMat);
    group.add(core);

    // Icon (cached texture)
    const iconGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const iconTex = getBoostIconTexture(boost.icon, boost.color);
    const iconMat = new THREE.MeshBasicMaterial({
        map: iconTex,
        transparent: true,
        side: THREE.DoubleSide
    });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    icon.position.set(0, 0, 0.51);
    group.add(icon);

    // Glow
    const glowMat = new THREE.MeshBasicMaterial({
        color: boost.color,
        transparent: true,
        opacity: 0.25
    });
    const glow = new THREE.Mesh(SharedGeometry.boostGlow, glowMat);
    group.add(glow);

    group.position.set(laneX, 1.4, -80);
    group.userData = {
        type: 'boost',
        boostId: boost.id,
        collected: false
    };

    scene.add(group);
    boostItems.push(group);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE LETTER PICKUP                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createLetterPickup() {
    if (typeof LETTERS_REQUIRED === 'undefined') return;

    const filledCount = collectedLetters.filter(l => l).length;
    if (filledCount >= LETTERS_REQUIRED) return;
    if (letterPickups.length > 0) return;

    SharedGeometry.init();
    SharedMaterials.init();

    if (!currentPassword || currentPassword.length < LETTERS_REQUIRED) {
        if (typeof getLevelConfig === 'function') {
            const lvlCfg = getLevelConfig(currentLevel);
            currentPassword = lvlCfg.password;
        }
    }

    let letterIndex = -1;
    for (let i = 0; i < LETTERS_REQUIRED; i++) {
        if (!collectedLetters[i]) {
            letterIndex = i;
            break;
        }
    }
    if (letterIndex === -1) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const group = new THREE.Group();

    // Box core
    const box = new THREE.Mesh(SharedGeometry.letterBox, SharedMaterials.letterCore);
    box.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    group.add(box);

    // Glow
    const glow = new THREE.Mesh(SharedGeometry.letterGlow, SharedMaterials.letterGlow);
    group.add(glow);

    group.position.set(laneX, 1.0, -80);
    group.userData = {
        collected: false,
        letter: currentPassword ? currentPassword[letterIndex] : '?',
        letterIndex
    };

    scene.add(group);
    letterPickups.push(group);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CREATE STORY OBJECT (Artifact)                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function createStoryObject() {
    if (typeof getLevelConfig !== 'function') return;

    const levelConfig = getLevelConfig(currentLevel);
    const color = levelConfig.objectColor;

    const group = new THREE.Group();

    // Main object material
    const mainMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.6
    });

    // Create shape based on level
    let mainMesh;
    if (levelConfig.level === 5) {
        const geo = new THREE.BoxGeometry(1.6, 1.1, 1.1);
        mainMesh = new THREE.Mesh(geo, mainMat);
    } else {
        const geo = new THREE.SphereGeometry(0.75, 16, 16);
        mainMesh = new THREE.Mesh(geo, mainMat);
    }
    group.add(mainMesh);

    // Glow sphere
    const glowGeo = new THREE.SphereGeometry(2, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // ✅ Only ONE light for story object (important, so keep it)
    const light = new THREE.PointLight(color, 1.5, 15);
    group.add(light);

    group.position.set(0, 2, -60);
    group.userData = {
        targetLane: 1,
        moveDirection: 1,
        moveTimer: 0
    };

    scene.add(group);
    storyObject = group;

    console.log('✅ Story object created:', levelConfig.name);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PATH CLEAR & CLEANUP FUNCTIONS                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Check if path is clear for story event
 */
function isPathClear() {
    if (!player) return true;
    if (!obstacles || obstacles.length === 0) return true;

    for (const obs of obstacles) {
        const distance = obs.position.z - player.position.z;
        if (distance > -5 && distance < 25) {
            return false;
        }
    }

    return true;
}

/**
 * Clear all obstacles from scene
 */
function clearAllObstacles() {
    const count = obstacles.length;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles.length = 0;

    console.log(`✅ Cleared ${count} obstacles`);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ✅ RESET 3D OBJECTS (Missing function - now added!)                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function reset3DObjects() {
    // Clear obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles.length = 0;

    // Clear blue gems
    for (let i = gems.length - 1; i >= 0; i--) {
        scene.remove(gems[i]);
    }
    gems.length = 0;

    // Clear green gems
    for (let i = greenGems.length - 1; i >= 0; i--) {
        scene.remove(greenGems[i]);
    }
    greenGems.length = 0;

    // Clear red gems
    for (let i = redGems.length - 1; i >= 0; i--) {
        scene.remove(redGems[i]);
    }
    redGems.length = 0;

    // Clear boost items
    for (let i = boostItems.length - 1; i >= 0; i--) {
        scene.remove(boostItems[i]);
    }
    boostItems.length = 0;

    // Clear letter pickups
    for (let i = letterPickups.length - 1; i >= 0; i--) {
        scene.remove(letterPickups[i]);
    }
    letterPickups.length = 0;

    // Clear particles
    if (typeof particles !== 'undefined') {
        for (let i = particles.length - 1; i >= 0; i--) {
            scene.remove(particles[i]);
        }
        particles.length = 0;
    }

    // Clear magic trails
    if (typeof magicTrails !== 'undefined') {
        for (let i = magicTrails.length - 1; i >= 0; i--) {
            scene.remove(magicTrails[i]);
        }
        magicTrails.length = 0;
    }

    // Clear gem bursts
    if (typeof gemBursts !== 'undefined') {
        for (let i = gemBursts.length - 1; i >= 0; i--) {
            scene.remove(gemBursts[i]);
        }
        gemBursts.length = 0;
    }

    // Clear story object
    if (storyObject) {
        scene.remove(storyObject);
        storyObject = null;
    }

    console.log('✅ All 3D objects reset');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPORTS                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

window.createObstacle = createObstacle;
window.createGem = createGem;
window.createGreenGem = createGreenGem;
window.createRedGem = createRedGem;
window.createBoostItem = createBoostItem;
window.createLetterPickup = createLetterPickup;
window.createStoryObject = createStoryObject;
window.isPathClear = isPathClear;
window.clearAllObstacles = clearAllObstacles;
window.reset3DObjects = reset3DObjects;
window.initGameObjects = initGameObjects;

console.log('✅ 05-game-objects.js loaded (OPTIMIZED v2.0)');