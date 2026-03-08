/* ═══════════════════════════════════════════════════════════════════════════
   08-GESTURE.JS
   Mystery Temple - Galaxy Edition

   Camera + MediaPipe Hands gesture verification.
   - Handles permission errors safely
   - Low-light detection (allows skip ONLY for low-light)
   - Gesture hold-to-verify progress UI

   ✅ FINAL FIXED VERSION - Camera modal appears correctly for cipher gestures
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ---------------------------------------------------------------------------
   UI HELPERS
--------------------------------------------------------------------------- */

function updateDetectionStatus(detected, text) {
    const dot = document.querySelector('#detectionStatus .detection-dot');
    const textEl = document.querySelector('#detectionStatus .detection-text');

    if (dot) dot.classList.toggle('detected', Boolean(detected));
    if (textEl) textEl.textContent = text || '';
}

function updateGestureVerifyProgress(percent) {
    const fill = getEl('gestureVerifyProgressFill');
    const percentText = getEl('gestureVerifyPercent');
    const label = getEl('gestureVerifyLabel');

    const p = Math.max(0, Math.min(100, percent));

    if (fill) fill.style.width = `${p}%`;
    if (percentText) percentText.textContent = `${Math.floor(p)}%`;

    if (!label) return;

    if (p >= 100) label.textContent = '✅ GESTURE VERIFIED!';
    else if (p > 0) label.textContent = `🖐 HOLD STEADY... ${Math.floor(p)}%`;
    else label.textContent = '🖐 HOLD GESTURE TO VERIFY...';
}

/* ---------------------------------------------------------------------------
   CAMERA ERROR BOX
--------------------------------------------------------------------------- */

function showCameraError(message) {
    const box = getEl('cameraErrorBox');
    const text = getEl('cameraErrorText');
    if (!box || !text) return;

    text.textContent = message || 'Camera access failed. Please allow camera and press RETRY.';
    box.classList.remove('hidden');

    updateDetectionStatus(false, 'Camera unavailable');
}

function hideCameraError() {
    const box = getEl('cameraErrorBox');
    if (box) box.classList.add('hidden');
}

function retryGestureCamera() {
    hideCameraError();
    stopGestureCamera();
    updateDetectionStatus(false, 'Requesting camera...');
    startGestureCamera();
}

window.retryGestureCamera = retryGestureCamera;

/* ---------------------------------------------------------------------------
   PRIVACY TRANSLATE BUTTON
--------------------------------------------------------------------------- */

function initCameraPrivacyTranslate() {
    const btn = getEl('cameraPrivacyTranslateBtn');
    const textEl = getEl('cameraPrivacyText');
    if (!btn || !textEl) return;

    let isSinhala = false;

    btn.addEventListener('click', async () => {
        textEl.style.opacity = '0.2';
        await sleep(120);

        isSinhala = !isSinhala;

        if (isSinhala) {
            textEl.textContent =
                'අපි ඔබගේ කැමරා වීඩියෝව කිසිදා record හෝ save කරන්නේ නැහැ. සියලුම gesture detection processing ඔබගේ device එක තුළම පමණයි.';
            btn.innerHTML = '<span class="translate-icon">🌐</span> Switch to English';
        } else {
            textEl.textContent =
                'We never store your camera video. All gesture detection runs only on your device.';
            btn.innerHTML = '<span class="translate-icon">🌐</span> සිංහලට පරිවර්තනය කරන්න';
        }

        await sleep(80);
        textEl.style.opacity = '1';
    });
}

/* ---------------------------------------------------------------------------
   CURRENT REQUIRED GESTURE
--------------------------------------------------------------------------- */

function getCurrentGesture() {
    // Cipher mode gesture verification
    if (gestureMode === 'cipher' && cipherGestureIndex >= 0) {
        return GESTURE_CONFIG.levels[cipherGestureIndex] || GESTURE_CONFIG.levels[0];
    }

    // Normal level gesture
    return getGestureForLevel(currentLevel);
}

/* ---------------------------------------------------------------------------
   MODAL OPEN/CLOSE
--------------------------------------------------------------------------- */

/**
 * ✅ Open gesture modal with camera for verification.
 */
