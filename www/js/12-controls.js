/* ═══════════════════════════════════════════════════════════════════════════
   12-CONTROLS.JS
   Mystery Temple - Galaxy Edition

   Input handling:
   - Keyboard controls
   - Mobile button controls (INSTANT RESPONSE - no 300ms delay)
   - Swipe controls (on canvas)
   - Prevent pinch zoom

   FIXED VERSION:
   - Touch responds instantly (no 300ms delay)
   - Visual feedback on press
   - Prevents double-firing (touch + click)
   - Throttled inputs to prevent spam
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CONFIGURATION                                                             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const CONTROLS_CONFIG = {
    SWIPE_THRESHOLD: 35,           // Minimum swipe distance (px)
    THROTTLE_DELAY: 80,            // Minimum time between same actions (ms)
    VISUAL_FEEDBACK_DURATION: 100, // Button press visual duration (ms)
    DOUBLE_TAP_PREVENTION: 250     // Prevent double firing (ms)
};

// Track last action times for throttling
const lastActionTime = {
    left: 0,
    right: 0,
    jump: 0,
    slide: 0
};

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  TOUCH DELAY FIX - CSS INJECTION                                          ║
   ║  මේකෙන් 300ms browser delay එක remove වෙනවා                               ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function injectTouchFixCSS() {
    // Check if already added
    if (document.getElementById('touch-fix-css')) return;

    const style = document.createElement('style');
    style.id = 'touch-fix-css';
    style.textContent = `
        /* Remove 300ms tap delay on all elements */
        *, *::before, *::after {
            touch-action: manipulation;
        }
        
        /* Control buttons - instant response */
        .control-btn, .btn, button, [role="button"] {
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            cursor: pointer;
        }
        
        /* Active state for buttons */
        .control-btn.pressed, .btn.pressed {
            transform: scale(0.92) !important;
            opacity: 0.85 !important;
            filter: brightness(1.2) !important;
        }
        
        /* Canvas touch handling */
        #gameCanvas {
            touch-action: none;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Touch delay fix CSS injected');
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  THROTTLED MOVEMENT ACTIONS                                                ║
   ║  Rapid spam prevent කරනවා, but still responsive                           ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function canPerformAction(actionName) {
    const now = Date.now();
    const lastTime = lastActionTime[actionName] || 0;

    if (now - lastTime < CONTROLS_CONFIG.THROTTLE_DELAY) {
        return false; // Too soon
    }

    lastActionTime[actionName] = now;
    return true;
}

function moveLeft() {
    if (!gameRunning || gamePaused) return;
    if (!canPerformAction('left')) return;

    if (currentLane > 0) {
        currentLane--;
        targetLaneX = LANES[currentLane];
    }
}

function moveRight() {
    if (!gameRunning || gamePaused) return;
    if (!canPerformAction('right')) return;

    if (currentLane < 2) {
        currentLane++;
        targetLaneX = LANES[currentLane];
    }
}

function jump() {
    if (!gameRunning || gamePaused) return;
    if (!canPerformAction('jump')) return;

    if (!isJumping && !isSliding) {
        isJumping = true;
        jumpVelocity = 0.48;
        if (window.SoundManager) SoundManager.play('jump');
    }
}

