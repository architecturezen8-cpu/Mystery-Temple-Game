/* ═══════════════════════════════════════════════════════════════════════════
   02-STATE.JS
   Mystery Temple - Galaxy Edition
   
   All game state variables in one place.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  THREE.JS OBJECTS                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let scene = null;
let camera = null;
let renderer = null;
let player = null;
let playerGlow = null;
let elfWings = null;

/* ====== BEGIN ADD: Environment references (for animations) ====== */
let env = {
    planets: [],
    rings: [],
    nebulas: [],
    stars: null,
    coloredStars: null
};
/* ====== END ADD: Environment references (for animations) ====== */

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GAME OBJECT ARRAYS                                                       ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let obstacles = [];
let gems = [];
let greenGems = [];
let redGems = [];
let letterPickups = [];
let boostItems = [];
let storyObject = null;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PARTICLE ARRAYS                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let particles = [];
let magicTrails = [];
let gemBursts = [];


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  TIMING VARIABLES                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let lastTime = 0;
let deltaTime = 0;
let gameStartTime = 0;
let lastShootingStarTime = 0;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GAME FLAGS                                                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let gameRunning = false;
let gamePaused = false;
let assetsLoaded = false;
let isInvincible = false;         // During revival
let isReviving = false;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PLAYER STATS                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let score = 0;
let collectedGems = 0;
let highscore = parseInt(localStorage.getItem('mysteryMagicHighscore')) || 0;
let redGemsCollected = 0;
let greenGemsCollected = 0;
let blueGemsCollected = 0;
let totalRunesCollected = 0;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LIVES SYSTEM                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let currentLives = LIVES_CONFIG.MAX_LIVES;
let revivalTimer = null;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ACTIVE BOOSTS                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let activeBoosts = {
    speed: { active: false, endTime: 0, timer: null },
    shield: { active: false, endTime: 0, timer: null },
    magnet: { active: false, endTime: 0, timer: null },
    double: { active: false, endTime: 0, timer: null }
};


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MOVEMENT STATE                                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let currentLane = 1;
let targetLaneX = 0;
let isJumping = false;
let isSliding = false;
let jumpVelocity = 0;
let gameSpeed = DIFFICULTY.BASE_SPEED;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LEVEL & STORY STATE                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let currentLevel = 0;
let storyObjectActive = false;
let chaseProgress = 0;
let collectedLetters = [];
let currentPassword = '';
let waitingForClearPath = false;
let chaseStarted = false;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  TIMERS                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let countdownTimer = null;
let morseCountdownTimer = null;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MESSAGE STORAGE                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let allMorseCodes = [];
let allEnglishMessages = [];
let allSinhalaMessages = [];


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GESTURE / CAMERA STATE                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let gestureHands = null;
let gestureStream = null;
let gestureMatchProgress = 0;
let gestureHoldStart = 0;
let gestureDetected = false;
let brightnessLevel = 50;
let brightnessCheckCount = 0;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CIPHER STATE                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let gestureMode = 'password';   // 'password' | 'cipher'
let cipherGestureIndex = -1;
let cipherGestureVerified = [false, false, false, false, false];
let cipherIsAnimating = false;
let cipherPendingSinhala = '';
let keyboardKeys = [];
let bpmInterval = null;
let shuffleInterval = null;
let cipherSignalInterval = null;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  TEMPLE WALL STATE                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let templeWallActive = false;
let templeWallLines = [];
let templeWallAnimTimeouts = [];


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CINEMATIC STATE                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let creditsActive = false;
let creditsStartTime = 0;
let glitchDeleteActive = false;


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PLAYER RESPONSE                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let playerResponse = null;  // 'yes' | 'no' | null


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  STATE RESET FUNCTION                                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Reset all game state to initial values
 */
function resetGameState() {
    // Stats
    score = 0;
    collectedGems = 0;
    redGemsCollected = 0;
    greenGemsCollected = 0;
    blueGemsCollected = 0;
    totalRunesCollected = 0;
    
    // Lives
    currentLives = LIVES_CONFIG.MAX_LIVES;
    isInvincible = false;
    isReviving = false;
    
    // Boosts
    Object.keys(activeBoosts).forEach(key => {
        if (activeBoosts[key].timer) {
            clearTimeout(activeBoosts[key].timer);
        }
        activeBoosts[key] = { active: false, endTime: 0, timer: null };
    });
    
    // Movement
    currentLane = 1;
    targetLaneX = 0;
    isJumping = false;
    isSliding = false;
    jumpVelocity = 0;
    gameSpeed = DIFFICULTY.BASE_SPEED;
    
    // Level
    currentLevel = 0;
    storyObjectActive = false;
    chaseProgress = 0;
    chaseStarted = false;
    waitingForClearPath = false;
    collectedLetters = [];
    
    // Messages
    allMorseCodes = [];
    allEnglishMessages = [];
    allSinhalaMessages = [];
    
    // Cipher
    cipherGestureVerified = [false, false, false, false, false];
    cipherIsAnimating = false;
    gestureMode = 'password';
    
    // Timers
    if (countdownTimer) { 
        clearInterval(countdownTimer); 
        countdownTimer = null; 
    }
    if (morseCountdownTimer) { 
        clearInterval(morseCountdownTimer); 
        morseCountdownTimer = null; 
    }
    if (bpmInterval) { 
        clearInterval(bpmInterval); 
        bpmInterval = null; 
    }
    if (shuffleInterval) { 
        clearInterval(shuffleInterval); 
        shuffleInterval = null; 
    }
    if (revivalTimer) {
        clearTimeout(revivalTimer);
        revivalTimer = null;
    }
    
    // Flags
    gamePaused = false;
    playerResponse = null;
}


/**
 * Reset 3D object arrays (call when clearing scene)
 */
function reset3DObjects() {
    // Remove from scene and clear arrays
    [obstacles, gems, greenGems, redGems, letterPickups, boostItems, 
     particles, magicTrails, gemBursts].forEach(arr => {
        arr.forEach(obj => {
            if (obj && scene) scene.remove(obj);
        });
        arr.length = 0;
    });
    
    if (storyObject && scene) {
        scene.remove(storyObject);
        storyObject = null;
    }
}


console.log('✅ 02-state.js loaded');