function openGestureModal() {
    const modal = getEl('gestureModal');
    if (!modal) {
        console.error('❌ gestureModal element not found in HTML!');
        return;
    }

    console.log('📷 Opening gesture modal, gestureMode =', gestureMode);

    // Hide password-related sections that might be visible from previous level
    const pwSection = getEl('gesturePasswordSection');
    const pwInputDiv = getEl('gesturePasswordInput');
    if (pwSection) pwSection.classList.add('hidden');
    if (pwInputDiv) pwInputDiv.classList.add('hidden');

    // Reset progress bar and detection text
    const progressFill = getEl('gestureVerifyProgressFill');
    const percentEl = getEl('gestureVerifyPercent');
    const label = getEl('gestureVerifyLabel');
    if (progressFill) progressFill.style.width = '0%';
    if (percentEl) percentEl.textContent = '0%';
    if (label) label.textContent = '🖐 HOLD GESTURE TO VERIFY...';

    // Reset detection status
    updateDetectionStatus(false, 'Waiting for hand...');

    // Hide any previous camera error
    hideCameraError();
    setLowLightWarning(false);

    // Ensure gesture target is set correctly for cipher mode
    if (gestureMode === 'cipher' && cipherGestureIndex >= 0) {
        const gestureIcons = ['✋', '✌️', '☝️', '👊', '🤟'];
        const gestureNames = ['Open Palm', 'Peace Sign', 'Point Up', 'Fist', 'Rock On'];

        const targetEl = getEl('gestureTarget');
        const instructionEl = document.querySelector('.gesture-instruction');

        if (targetEl) targetEl.textContent = gestureIcons[cipherGestureIndex] || '✋';
        if (instructionEl) instructionEl.textContent = `Show: ${gestureNames[cipherGestureIndex] || 'gesture'}`;
    } else {
        // Normal level gesture
        const gesture = getCurrentGesture();
        const targetEl = getEl('gestureTarget');
        const instructionEl = document.querySelector('.gesture-instruction');

        if (targetEl) targetEl.textContent = gesture.icon || '✋';
        if (instructionEl) instructionEl.textContent = `Show: ${gesture.name || 'gesture'}`;
    }

    // 🔥 FORCE MODAL VISIBILITY
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    console.log('✅ Modal display set, starting camera...');

    // Start camera
    startGestureCamera();

    console.log('✅ Gesture modal opened');
}

function closeGestureModal() {
    const modal = getEl('gestureModal');
    if (modal) modal.classList.add('hidden');

    stopGestureCamera();

    updateGestureVerifyProgress(0);
    updateDetectionStatus(false, '');

    console.log('✅ Gesture modal closed');
}

window.openGestureModal = openGestureModal;
window.closeGestureModal = closeGestureModal;

/* ---------------------------------------------------------------------------
   LOW-LIGHT CHECK
--------------------------------------------------------------------------- */

function analyzeBrightness(video, canvas) {
    if (!video || !canvas) return 50;
    const ctx = canvas.getContext('2d');

    try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let total = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 160) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            total += (0.299 * r + 0.587 * g + 0.114 * b);
            count++;
        }

        brightnessLevel = total / Math.max(count, 1);
        return brightnessLevel;
    } catch {
        return 50;
    }
}

function setLowLightWarning(show) {
    const w = getEl('lowLightWarning');
    if (!w) return;
    w.classList.toggle('hidden', !show);
}

function skipGestureAndShowPassword() {
    stopGestureCamera();
    revealPasswordFromGesture();
}
window.skipGestureAndShowPassword = skipGestureAndShowPassword;

/* ---------------------------------------------------------------------------
   CAMERA START/STOP
--------------------------------------------------------------------------- */

async function startGestureCamera() {
    const video = getEl('cameraVideo');
    const canvas = getEl('cameraCanvas');

    if (!video || !canvas) {
        showCameraError('Camera UI missing. Please refresh the page.');
        return;
    }

    try {
        updateDetectionStatus(false, 'Starting camera...');

        // Stop any existing stream
        if (gestureStream) {
            gestureStream.getTracks().forEach(t => t.stop());
            gestureStream = null;
        }

        gestureStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        });

        video.srcObject = gestureStream;

        await new Promise((resolve, reject) => {
            let done = false;

            video.onloadedmetadata = () => {
                video.play()
                    .then(() => {
                        done = true;
                        resolve();
                    })
                    .catch(reject);
            };

            setTimeout(() => {
                if (!done) reject(new Error('Camera timeout'));
            }, 7000);
        });

        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;

        if (typeof Hands === 'undefined') {
            showCameraError('Hand detection library not loaded. Check internet and refresh.');
            return;
        }

        updateDetectionStatus(false, 'Loading hand detection...');

        gestureHands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        gestureHands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
        });

        gestureHands.onResults(onGestureResults);

        updateDetectionStatus(false, 'Show your hand...');
        detectGestureLoop(video);

        updateDetectionStatus(false, 'Camera ready. Show your hand...');
        console.log('🎥 Camera started, waiting for hands...');

    } catch (error) {
        console.error('Camera error:', error);

        let msg = 'Camera access failed. Please allow camera permission and press RETRY.';
        if (error?.name === 'NotAllowedError') msg = 'Camera permission denied. Allow it and press RETRY.';
        if (error?.name === 'NotFoundError') msg = 'No camera device found.';
        if (error?.message) msg += ` (${error.message})`;

        showCameraError(msg);
    }
}