function slide() {
    if (!gameRunning || gamePaused) return;
    if (!canPerformAction('slide')) return;

    if (!isJumping && !isSliding) {
        isSliding = true;
        if (window.SoundManager) SoundManager.play('slide');
        setTimeout(() => { isSliding = false; }, 600);
    }
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  KEYBOARD BINDINGS                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function bindKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (typeof isInputFocused === 'function' && isInputFocused()) return;
        if (!gameRunning) return;

        switch (e.code) {
            case 'Escape':
            case 'KeyP':
                e.preventDefault();
                if (typeof togglePause === 'function') togglePause();
                break;

            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                moveLeft();
                break;

            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                moveRight();
                break;

            case 'ArrowUp':
            case 'Space':
            case 'KeyW':
                e.preventDefault();
                jump();
                break;

            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                slide();
                break;
        }
    });
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FAST BUTTON BINDING - INSTANT RESPONSE                                    ║
   ║  Touch එකට immediately respond වෙනවා - 300ms delay නැහැ                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function fastBindBtn(id, actionFn) {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) {
        console.warn(`Button not found: ${id}`);
        return;
    }

    // Prevent duplicate binding
    if (el.__fastBound__) return;
    el.__fastBound__ = true;

    let isTouching = false;
    let touchId = null;
    let lastTouchTime = 0;

    // ═══════════════════════════════════════════════════════════════════
    // TOUCHSTART - Instant action + visual feedback
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('touchstart', function (e) {
        // Prevent multiple touches on same button
        if (isTouching) return;

        isTouching = true;
        touchId = e.touches[0]?.identifier;
        lastTouchTime = Date.now();

        // Visual feedback IMMEDIATELY
        this.classList.add('pressed');

        // Execute action IMMEDIATELY on touchstart
        actionFn();

        // Prevent default to avoid 300ms delay
        e.preventDefault();

    }, { passive: false });

    // ═══════════════════════════════════════════════════════════════════
    // TOUCHEND - Reset visual state
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('touchend', function (e) {
        isTouching = false;
        touchId = null;

        // Reset visual
        this.classList.remove('pressed');

        // Prevent click event from also firing
        e.preventDefault();

    }, { passive: false });

    // ═══════════════════════════════════════════════════════════════════
    // TOUCHCANCEL - Reset state
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('touchcancel', function () {
        isTouching = false;
        touchId = null;
        this.classList.remove('pressed');
    }, { passive: true });

    // ═══════════════════════════════════════════════════════════════════
    // TOUCHMOVE - If finger moves off button, cancel
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('touchmove', function (e) {
        if (!isTouching) return;

        const touch = Array.from(e.touches).find(t => t.identifier === touchId);
        if (!touch) return;

        // Check if touch moved outside button
        const rect = this.getBoundingClientRect();
        const isOutside = touch.clientX < rect.left ||
            touch.clientX > rect.right ||
            touch.clientY < rect.top ||
            touch.clientY > rect.bottom;

        if (isOutside) {
            isTouching = false;
            this.classList.remove('pressed');
        }
    }, { passive: true });

    // ═══════════════════════════════════════════════════════════════════
    // CLICK - For non-touch devices (desktop)
    // Prevent if touch just happened (double-fire prevention)
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('click', function (e) {
        const now = Date.now();

        // If touch just happened, ignore click (prevents double-fire)
        if (now - lastTouchTime < CONTROLS_CONFIG.DOUBLE_TAP_PREVENTION) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Visual feedback for mouse
        this.classList.add('pressed');
        setTimeout(() => this.classList.remove('pressed'),
            CONTROLS_CONFIG.VISUAL_FEEDBACK_DURATION);

        // Execute action
        actionFn();

    }, { passive: false });

    // ═══════════════════════════════════════════════════════════════════
    // MOUSE DOWN/UP - Visual feedback for desktop
    // ═══════════════════════════════════════════════════════════════════
    el.addEventListener('mousedown', function () {
        this.classList.add('pressed');
    });

    el.addEventListener('mouseup', function () {
        this.classList.remove('pressed');
    });

    el.addEventListener('mouseleave', function () {
        this.classList.remove('pressed');
    });
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MOBILE BUTTON BINDINGS                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function bindMobileButtons() {
    // Main control buttons
    fastBindBtn('btnLeft', moveLeft);
    fastBindBtn('btnRight', moveRight);
    fastBindBtn('btnJump', jump);
    fastBindBtn('btnSlide', slide);

    // Alternative IDs (in case your HTML uses different IDs)
    fastBindBtn('leftBtn', moveLeft);
    fastBindBtn('rightBtn', moveRight);
    fastBindBtn('jumpBtn', jump);
    fastBindBtn('slideBtn', slide);

    // Also bind any elements with data-action attribute
    document.querySelectorAll('[data-action]').forEach(el => {
        const action = el.dataset.action;
        switch (action) {
            case 'left': fastBindBtn(el, moveLeft); break;
            case 'right': fastBindBtn(el, moveRight); break;
            case 'jump': fastBindBtn(el, jump); break;
            case 'slide': fastBindBtn(el, slide); break;
        }
    });

    console.log('✅ Mobile buttons bound with instant response');
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  SWIPE CONTROLS (ON CANVAS)                                                ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isSwipeInProgress = false;

function bindSwipeControls() {
    const canvasEl = document.getElementById('gameCanvas');
    if (!canvasEl) {
        console.warn('Canvas not found for swipe controls');
        return;
    }

    canvasEl.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches[0]) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isSwipeInProgress = true;

    }, { passive: true });

    canvasEl.addEventListener('touchmove', function (e) {
        // Prevent page scroll while swiping on canvas
        if (isSwipeInProgress) {
            e.preventDefault();
        }
    }, { passive: false });

    canvasEl.addEventListener('touchend', function (e) {
        if (!gameRunning || gamePaused) return;
        if (!isSwipeInProgress) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;

        isSwipeInProgress = false;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchDuration = Date.now() - touchStartTime;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Must be a quick swipe (under 300ms) and minimum distance
        if (touchDuration > 300) return;

        const threshold = CONTROLS_CONFIG.SWIPE_THRESHOLD;

        // Horizontal swipe (takes priority if diagonal)
        if (absDx > absDy && absDx > threshold) {
            if (dx > 0) {
                moveRight();
            } else {
                moveLeft();
            }
            return;
        }

        // Vertical swipe
        if (absDy > threshold) {
            if (dy < 0) {
                jump();  // Swipe up
            } else {
                slide(); // Swipe down
            }
        }

    }, { passive: true });

    canvasEl.addEventListener('touchcancel', function () {
        isSwipeInProgress = false;
    }, { passive: true });

    console.log('✅ Swipe controls bound');
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  PREVENT PINCH ZOOM / MULTI-TOUCH                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function preventPinchZoom() {
    // Prevent pinch zoom
    document.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // Prevent double-tap zoom
    let lastTapTime = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
            e.preventDefault();
        }
        lastTapTime = now;
    }, { passive: false });

    // Prevent zoom on iOS Safari
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    }, { passive: false });
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ADDITIONAL BUTTON HELPER - For UI buttons (play, pause, etc.)             ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Bind any UI button with instant touch response
 * Use this for menu buttons, play button, etc.
 * 
 * @param {string|Element} elementOrId - Element or ID
 * @param {Function} callback - Function to call on press
 */
