/* ═══════════════════════════════════════════════════════════════════════════
   03-UTILS.JS
   Mystery Temple - Galaxy Edition
   
   Helper functions: sleep, clipboard, morse code, screen conversion, etc.
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ASYNC UTILITIES                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Promise-based sleep function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  CLIPBOARD UTILITIES                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {boolean} Success status
 */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
            fallbackCopyToClipboard(text);
        });
        return true;
    } else {
        return fallbackCopyToClipboard(text);
    }
}

/**
 * Fallback clipboard copy for older browsers
 * @param {string} text 
 * @returns {boolean}
 */
function fallbackCopyToClipboard(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();

    try {
        document.execCommand('copy');
        document.body.removeChild(temp);
        return true;
    } catch (e) {
        document.body.removeChild(temp);
        return false;
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  INPUT UTILITIES                                                          ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Check if an input element is currently focused
 * @returns {boolean}
 */
function isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  COORDINATE CONVERSION                                                    ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Convert 3D world position to 2D screen coordinates
 * @param {THREE.Vector3} pos3d - 3D position
 * @returns {object} {x, y} screen coordinates
 */
function worldToScreen(pos3d) {
    if (!camera) return { x: 0, y: 0 };

    const v = pos3d.clone().project(camera);
    return {
        x: (v.x + 1) / 2 * window.innerWidth,
        y: (-v.y + 1) / 2 * window.innerHeight
    };
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  MORSE CODE UTILITIES                                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

const MORSE_MAP = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
    'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
    'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
    'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
    'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
    'Z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': '/', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
    '\'': '.----.', '-': '-....-'
};

/**
 * Convert text to Morse code
 * @param {string} text - Text to convert
 * @returns {string} Morse code representation
 */
function textToMorse(text) {
    let output = '';
    for (const char of text.toUpperCase()) {
        if (MORSE_MAP[char]) {
            output += MORSE_MAP[char] + ' ';
        }
    }
    return output.trim();
}

/**
 * Format Morse code as HTML with colored dots and dashes
 * @param {string} morseCode 
 * @returns {string} HTML string
 */
function formatMorseHTML(morseCode) {
    let html = '';
    for (const char of morseCode) {
        if (char === '.') {
            html += '<span class="dot">•</span>';
        } else if (char === '-') {
            html += '<span class="dash">━</span>';
        } else if (char === '/') {
            html += '<span class="space"> / </span>';
        } else if (char === ' ') {
            html += ' ';
        }
    }
    return html;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  RANDOM UTILITIES                                                         ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random float between min and max
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Get random item from array
 * @param {Array} arr 
 * @returns {*}
 */
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array in place
 * @param {Array} arr 
 * @returns {Array}
 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  DOM UTILITIES                                                            ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Get element by ID with null check
 * @param {string} id 
 * @returns {HTMLElement|null}
 */
function getEl(id) {
    return document.getElementById(id);
}

/**
 * Show element by removing 'hidden' class
 * @param {string|HTMLElement} el 
 */
function showEl(el) {
    const element = typeof el === 'string' ? getEl(el) : el;
    if (element) element.classList.remove('hidden');
}

/**
 * Hide element by adding 'hidden' class
 * @param {string|HTMLElement} el 
 */
function hideEl(el) {
    const element = typeof el === 'string' ? getEl(el) : el;
    if (element) element.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {string|HTMLElement} el 
 * @param {boolean} show 
 */
function toggleEl(el, show) {
    if (show) showEl(el);
    else hideEl(el);
}

/**
 * Set element text content safely
 * @param {string} id 
 * @param {string} text 
 */
function setText(id, text) {
    const el = getEl(id);
    if (el) el.textContent = text;
}

/**
 * Set element innerHTML safely
 * @param {string} id 
 * @param {string} html 
 */
function setHTML(id, html) {
    const el = getEl(id);
    if (el) el.innerHTML = html;
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  ANIMATION UTILITIES                                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Animate a value from start to end
 * @param {number} from 
 * @param {number} to 
 * @param {number} duration - Duration in ms
 * @param {function} onUpdate - Called each frame with current value
 * @param {function} onComplete - Called when complete
 */
function animateValue(from, to, duration, onUpdate, onComplete) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = from + (to - from) * progress;
        onUpdate(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        } else if (onComplete) {
            onComplete();
        }
    }

    requestAnimationFrame(update);
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  FORMATTING UTILITIES                                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Format number with commas
 * @param {number} num 
 * @returns {string}
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format time as MM:SS
 * @param {number} seconds 
 * @returns {string}
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time as HH:MM:SS
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
function formatTimeHMS(ms) {
    const t = new Date(ms);
    return String(t.getMinutes()).padStart(2, '0') + ':' +
        String(t.getSeconds()).padStart(2, '0') + ':' +
        String(Math.floor(t.getMilliseconds() / 10)).padStart(2, '0');
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  VIBRATION UTILITY                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Vibrate device if supported
 * @param {number|Array} pattern - Vibration pattern
 */
function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  STORAGE UTILITIES                                                        ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Save to localStorage
 * @param {string} key 
 * @param {*} value 
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Storage save failed:', e);
    }
}

/**
 * Load from localStorage
 * @param {string} key 
 * @param {*} defaultValue 
 * @returns {*}
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
        console.warn('Storage load failed:', e);
        return defaultValue;
    }
}


/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  NOTIFICATION UTILITY                                                     ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */

/**
 * Show toast notification
 * @param {string} message 
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {number} duration - Duration in ms
 */
function showNotification(message, type = 'info', duration = 3000) {
    const container = getEl('notificationContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-text">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

console.log(' 03-utils.js loaded');