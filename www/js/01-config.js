/* ═══════════════════════════════════════════════════════════════════════════
   01-CONFIG.JS
   Mystery Temple - Galaxy Edition

   All game configuration, levels, gestures, and constants.
   ✅ FIXED: Supports Admin Panel config (Supabase game_configs.config JSON)
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GAME DIFFICULTY SETTINGS (HARD MODE)                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const DIFFICULTY = {
  // Speed settings
  BASE_SPEED: 0.32,
  MAX_SPEED: 0.60,
  SPEED_INCREMENT: 0.035,

  // Spawn rates
  OBSTACLE_SPAWN_RATE: 0.014,
  GEM_SPAWN_RATE: 0.012,
  GREEN_GEM_SPAWN_RATE: 0.008,
  RED_GEM_SPAWN_RATE: 0.005,
  LETTER_SPAWN_RATE: 0.025,
  BOOST_SPAWN_RATE: 0.003,

  // Collision
  HITBOX_TOLERANCE: 0.35,

  // Chase
  CHASE_FILL_RATE: 0.06,
  CHASE_ESCAPE_THRESHOLD: 100
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LIVES SYSTEM                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const LIVES_CONFIG = {
  MAX_LIVES: 4,
  REVIVAL_TIME: 2000,
  REVIVAL_BLINK_RATE: 100
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  BOOST ITEMS CONFIGURATION                                                ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const BOOSTS = {
  SPEED: {
    id: 'speed',
    icon: '⚡',
    name: 'SPEED BOOST',
    duration: 5000,
    color: 0xffff00,
    multiplier: 1.5
  },
  SHIELD: {
    id: 'shield',
    icon: '🛡️',
    name: 'SHIELD',
    duration: 3000,
    color: 0x00ffff
  },
  MAGNET: {
    id: 'magnet',
    icon: '🧲',
    name: 'GEM MAGNET',
    duration: 8000,
    color: 0xff00ff,
    range: 8
  },
  DOUBLE: {
    id: 'double',
    icon: '✖️2',
    name: 'DOUBLE POINTS',
    duration: 10000,
    color: 0x00ff00,
    multiplier: 2
  }
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LEVEL CONFIGURATION                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const LETTERS_REQUIRED = 4;
const RUNE_SYMBOLS = ['★', '◆', '●', '▲'];

// NOTE: We keep LEVELS as const array, but we will mutate its objects in applyAdminConfig().
const LEVELS = [
  {
    level: 1,
    icon: "🔮",
    name: "Magic Orb",
    password: "LOVE",
    englishMessage: "When I first saw you... my heart changed from that day...",
    sinhalaMessage: "මම ඔයාව මුලින්ම දැක්කේ... ඒ දවසේ ඉඳලා මගේ හිත වෙනස් වුණා...",
    objectColor: 0x00ffff,
    redRequired: 20, greenRequired: 20, blueRequired: 20
  },
  {
    level: 2,
    icon: "📜",
    name: "Ancient Scroll",
    password: "ROYY",
    englishMessage: "When talking with you... it felt like being in another world...",
    sinhalaMessage: "ඔයා එක්ක කතා කරද්දී... වෙනත් ලෝකයක ඉන්නවා වගේ දැනුණා...",
    objectColor: 0xffcc00,
    redRequired: 20, greenRequired: 20, blueRequired: 20
  },
  {
    level: 3,
    icon: "🗝️",
    name: "Golden Key",
    password: "SOUL",
    englishMessage: "I felt something I never felt before... it was love...",
    sinhalaMessage: "මට දැනුණේ මීට කලින් දැනුණු නැති දෙයක්... ඒක ආදරය...",
    objectColor: 0xffd700,
    redRequired: 20, greenRequired: 20, blueRequired: 20
  },
  {
    level: 4,
    icon: "💎",
    name: "Crystal Heart",
    password: "HOPE",
    englishMessage: "I cant live without you... my heart is always with you...",
    sinhalaMessage: "ඔයා නැතුව ඉන්න බැරි තරම්... මගේ හිත ඔයා ළඟ තියෙන්නේ...",
    objectColor: 0xff69b4,
    redRequired: 20, greenRequired: 20, blueRequired: 20
  },
  {
    level: 5,
    icon: "🎁",
    name: "Mystery Chest",
    password: "KISS",
    englishMessage: "I LOVE YOU... You are everything to me...",
    sinhalaMessage: "මම ඔයාට ආදරෙයි... 💕",
    objectColor: 0x00ff88,
    redRequired: 20, greenRequired: 20, blueRequired: 20,
    isFinal: true
  }
];

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FINAL MESSAGES                                                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * ✅ IMPORTANT:
 * these must be `let` (not const) to allow admin panel override
 */