function bindUIButton(elementOrId, callback) {
    fastBindBtn(elementOrId, callback);
}

/**
 * Bind multiple UI buttons at once
 * @param {Object} bindings - { elementId: callbackFn, ... }
 */
function bindUIButtons(bindings) {
    Object.entries(bindings).forEach(([id, fn]) => {
        fastBindBtn(id, fn);
    });
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  INITIALIZATION                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

function initControls() {
    console.log('🎮 Initializing controls...');

    // 1. Inject CSS fix for 300ms delay
    injectTouchFixCSS();

    // 2. Bind keyboard
    bindKeyboardControls();

    // 3. Bind mobile buttons with instant response
    bindMobileButtons();

    // 4. Bind swipe controls
    bindSwipeControls();

    // 5. Prevent zoom gestures
    preventPinchZoom();

    console.log('✅ All controls initialized with instant response');
}

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  EXPORTS                                                                   ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

// Main init
window.initControls = initControls;

// Movement actions
window.moveLeft = moveLeft;
window.moveRight = moveRight;
window.jump = jump;
window.slide = slide;

// UI button binding helpers (for menu, pause, etc.)
window.bindUIButton = bindUIButton;
window.bindUIButtons = bindUIButtons;
window.fastBindBtn = fastBindBtn;

console.log('✅ 12-controls.js loaded (instant response version)');