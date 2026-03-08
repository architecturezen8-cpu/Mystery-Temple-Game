/* ═══════════════════════════════════════════════════════════════════════════
   12-CONTROLS.JS
   Mystery Temple - Galaxy Edition

   Input handling:
   - Keyboard controls
   - Mobile button controls
   - Swipe controls (on canvas)
   - Prevent pinch zoom

   This file ONLY handles controls (no game logic / no UI rendering).
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ---------------------------------------------------------------------------
   MOVEMENT ACTIONS
--------------------------------------------------------------------------- */

function moveLeft() {
    if (!gameRunning || gamePaused) return;
    if (currentLane > 0) {
        currentLane--;
        targetLaneX = LANES[currentLane];
    }
}

function moveRight() {
    if (!gameRunning || gamePaused) return;
    if (currentLane < 2) {
        currentLane++;
        targetLaneX = LANES[currentLane];
    }
}

function jump() {
    if (!gameRunning || gamePaused) return;
    if (!isJumping && !isSliding) {
        isJumping = true;
        jumpVelocity = 0.48; // slightly stronger jump for hard mode
        if (window.SoundManager) SoundManager.play('jump');
    }
}

function slide() {
    if (!gameRunning || gamePaused) return;
    if (!isJumping && !isSliding) {
        isSliding = true;
        if (window.SoundManager) SoundManager.play('slide');
        setTimeout(() => { isSliding = false; }, 600);
    }
}

/* ---------------------------------------------------------------------------
   KEYBOARD BINDINGS
--------------------------------------------------------------------------- */

function bindKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (isInputFocused()) return;
        if (!gameRunning) return;

        switch (e.code) {
            case 'Escape':
            case 'KeyP':
                e.preventDefault();
                togglePause();
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

/* ---------------------------------------------------------------------------
   MOBILE BUTTON BINDINGS
--------------------------------------------------------------------------- */

function safeBindBtn(id, fn) {
    const el = getEl(id);
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fn();
    }, { passive: false });

    el.addEventListener('click', fn);
}

function bindMobileButtons() {
    safeBindBtn('btnLeft', moveLeft);
    safeBindBtn('btnRight', moveRight);
    safeBindBtn('btnJump', jump);
    safeBindBtn('btnSlide', slide);
}

/* ---------------------------------------------------------------------------
   SWIPE CONTROLS (ON CANVAS)
--------------------------------------------------------------------------- */

let touchStartX = 0;
let touchStartY = 0;

function bindSwipeControls() {
    const canvasEl = getEl('gameCanvas');
    if (!canvasEl) return;

    canvasEl.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches[0]) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvasEl.addEventListener('touchend', (e) => {
        if (!gameRunning || gamePaused) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;

        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        // Horizontal swipe
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            dx > 0 ? moveRight() : moveLeft();
            return;
        }

        // Vertical swipe
        if (Math.abs(dy) > 40) {
            dy < 0 ? jump() : slide();
        }
    }, { passive: true });
}

/* ---------------------------------------------------------------------------
   PREVENT PINCH ZOOM / MULTI-TOUCH
--------------------------------------------------------------------------- */

function preventPinchZoom() {
    document.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}

/* ---------------------------------------------------------------------------
   INIT
--------------------------------------------------------------------------- */

function initControls() {
    bindKeyboardControls();
    bindMobileButtons();
    bindSwipeControls();
    preventPinchZoom();
}

window.initControls = initControls;

// Optional exports if you want to call from console
window.moveLeft = moveLeft;
window.moveRight = moveRight;
window.jump = jump;
window.slide = slide;

console.log('✅ 12-controls.js loaded');