function stopGestureCamera() {
    const video = getEl('cameraVideo');
    if (video) {
        try { video.pause(); } catch { }
        video.srcObject = null;
    }

    if (gestureStream) {
        gestureStream.getTracks().forEach(t => t.stop());
        gestureStream = null;
    }

    gestureHands = null;
    gestureDetected = false;
    gestureHoldStart = 0;
    brightnessCheckCount = 0;
}

/* ---------------------------------------------------------------------------
   DETECTION LOOP
--------------------------------------------------------------------------- */

async function detectGestureLoop(video) {
    if (!gestureHands || !gestureStream) return;

    const canvas = getEl('cameraCanvas');

    if (video.readyState >= 2) {
        brightnessCheckCount++;
        if (brightnessCheckCount >= 15) {
            brightnessCheckCount = 0;
            const b = analyzeBrightness(video, canvas);
            setLowLightWarning(b < 40);
        }

        try {
            await gestureHands.send({ image: video });
        } catch (e) {
            console.error('Hand detection error:', e);
        }
    }

    if (gestureStream) requestAnimationFrame(() => detectGestureLoop(video));
}

/* ---------------------------------------------------------------------------
   RESULTS HANDLER
--------------------------------------------------------------------------- */

function onGestureResults(results) {
    const canvas = getEl('cameraCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper: Update cipher hold progress bar (in cipher overlay)
    const setCipherHold = (percent, active) => {
        if (gestureMode === 'cipher' && typeof window.cipherSetHoldProgress === 'function') {
            window.cipherSetHoldProgress(percent, active);
        }
    };

    const hasHand =
        results &&
        results.multiHandLandmarks &&
        Array.isArray(results.multiHandLandmarks) &&
        results.multiHandLandmarks.length > 0;

    if (!hasHand) {
        updateDetectionStatus(false, 'Show your hand...');
        gestureDetected = false;
        gestureHoldStart = 0;
        gestureMatchProgress = 0;

        updateGestureVerifyProgress(0);
        setCipherHold(0, false);
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    if (typeof drawHandLandmarks === 'function') {
        drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
    }

    const detectedGesture = detectGestureType(landmarks);
    const requiredGesture = getCurrentGesture();

    updateDetectionStatus(true, `Detected: ${detectedGesture.name}`);

    if (detectedGesture.type === requiredGesture.gesture) {
        if (!gestureDetected) {
            gestureDetected = true;
            gestureHoldStart = Date.now();
            gestureMatchProgress = 0;
        }

        const holdTime = Date.now() - gestureHoldStart;
        const progress = Math.min(100, (holdTime / GESTURE_CONFIG.holdTime) * 100);

        updateGestureVerifyProgress(progress);
        setCipherHold(progress, true);

        if (progress >= 100 && gestureMatchProgress < 100) {
            gestureMatchProgress = 100;

            updateGestureVerifyProgress(100);
            setCipherHold(100, true);

            setTimeout(() => {
                revealPasswordFromGesture();
            }, 200);
        }

        return;
    }

    gestureDetected = false;
    gestureHoldStart = 0;
    gestureMatchProgress = 0;

    updateGestureVerifyProgress(0);
    setCipherHold(0, false);
}

/* ---------------------------------------------------------------------------
   GESTURE CLASSIFICATION
--------------------------------------------------------------------------- */

function detectGestureType(landmarks) {
    if (isIndexPoint(landmarks)) return { type: 'point', name: 'Index Point ☝️' };

    const fingersUp = countFingersUp(landmarks);

    if (fingersUp === 5) return { type: 'open_palm', name: 'Open Palm ✋' };
    if (fingersUp === 2 && isIndexMiddleUp(landmarks)) return { type: 'peace', name: 'Peace ✌️' };
    if (fingersUp === 0) return { type: 'fist', name: 'Fist 👊' };
    if (fingersUp === 3 && isLoveSign(landmarks)) return { type: 'love', name: 'Love 🤟' };

    return { type: 'unknown', name: `${fingersUp} fingers` };
}

function isIndexPoint(landmarks) {
    const indexUp = landmarks[8].y < landmarks[6].y;
    const middleDown = landmarks[12].y > landmarks[10].y;
    const ringDown = landmarks[16].y > landmarks[14].y;
    const pinkyDown = landmarks[20].y > landmarks[18].y;
    return indexUp && middleDown && ringDown && pinkyDown;
}

function countFingersUp(landmarks) {
    let count = 0;

    if (landmarks[4].x < landmarks[3].x) count++;

    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;

    return count;
}

function isIndexMiddleUp(landmarks) {
    const indexUp = landmarks[8].y < landmarks[6].y;
    const middleUp = landmarks[12].y < landmarks[10].y;
    const ringDown = landmarks[16].y > landmarks[14].y;
    const pinkyDown = landmarks[20].y > landmarks[18].y;
    return indexUp && middleUp && ringDown && pinkyDown;
}

function isLoveSign(landmarks) {
    const thumbOut = landmarks[4].x < landmarks[3].x;
    const indexUp = landmarks[8].y < landmarks[6].y;
    const middleDown = landmarks[12].y > landmarks[10].y;
    const ringDown = landmarks[16].y > landmarks[14].y;
    const pinkyUp = landmarks[20].y < landmarks[18].y;
    return thumbOut && indexUp && middleDown && ringDown && pinkyUp;
}

/* ---------------------------------------------------------------------------
   LANDMARK DRAW
--------------------------------------------------------------------------- */

function drawHandLandmarks(ctx, landmarks, width, height) {
    ctx.fillStyle = '#0f8';
    ctx.strokeStyle = '#0f8';
    ctx.lineWidth = 2;

    for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17]
    ];

    for (const [a, b] of connections) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height);
        ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height);
        ctx.stroke();
    }
}