let FINAL_ENGLISH =
  "I wanted to tell you I love you through this game... You are my world...";

let FINAL_SINHALA =
  "මම ඔයාට ආදරෙයි කියන්න හිටියේ මේ game එකෙන්... ඔයා මගේ ලෝකේ... 💕";

let YES_RESPONSE =
  "ඔයාගේ පිළිතුරට ස්තූතියි! 💖 මගේ හිත සතුටින් පිරිලා!";

let NO_RESPONSE =
  "කමක් නෑ ඉතින්... 😊 ඔයාගේ friendship එකම මට ලොකු දෙයක්!";

/** Extra (admin panel has this) */
let THANK_YOU_MESSAGE = "THANK YOU!";

/** Temple wall final reveal (admin panel has this) */
let TEMPLE_WALL_SINHALA =
  "මම ඔයාට ආදරෙයි කියන්න හිටියේ මේ game එකෙන්... ඔයා මගේ ලෝකේ... 💕";

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GESTURE CONFIGURATION                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const GESTURE_CONFIG = {
  levels: [
    { gesture: 'open_palm', icon: '✋', name: 'Open Palm', fingers: 5 },
    { gesture: 'peace', icon: '✌️', name: 'Peace Sign', fingers: 2 },
    { gesture: 'point', icon: '☝️', name: 'Index Point', fingers: 1 },
    { gesture: 'fist', icon: '👊', name: 'Power Fist', fingers: 0 },
    { gesture: 'love', icon: '🤟', name: 'Love Sign', fingers: 3 }
  ],
  holdTime: 2000,
  matchThreshold: 80
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CIPHER CHARACTERS                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const ENGLISH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SINHALA_CHARS = 'අආඇඈඉඊඋඌඑඔකගචජටඩණතදපබමරලවසහළෆ';
const MAX_CIPHER_CHARS = 30;

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LANE & WORLD CONSTANTS                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const LANE_WIDTH = 4;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  QUALITY SETTINGS (Device-based)                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isLowEnd =
  isMobile ||
  window.innerWidth < 768 ||
  (navigator.deviceMemory && navigator.deviceMemory <= 2);

const QUALITY = {
  particleCount: isLowEnd ? 12 : 18,
  maxObstacles: isLowEnd ? 6 : 8,
  maxGems: isLowEnd ? 5 : 7,
  maxTrails: isLowEnd ? 15 : 25,
  bgParticles: isLowEnd ? 15 : 25,
  maxGreenGems: isLowEnd ? 3 : 4,
  maxRedGems: isLowEnd ? 2 : 3,
  maxBoosts: isLowEnd ? 1 : 2,
  shootingStarInterval: isLowEnd ? 6000 : 4000
};

const PERFORMANCE_PROFILE = {
  isMobile,
  isLowEnd,
  isTablet: /iPad|Tablet/i.test(navigator.userAgent) || (window.innerWidth <= 1024 && window.innerWidth > 600),
  isPortrait: window.innerHeight >= window.innerWidth,
  // Performance flags - keep quality high!
  enableOptimizedRendering: true,
  targetFPS: isLowEnd ? 30 : 60,
  minPixelRatio: 1,
  maxPixelRatio: isLowEnd ? 1.5 : 2,
  useDevicePixelRatio: true
};

window.PERFORMANCE_PROFILE = PERFORMANCE_PROFILE;

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  TELEGRAM BOT CONFIGURATION (not used by server bot.js)                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const TELEGRAM_CONFIG = {
  botToken: 'YOUR_BOT_TOKEN_HERE',
  chatId: 'YOUR_CHAT_ID_HERE',
  enabled: false
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXTERNAL URLS                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const GLOBAL_DECODER_URL = "https://morsecode.world/international/translator.html";

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  HELPER FUNCTIONS FOR CONFIG                                              ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function getCombinedOTP() {
  return LEVELS.map(l => (l.password || '')[0] || '').join('');
}

function getCombinedPassword() {
  return LEVELS.map(l => String(l.password || '')).join('');
}

function getLevelConfig(levelIndex) {
  return LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
}

function getGestureForLevel(levelIndex) {
  return GESTURE_CONFIG.levels[levelIndex] || GESTURE_CONFIG.levels[0];
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  LOADING TIPS                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const LOADING_TIPS = [
  "TIP: Collect all 4 runes to unlock the artifact!",
  "TIP: Slide under barriers, jump over blocks!",
  "TIP: Green gems give 100 points, Red gives 200!",
  "TIP: You have 4 lives - use them wisely!",
  "TIP: Collect boosts for special powers!",
  "TIP: The game gets faster as your score increases!",
  "TIP: Use gestures to unlock secret messages!"
];

function getRandomLoadingTip() {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ✅ ADMIN CONFIG APPLY FUNCTION (NEW)                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * cfg = Supabase game_configs.config JSON
 * This mutates existing DIFFICULTY/LIVES_CONFIG/BOOSTS/LEVELS and updates FINAL messages.
 */
window.applyAdminConfig = function applyAdminConfig(cfg) {
  if (!cfg) return;

  console.log('⚙️ applyAdminConfig() received:', cfg);

  // ---- Difficulty ----
  if (cfg.baseSpeed != null) DIFFICULTY.BASE_SPEED = parseFloat(cfg.baseSpeed);
  if (cfg.maxSpeed != null) DIFFICULTY.MAX_SPEED = parseFloat(cfg.maxSpeed);

  // ---- Lives ----
  if (cfg.maxLives != null) LIVES_CONFIG.MAX_LIVES = parseInt(cfg.maxLives, 10);
  if (cfg.revivalTime != null) LIVES_CONFIG.REVIVAL_TIME = parseInt(cfg.revivalTime, 10);

  // ---- Boosts ----
  if (cfg.boostSpeedDur != null) BOOSTS.SPEED.duration = parseInt(cfg.boostSpeedDur, 10);
  if (cfg.boostSpeedMult != null) BOOSTS.SPEED.multiplier = parseFloat(cfg.boostSpeedMult);

  if (cfg.boostShieldDur != null) BOOSTS.SHIELD.duration = parseInt(cfg.boostShieldDur, 10);

  if (cfg.boostMagnetDur != null) BOOSTS.MAGNET.duration = parseInt(cfg.boostMagnetDur, 10);
  if (cfg.boostMagnetRange != null) BOOSTS.MAGNET.range = parseInt(cfg.boostMagnetRange, 10);

  if (cfg.boostDoubleDur != null) BOOSTS.DOUBLE.duration = parseInt(cfg.boostDoubleDur, 10);

  // ---- Levels: map admin fields -> game fields ----
  if (Array.isArray(cfg.levels) && cfg.levels.length) {
    for (let i = 0; i < Math.min(LEVELS.length, cfg.levels.length); i++) {
      const a = cfg.levels[i];
      const l = LEVELS[i];
      if (!a || !l) continue;

      if (a.icon) l.icon = a.icon;
      if (a.name) l.name = a.name;
      if (a.password) l.password = String(a.password).toUpperCase();

      // admin: english/sinhala -> game: englishMessage/sinhalaMessage
      if (a.english != null) l.englishMessage = a.english;
      if (a.sinhala != null) l.sinhalaMessage = a.sinhala;

      // admin: color "#rrggbb" -> game: objectColor number
      if (a.color) {
        const hex = String(a.color).replace('#', '');
        if (/^[0-9a-fA-F]{6}$/.test(hex)) l.objectColor = parseInt(hex, 16);
      }

      // requirements (if your other code uses these)
      if (a.redRequired != null) l.redRequired = parseInt(a.redRequired, 10);
      if (a.greenRequired != null) l.greenRequired = parseInt(a.greenRequired, 10);
      if (a.blueRequired != null) l.blueRequired = parseInt(a.blueRequired, 10);
      
      console.log(`✅ Level ${i+1} gem requirements applied:`, {
        red: l.redRequired,
        green: l.greenRequired,
        blue: l.blueRequired
      });
    }
  }
  
  // Log final LEVELS state to verify
  console.log('📊 All LEVELS after config applied:', LEVELS.map(l => ({
    level: l.level,
    red: l.redRequired,
    green: l.greenRequired,
    blue: l.blueRequired
  })));

  // ---- Final messages ----
  if (cfg.finalEnglishMessage) FINAL_ENGLISH = cfg.finalEnglishMessage;
  if (cfg.finalSinhalaMessage) FINAL_SINHALA = cfg.finalSinhalaMessage;
  if (cfg.finalYesResponse) YES_RESPONSE = cfg.finalYesResponse;
  if (cfg.finalNoResponse) NO_RESPONSE = cfg.finalNoResponse;
  if (cfg.thankYouMessage) THANK_YOU_MESSAGE = cfg.thankYouMessage;
  if (cfg.templeWallSinhala) TEMPLE_WALL_SINHALA = cfg.templeWallSinhala;

  // ---- Theme colors — apply ALL related CSS variables ----
  const root = document.documentElement;

  function hex2rgba(hex, a) {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16);
    const g = parseInt(h.slice(2,4),16);
    const b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  if (cfg.colorPrimary) {
    const p = cfg.colorPrimary;
    root.style.setProperty('--color-primary', p);
    root.style.setProperty('--color-primary-light', p);
    root.style.setProperty('--color-primary-glow', hex2rgba(p, 0.60));
    root.style.setProperty('--color-primary-soft', hex2rgba(p, 0.18));
    root.style.setProperty('--text-gold', p);
    root.style.setProperty('--text-glow', p);
  }
  if (cfg.colorSecondary) {
    const s = cfg.colorSecondary;
    root.style.setProperty('--color-secondary', s);
    root.style.setProperty('--color-secondary-light', s);
    root.style.setProperty('--color-secondary-glow', hex2rgba(s, 0.55));
  }
  if (cfg.colorAccent) {
    const a = cfg.colorAccent;
    root.style.setProperty('--color-accent', a);
    root.style.setProperty('--color-accent-light', a);
    root.style.setProperty('--color-accent-glow', hex2rgba(a, 0.55));
  }
  if (cfg.colorDanger) {
    const d = cfg.colorDanger;
    root.style.setProperty('--color-danger', d);
    root.style.setProperty('--color-danger-dark', d);
    root.style.setProperty('--color-danger-glow', hex2rgba(d, 0.60));
  }
  if (cfg.gemRed) {
    root.style.setProperty('--color-gem-red', cfg.gemRed);
    root.style.setProperty('--color-gem-red-glow', hex2rgba(cfg.gemRed, 0.60));
  }
  if (cfg.gemGreen) {
    root.style.setProperty('--color-gem-green', cfg.gemGreen);
    root.style.setProperty('--color-gem-green-glow', hex2rgba(cfg.gemGreen, 0.60));
  }
  if (cfg.gemBlue) {
    root.style.setProperty('--color-gem-blue', cfg.gemBlue);
    root.style.setProperty('--color-gem-blue-glow', hex2rgba(cfg.gemBlue, 0.60));
  }
  if (cfg.gemYellow) {
    root.style.setProperty('--color-gem-yellow', cfg.gemYellow);
    root.style.setProperty('--color-gem-yellow-glow', hex2rgba(cfg.gemYellow, 0.60));
  }

  // Also apply finalWallEnglish/Sinhala keys from CSV config format
  if (cfg.finalWallEnglish) window.__FINAL_ENGLISH = cfg.finalWallEnglish;
  if (cfg.finalWallSinhala) window.__FINAL_SINHALA = cfg.finalWallSinhala;
  if (cfg.finalEnglishMessage) window.__FINAL_ENGLISH = cfg.finalEnglishMessage;
  if (cfg.finalSinhalaMessage) window.__FINAL_SINHALA = cfg.finalSinhalaMessage;
  if (cfg.templeWallSinhala && !window.__FINAL_SINHALA) window.__FINAL_SINHALA = cfg.templeWallSinhala;
  if (cfg.msgYes) window.__YES_RESPONSE = cfg.msgYes;
  if (cfg.msgNo)  window.__NO_RESPONSE  = cfg.msgNo;
  if (cfg.receiver_name) window.__RECEIVER_NAME = cfg.receiver_name;

  // ── Sound: enable/disable based on config ──
  if (cfg.soundEnabled !== undefined) {
    const sEnabled = cfg.soundEnabled !== false;
    if (window.SoundManager && typeof window.SoundManager.setEnabled === 'function') {
      window.SoundManager.setEnabled(sEnabled);
    }
    console.log('🔊 Sound ' + (sEnabled ? 'ENABLED' : 'DISABLED') + ' by admin config');
  }

  // store full config for other scripts if needed
  window.__GAME_CONFIG = cfg;

  console.log('✅ Admin config applied OK', {
    baseSpeed: DIFFICULTY.BASE_SPEED,
    maxLives: LIVES_CONFIG.MAX_LIVES,
    finalEnglish: FINAL_ENGLISH,
    templeWall: TEMPLE_WALL_SINHALA
  });
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPOSE FINAL MESSAGES (optional helpers)                                 ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

window.getFinalEnglish = () => FINAL_ENGLISH;
window.getFinalSinhala = () => FINAL_SINHALA;
window.getYesResponse = () => YES_RESPONSE;
window.getNoResponse = () => NO_RESPONSE;
window.getThankYouMessage = () => THANK_YOU_MESSAGE;
window.getTempleWallSinhala = () => TEMPLE_WALL_SINHALA;

console.log('✅ 01-config.js loaded (admin-config ready)');
