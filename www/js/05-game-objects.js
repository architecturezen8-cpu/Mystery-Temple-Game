/* ═══════════════════════════════════════════════════════════════════════════
   05-GAME-OBJECTS.JS
   Mystery Temple - Galaxy Edition

   Creates all 3D game objects:
   - Obstacles
   - Gems (blue / green / red)
   - Boost items
   - Letter (rune) pickups
   - Story (artifact) object
   
   ✅ FIXED: Duplicate function definitions, isPathClear logic
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/**
 * Create a single obstacle (block or barrier) in a random lane.
 */
function createObstacle() {
    if (obstacles.length >= QUALITY.maxObstacles) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const isBlock = Math.random() < 0.65;
    let obstacle;

    if (isBlock) {
        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x8844aa,
            transparent: true,
            opacity: 0.85,
            roughness: 0.4,
            metalness: 0.3
        });
        obstacle = new THREE.Mesh(geo, mat);
        obstacle.position.y = 0.75;
        obstacle.userData = { type: 'block', height: 1.5 };

    } else {
        const geo = new THREE.BoxGeometry(2.6, 1, 0.4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x446688,
            roughness: 0.7
        });
        obstacle = new THREE.Mesh(geo, mat);
        obstacle.position.y = 2.6;
        obstacle.userData = { type: 'barrier', height: 3.6 };
    }

    obstacle.position.x = laneX;
    obstacle.position.z = -80;
    scene.add(obstacle);
    obstacles.push(obstacle);
}

/**
 * Create a standard blue gem in a random lane.
 */
function createGem() {
    if (gems.length >= QUALITY.maxGems) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const group = new THREE.Group();

    const coreGeo = new THREE.OctahedronGeometry(0.4);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        emissive: 0x0044aa,
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.4
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x0088ff,
        transparent: true,
        opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(0x0088ff, 0.6, 6);
    group.add(light);

    group.position.set(laneX, 1.0, -80);
    group.userData = {
        collected: false,
        type: 'blue',
        baseValue: 50
    };

    scene.add(group);
    gems.push(group);
}

/**
 * Create a green gem (higher value).
 */
function createGreenGem() {
    if (greenGems.length >= QUALITY.maxGreenGems) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];
    const height = 1.2 + Math.random() * 1.0;

    const group = new THREE.Group();

    const coreGeo = new THREE.OctahedronGeometry(0.45);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00aa55,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.4
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(0.7, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(0x00ff88, 0.8, 8);
    group.add(light);

    group.position.set(laneX, height, -80);
    group.userData = {
        collected: false,
        type: 'green',
        baseValue: 100
    };

    scene.add(group);
    greenGems.push(group);
}

/**
 * Create a red gem (highest value).
 */
function createRedGem() {
    if (redGems.length >= QUALITY.maxRedGems) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];
    const height = 1.4 + Math.random() * 0.9;

    const group = new THREE.Group();

    const coreGeo = new THREE.OctahedronGeometry(0.5);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        emissive: 0xaa2222,
        emissiveIntensity: 0.8,
        roughness: 0.4,
        metalness: 0.4
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.35
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(0xff4444, 1.0, 10);
    group.add(light);

    group.position.set(laneX, height, -80);
    group.userData = {
        collected: false,
        type: 'red',
        baseValue: 200
    };

    scene.add(group);
    redGems.push(group);
}

/**
 * Create a boost item (speed, shield, magnet, double points).
 */
function createBoostItem() {
    if (boostItems.length >= QUALITY.maxBoosts) return;

    const laneIndex = Math.floor(Math.random() * 3);
    const laneX = LANES[laneIndex];

    const boostTypes = Object.values(BOOSTS);
    const boost = randomItem(boostTypes);

    const group = new THREE.Group();

    const coreGeo = new THREE.SphereGeometry(0.5, 14, 14);
    const coreMat = new THREE.MeshStandardMaterial({
        color: boost.color,
        emissive: boost.color,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const iconGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 128, 128);
    ctx.font = '80px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(boost.icon, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const iconMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true
    });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    icon.position.set(0, 0, 0.51);
    group.add(icon);

    const glowGeo = new THREE.SphereGeometry(0.9, 10, 10);
    const glowMat = new THREE.MeshBasicMaterial({
        color: boost.color,
        transparent: true,
        opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(boost.color, 0.8, 10);
    group.add(light);

    group.position.set(laneX, 1.4, -80);
    group.userData = {
        type: 'boost',
        boostId: boost.id,
        collected: false
    };

    scene.add(group);
    boostItems.push(group);
}

/**
 * Create a letter (rune) pickup in a random lane.
 */
function createLetterPickup() {
    const filledCount = collectedLetters.filter(l => l).length;
    if (filledCount >= LETTERS_REQUIRED) return;
    if (letterPickups.length > 0) return;

    if (!currentPassword || currentPassword.length < LETTERS_REQUIRED) {
        const lvlCfg = getLevelConfig(currentLevel);
        currentPassword = lvlCfg.password;
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

    const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.5
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.rotation.set(Math.PI / 4, Math.PI / 4, 0);
    group.add(box);

    const glowGeo = new THREE.SphereGeometry(1.0, 10, 10);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.35
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(0xffaa00, 1.2, 12);
    group.add(light);

    group.position.set(laneX, 1.0, -80);
    group.userData = {
        collected: false,
        letter: currentPassword[letterIndex],
        letterIndex
    };

    scene.add(group);
    letterPickups.push(group);
}

/**
 * Create the story (artifact) object for current level.
 */
function createStoryObject() {
    const levelConfig = getLevelConfig(currentLevel);
    const color = levelConfig.objectColor;

    const group = new THREE.Group();

    const mainMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.3,
        metalness: 0.6
    });

    let mainMesh;
    if (levelConfig.level === 5) {
        mainMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.1, 1.1),
            mainMat
        );
    } else {
        mainMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.75, 16, 16),
            mainMat
        );
    }
    group.add(mainMesh);

    const glowGeo = new THREE.SphereGeometry(2, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const light = new THREE.PointLight(color, 2, 20);
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

/* ====== BEGIN REPLACE: isPathClear + clearAllObstacles (no duplicates) ====== */
/**
 * ✅ Check if path is clear for story event.
 * Returns true if no obstacles near player.
 */
function isPathClear() {
    if (!player) {
        console.log('⚠️ Player not found, path considered clear');
        return true;
    }
    
    if (!obstacles || obstacles.length === 0) {
        console.log('✅ No obstacles, path is clear');
        return true;
    }
    
    // Check obstacles in front of player
    for (const obs of obstacles) {
        const distance = obs.position.z - player.position.z;
        
        // If obstacle is within 25 units ahead
        if (distance > -5 && distance < 25) {
            console.log(`❌ Path blocked by obstacle at z=${obs.position.z.toFixed(1)}`);
            return false;
        }
    }
    
    console.log('✅ Path is clear!');
    return true;
}

/**
 * ✅ Clear all obstacles from scene for story event.
 */
function clearAllObstacles() {
    const count = obstacles.length;
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles.length = 0;
    
    console.log(`✅ Cleared ${count} obstacles for story event`);
}

// Export functions
window.isPathClear = isPathClear;
window.clearAllObstacles = clearAllObstacles;
/* ====== END REPLACE: isPathClear + clearAllObstacles (no duplicates) ====== */

console.log('✅ 05-game-objects.js loaded');