/* ---------------------------------------------------------------------------
   AFTER VERIFIED: PASSWORD REVEAL / CIPHER VERIFY
--------------------------------------------------------------------------- */

async function revealPasswordFromGesture() {
    if (gestureMode === 'cipher' && cipherGestureIndex >= 0) {
        console.log(`✅ Cipher gesture ${cipherGestureIndex} verified!`);

        stopGestureCamera();
        closeGestureModal();

        if (typeof cipherMarkGestureVerified === 'function') {
            cipherMarkGestureVerified(cipherGestureIndex);
        }

        gestureMode = 'password';
        cipherGestureIndex = -1;
        gestureMatchProgress = 0;

        return;
    }

    stopGestureCamera();

    const section = getEl('gesturePasswordSection');
    const display = getEl('gesturePasswordDisplay');
    const inputSection = getEl('gesturePasswordInput');

    if (!section || !display) {
        console.error('Password reveal elements missing!');
        closeGestureModal();
        return;
    }

    display.innerHTML = '';

    const chars = (currentPassword || '').split('');
    const charDivs = [];

    for (const ch of chars) {
        const div = document.createElement('div');
        div.className = 'revealed-password-char';
        div.dataset.target = ch;
        div.textContent = '?';
        div.style.opacity = '0';
        div.style.transform = 'scale(0.5)';
        display.appendChild(div);
        charDivs.push(div);
    }

    section.classList.remove('hidden');

    await sleep(120);

    charDivs.forEach((d, i) => {
        setTimeout(() => {
            d.style.transition = 'all 0.2s ease';
            d.style.opacity = '1';
            d.style.transform = 'scale(1)';
        }, i * 55);
    });

    for (let i = 0; i < charDivs.length; i++) {
        const div = charDivs[i];
        const target = div.dataset.target;
        const steps = 6 + Math.floor(Math.random() * 4);

        for (let s = 0; s < steps; s++) {
            div.textContent = ENGLISH_CHARS[Math.floor(Math.random() * ENGLISH_CHARS.length)];
            await sleep(45);
        }
        div.textContent = target;
    }

    await sleep(450);

    if (inputSection) inputSection.classList.remove('hidden');

    console.log('✅ Password revealed!');
}

/* ---------------------------------------------------------------------------
   INIT EXPORT
--------------------------------------------------------------------------- */

window.initCameraPrivacyTranslate = initCameraPrivacyTranslate;

console.log('✅ 08-gesture.js loaded');