/* ═══════════════════════════════════════════════════════════════════════════
   bot.js — Mystery Temple Telegram Bot
   
   ARCHITECTURE:
   ┌─────────────────────────────────────────────────────────────┐
   │  bot_settings.settings  =  Message TEMPLATES (admin edits) │
   │  game_configs           =  Game DATA (slug, name, codes)   │
   │  game_receipts          =  Player DATA (chat_id, score)    │
   │                                                             │
   │  Every request → fresh Supabase fetch → fill template       │
   │  → send. Zero hardcoded messages. Zero caching.            │
   └─────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const { Telegraf }    = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// ─── ENV ─────────────────────────────────────────────────────────────────────
const BOT_TOKEN       = process.env.BOT_TOKEN;
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const GAME_BASE_URL   = process.env.GAME_BASE_URL || 'https://mystery-temple.vercel.app';

// ─── INIT (module level — OK for Vercel warm reuse) ──────────────────────────
const bot      = BOT_TOKEN       ? new Telegraf(BOT_TOKEN) : null;
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ═════════════════════════════════════════════════════════════════════════════
//  PURE HELPERS  (no DB, no side effects)
// ═════════════════════════════════════════════════════════════════════════════

function slug(text) {
    return String(text || '').trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
}

function titleCase(name) {
    return String(name || '').trim()
        .split(/\s+/)
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : '')
        .join(' ');
}

/** Fill {placeholder} in template string with values object */
function fill(template, vars) {
    if (!template) return '';
    return Object.entries(vars || {}).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'gi'), String(v ?? '')),
        String(template)
    );
}

/** OTP + decrypt key from level passwords */
function codesFromLevels(levels) {
    let otp = '', key = '';
    for (const lv of (Array.isArray(levels) ? levels : [])) {
        const pw = String(lv?.password || '').toUpperCase();
        if (pw) { otp += pw[0]; key += pw; }
    }
    return {
        otp: otp || '—',
        key: key || '—'
    };
}

/** Current date + time in Sri Lanka (UTC+5:30) */
function sriLankaTime() {
    const now   = new Date(Date.now() + 5.5 * 3600_000);
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    let h = now.getUTCHours(), m = now.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return {
        date: `${now.getUTCFullYear()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}`,
        time: `${h}:${String(m).padStart(2,'0')} ${ampm}`
    };
}

// ═════════════════════════════════════════════════════════════════════════════
//  SUPABASE DATA LOADERS  (every call = fresh DB fetch, no caching)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * loadTemplates(gameId)
 * Returns bot_settings.settings for this game_id.
 * This is what the Telegram Admin Panel writes to.
 */
async function loadTemplates(gameId) {
    if (!gameId || !supabase) return {};
    const { data, error } = await supabase
        .from('bot_settings')
        .select('settings')
        .eq('game_id', gameId)
        .maybeSingle();
    if (error) console.error('loadTemplates error:', error.message);
    const raw = data?.settings;
    return (raw && typeof raw === 'object') ? raw : {};
}

/**
 * loadGame(slug)
 * Returns full game_configs row by player_slug or slug.
 */
async function loadGame(playerSlug) {
    const s = slug(playerSlug);
    if (!s || !supabase) return null;
    const { data, error } = await supabase
        .from('game_configs')
        .select('id, slug, player_slug, owner_slug, receiver_name, owner_name, owner_chat_id, access_code, config')
        .or(`slug.eq.${s},player_slug.eq.${s}`)
        .maybeSingle();
    if (error) console.error('loadGame error:', error.message);
    return data || null;
}

/**
 * loadGameByOwnerSlug(ownerSlug)
 */
async function loadGameByOwnerSlug(ownerSlug) {
    const s = slug(ownerSlug);
    if (!s || !supabase) return null;
    const { data, error } = await supabase
        .from('game_configs')
        .select('id, slug, player_slug, owner_slug, receiver_name, owner_name, owner_chat_id, access_code, config')
        .eq('owner_slug', s)
        .maybeSingle();
    if (error) console.error('loadGameByOwnerSlug error:', error.message);
    return data || null;
}

/**
 * loadReceipt(slug)
 * Returns game_receipts row — has player_chat_id, score, level_reached, answer.
 */
async function loadReceipt(gameSlug) {
    const s = slug(gameSlug);
    if (!s || !supabase) return null;
    const { data } = await supabase
        .from('game_receipts')
        .select('player_chat_id, score, level_reached, answer, receiver_name, access_code')
        .eq('slug', s)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return data || null;
}

/**
 * loadRecipient(slug)
 * Returns game_recipients row — has chat_id of player who messaged the bot.
 */
async function loadRecipient(gameSlug) {
    const s = slug(gameSlug);
    if (!s || !supabase) return null;
    const { data } = await supabase
        .from('game_recipients')
        .select('chat_id')
        .eq('slug', s)
        .maybeSingle();
    return data || null;
}

/**
 * saveRecipient(slug, chatId)
 * Register player chat_id in game_recipients + game_receipts.
 */
async function saveRecipient(gameSlug, chatId) {
    const s = slug(gameSlug);
    const c = String(chatId || '');
    if (!s || !c || !supabase) return false;

    const { error } = await supabase
        .from('game_recipients')
        .upsert({ slug: s, chat_id: c }, { onConflict: 'slug' });
    if (error) { console.error('saveRecipient error:', error.message); return false; }

    // cross-update game_receipts too
    await supabase
        .from('game_receipts')
        .upsert({ slug: s, player_chat_id: c }, { onConflict: 'slug' });

    return true;
}

// ═════════════════════════════════════════════════════════════════════════════
//  buildVars(game, receipt?, extras?)
//  Builds ALL available template variables from DB data.
//  Telegram Admin Panel templates use {these} placeholders.
// ═════════════════════════════════════════════════════════════════════════════
function buildVars(game, receipt, extras) {
    const cfg         = (game?.config && typeof game.config === 'object') ? game.config : {};
    const { otp, key } = codesFromLevels(cfg.levels);
    const { date, time } = sriLankaTime();
    const playerSlug  = slug(game?.player_slug || game?.slug || '');
    const gameLink    = `${GAME_BASE_URL}/?slug=${playerSlug}`;
    const receiverName = titleCase(game?.receiver_name) || titleCase(receipt?.receiver_name) || 'Friend';

    return {
        // Names
        receiverName,
        name:           receiverName,
        playerName:     receiverName,
        ownerName:      titleCase(game?.owner_name) || 'Owner',

        // Game data
        accessCode:     game?.access_code || receipt?.access_code || '—',
        gameLink,
        slug:           playerSlug,

        // Codes from level passwords
        otp,
        key,
        decryptKey:     key,

        // Player progress (from game_receipts)
        score:          receipt?.score    ?? '—',
        level:          receipt?.level_reached ?? '—',
        answer:         receipt?.answer   ?? '—',
        playerChatId:   receipt?.player_chat_id || '—',

        // Date/time
        date,
        time,

        // Override with extras
        ...(extras || {})
    };
}

// ═════════════════════════════════════════════════════════════════════════════
//  CORS
// ═════════════════════════════════════════════════════════════════════════════
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ═════════════════════════════════════════════════════════════════════════════
//  sendPlayerMessage(ctx, tpl, vars)
//  Sends only msg_playerReg to player with game link button.
// ═════════════════════════════════════════════════════════════════════════════
async function sendPlayerMessage(ctx, tpl, vars) {
    const regMsg = fill(
        tpl.msg_playerReg ||
        '🏛️ *Mystery Temple*\n\nDear *{receiverName}*,\n\n🔐 *Access Code:* `{accessCode}`\n🎮 *Game Link:* {gameLink}\n\n_Complete all levels to reveal the secret._ ✨',
        vars
    );

    const btnLabel = (tpl.telegramPlayerEnglish_link?.enabled && tpl.telegramPlayerEnglish_link?.label)
        ? tpl.telegramPlayerEnglish_link.label
        : (tpl.telegramPlayerEnglish_link?.label || '🏛️ Play Mystery Temple');
    const btnUrl = (tpl.telegramPlayerEnglish_link?.enabled && tpl.telegramPlayerEnglish_link?.url)
        ? tpl.telegramPlayerEnglish_link.url
        : (tpl.telegramPlayerEnglish_link?.url || vars.gameLink);

    return ctx.reply(regMsg, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: btnLabel, url: btnUrl }]] }
    });
}

// ═════════════════════════════════════════════════════════════════════════════
//  BOT HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

if (bot) {

    // ── /start ────────────────────────────────────────────────────────────────
    // Load msg_botStart template fresh from bot_settings
    bot.start(async (ctx) => {
        try {
            // For /start we don't have a game yet — load any first bot_settings row
            const { data: bsRow } = await supabase
                .from('bot_settings')
                .select('settings, game_id')
                .limit(1)
                .maybeSingle();

            const tpl = bsRow?.settings || {};
            const template = tpl.msg_botStart || '🏛️ *Mystery Temple*\n\nSend your game code to begin.';

            // Get game for variable filling (if exists)
            let vars = { date: sriLankaTime().date, time: sriLankaTime().time };
            if (bsRow?.game_id) {
                const game    = await supabase.from('game_configs').select('*').eq('id', bsRow.game_id).maybeSingle();
                const receipt = game?.data ? await loadReceipt(game.data.slug) : null;
                if (game?.data) vars = buildVars(game.data, receipt);
            }

            const msg = fill(template, vars);
            const opts = { parse_mode: 'Markdown', disable_web_page_preview: true };

            if (tpl.msg_botStart_link?.enabled && tpl.msg_botStart_link?.url) {
                opts.reply_markup = { inline_keyboard: [[{
                    text: tpl.msg_botStart_link.label || '🎮 Play Now',
                    url:  tpl.msg_botStart_link.url
                }]]};
            }

            return ctx.reply(msg, opts);
        } catch (err) {
            console.error('/start error:', err.message);
            return ctx.reply('🏛️ Mystery Temple — Send your game code to begin.', { parse_mode: 'Markdown' });
        }
    });

    // ── Text handler (game code / slug sent by user) ───────────────────────────
    bot.on('text', async (ctx) => {
        const raw = (ctx.message.text || '').trim();
        if (raw.startsWith('/')) return;

        const inputSlug = slug(raw);
        const chatId    = String(ctx.chat.id);

        console.log(`📨 text: "${inputSlug}" from ${chatId}`);

        try {

            // ── 1. OWNER SLUG ─────────────────────────────────────────────────
            const ownerGame = await loadGameByOwnerSlug(inputSlug);
            if (ownerGame) {
                const tpl      = await loadTemplates(ownerGame.id);
                const receipt  = await loadReceipt(ownerGame.player_slug || ownerGame.slug);
                const vars     = buildVars(ownerGame, receipt);

                // Already registered?
                if (ownerGame.owner_chat_id) {
                    if (String(ownerGame.owner_chat_id) === chatId) {
                        const msg = fill(
                            tpl.msg_ownerAlreadyReg ||
                            '✅ *Already registered as owner.*\n\n🎮 [Open Game]({gameLink})',
                            vars
                        );
                        return ctx.reply(msg, {
                            parse_mode: 'Markdown',
                            disable_web_page_preview: true,
                            reply_markup: { inline_keyboard: [[{ text: '🏛️ Open Game', url: vars.gameLink }]] }
                        });
                    }
                    return ctx.reply('⚠️ This owner slug is already registered by another person.');
                }

                // Register owner
                const { error } = await supabase
                    .from('game_configs')
                    .update({ owner_chat_id: chatId })
                    .eq('id', ownerGame.id);

                if (error) {
                    console.error('owner register error:', error.message);
                    return ctx.reply('❌ Something went wrong. Please try again.');
                }

                const msg = fill(
                    tpl.msg_ownerRegistered ||
                    '✅ *Owner Registered!*\n\nYou will receive notifications when the player responds.\n\n🎮 [Open Game]({gameLink})',
                    vars
                );
                return ctx.reply(msg, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true,
                    reply_markup: { inline_keyboard: [[{ text: '🏛️ Open Game', url: vars.gameLink }]] }
                });
            }

            // ── 2. PLAYER SLUG ────────────────────────────────────────────────
            const game = await loadGame(inputSlug);
            if (!game) {
                // Load invalid slug message from bot_settings (fresh fetch)
                const { data: bsRow } = await supabase
                    .from('bot_settings').select('settings').limit(1).maybeSingle();
                const tpl = bsRow?.settings || {};
                return ctx.reply(
                    tpl.msg_invalidSlug || '❌ Invalid game code. Please check and try again.',
                    { parse_mode: 'Markdown' }
                );
            }

            // Load templates + data together
            const tpl     = await loadTemplates(game.id);
            const receipt = await loadReceipt(game.player_slug || game.slug);
            const vars    = buildVars(game, receipt);

            // Already claimed by someone else?
            const existingRecipient = await loadRecipient(game.player_slug || game.slug);
            if (existingRecipient?.chat_id) {
                if (String(existingRecipient.chat_id) === chatId) {
                    // Same person asking again — resend telegramPlayerSinhala + telegramPlayerEnglish
                    return sendPlayerMessage(ctx, tpl, vars);
                }
                return ctx.reply(
                    fill(tpl.msg_alreadyClaimed || '⚠️ This game has already been claimed.', vars),
                    { parse_mode: 'Markdown' }
                );
            }

            // Register new player
            const saved = await saveRecipient(game.player_slug || game.slug, chatId);
            if (!saved) return ctx.reply('❌ Something went wrong. Please try again.');

            // ── Send telegramPlayerSinhala + telegramPlayerEnglish with game link button ──
            return sendPlayerMessage(ctx, tpl, vars);

        } catch (err) {
            console.error('text handler error:', err.message);
            return ctx.reply('❌ An unexpected error occurred. Please try again.');
        }
    });
}

// ═════════════════════════════════════════════════════════════════════════════
//  API: /api/bot?action=game-complete
//  Called by game when player finishes.
//  Sends playerCompleteMessage template (filled with live data) to player.
// ═════════════════════════════════════════════════════════════════════════════
async function handleGameComplete(req, res) {
    const body  = req.body || {};
    const s     = slug(body.slug);
    const directChatId    = String(body.player_chat_id || '');
    const directAccessCode = String(body.access_code   || '');
    const bodyScore = body.score;
    const bodyLevel = body.level_reached ?? body.level;

    console.log('🔥 game-complete:', { slug: s, directChatId: !!directChatId });

    try {
        // ── Find game ──
        let game = s ? await loadGame(s) : null;
        if (!game && directAccessCode) {
            const { data } = await supabase
                .from('game_configs')
                .select('id, slug, player_slug, receiver_name, owner_name, owner_chat_id, access_code, config')
                .eq('access_code', directAccessCode)
                .maybeSingle();
            game = data || null;
        }
        if (!game) return res.status(404).json({ error: 'Game not found' });

        // ── Load templates (FRESH from bot_settings) ──
        const tpl = await loadTemplates(game.id);

        // ── Find player chat_id ──
        let chatId = directChatId;
        if (!chatId) {
            const receipt = await loadReceipt(game.player_slug || game.slug);
            chatId = receipt?.player_chat_id || '';
        }
        if (!chatId) {
            const recipient = await loadRecipient(game.player_slug || game.slug);
            chatId = recipient?.chat_id || '';
        }
        if (!chatId) return res.status(404).json({ error: 'No player chat_id found' });

        // ── Load receipt for score/level data ──
        const receipt = await loadReceipt(game.player_slug || game.slug);

        // ── Build ALL template variables ──
        const vars = buildVars(game, receipt, {
            score: bodyScore ?? receipt?.score ?? '—',
            level: bodyLevel ?? receipt?.level_reached ?? '—',
        });

        // ── Build message from template ──
        // Priority:
        // 1. tpl.playerCompleteMessage (full custom template)
        // 2. tpl.telegramPlayerEnglish + telegramPlayerSinhala (love message)
        // 3. minimal fallback
        let message = '';

        if (tpl.playerCompleteMessage && tpl.playerCompleteMessage.trim()) {
            // Full custom template — admin sets this in telegram-admin panel
            message = fill(tpl.playerCompleteMessage, vars);
        } else {
            // Build from parts
            const sinhalaOn = tpl.enablePlayerSinhala !== false;
            const engMsg    = fill(tpl.telegramPlayerEnglish || '', vars).trim();
            const sinMsg    = sinhalaOn ? fill(tpl.telegramPlayerSinhala || '', vars).trim() : '';

            message = `🏛️ *Mystery Temple — The Final Wall*\n\n`;
            message += `Dear *${vars.receiverName}*,\n\n`;

            if (sinMsg) message += `${sinMsg}\n\n`;
            if (engMsg) message += `${engMsg}\n\n`;

            message += `💕 You completed the temple!\n\n`;
            message += `📅 *Date:* ${vars.date}\n`;
            message += `🕐 *Time:* ${vars.time}\n\n`;
            message += `🔐 *OTP:* \`${vars.otp}\`\n`;
            message += `🗝️ *Decrypt Key:* \`${vars.key}\`\n`;
            if (vars.accessCode !== '—') message += `📟 *Access Code:* \`${vars.accessCode}\``;
        }

        await bot.telegram.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });

        console.log('✅ game-complete sent to', chatId);
        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('handleGameComplete error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  API: /api/bot?action=owner-notify
//  Called by game when player answers YES or NO.
//  Sends ownerYesResponse / ownerNoResponse template to owner.
// ═════════════════════════════════════════════════════════════════════════════
async function handleOwnerNotify(req, res) {
    const body   = req.body || {};
    const s      = slug(body.slug);
    const answer = String(body.answer || '').toLowerCase(); // 'yes' or 'no'
    const bodyScore = body.score;
    const bodyLevel = body.level;

    console.log('👤 owner-notify:', { slug: s, answer });

    if (!s || !answer) return res.status(400).json({ error: 'slug and answer required' });

    try {
        const game = await loadGame(s);
        if (!game)              return res.status(404).json({ error: 'Game not found' });
        if (!game.owner_chat_id) return res.status(200).json({ ok: true, note: 'Owner not registered' });

        // ── Load FRESH templates from bot_settings ──
        const tpl = await loadTemplates(game.id);

        // ── Load receipt for score/level ──
        const receipt = await loadReceipt(game.player_slug || game.slug);
        const vars    = buildVars(game, receipt, {
            answer:  answer.toUpperCase(),
            score:   bodyScore ?? receipt?.score  ?? '—',
            level:   bodyLevel ?? receipt?.level_reached ?? '—',
        });

        // ── Pick template based on answer ──
        let template = '';
        if (answer === 'yes') {
            template = tpl.ownerYesResponse ||
                '✅ *Good news!* 😊\n\nFeel free, bro.\n\n{receiverName} said *YES*! 💖';
        } else if (answer === 'no') {
            template = tpl.ownerNoResponse ||
                '❌ *Not this time.*\n\nSorry, bro.\n\n{receiverName} said *NO*.\n\nMaybe she\'ll tell you another day.';
        } else {
            template = `🎮 *Player Response*\n\n{receiverName} answered: *${answer.toUpperCase()}*`;
        }

        const msg = fill(template, vars);

        await bot.telegram.sendMessage(game.owner_chat_id, msg, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });

        console.log('✅ owner-notify sent to', game.owner_chat_id);
        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('handleOwnerNotify error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  API: /api/bot?action=send-test
//  telegram-admin.html uses this to send a test message to owner.
// ═════════════════════════════════════════════════════════════════════════════
async function handleSendTest(req, res) {
    const { chat_id, message } = req.body || {};
    if (!chat_id || !message) return res.status(400).json({ error: 'chat_id and message required' });
    try {
        await bot.telegram.sendMessage(String(chat_id), message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('handleSendTest error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  VERCEL ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!bot || !supabase) {
        console.error('Bot or Supabase not initialized — check env vars');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const url    = String(req.url || '');
        const action = req.body?.action || '';

        // Health check
        if (req.method === 'GET') {
            return res.status(200).json({ ok: true, service: 'Mystery Temple Bot', ts: new Date().toISOString() });
        }

        if (req.method === 'POST') {
            // Internal API calls from game / admin panel
            if (url.includes('game-complete') || action === 'game_complete')
                return await handleGameComplete(req, res);

            if (url.includes('owner-notify') || action === 'owner_notify')
                return await handleOwnerNotify(req, res);

            if (action === 'send_test')
                return await handleSendTest(req, res);

            // Telegram webhook update
            await bot.handleUpdate(req.body);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Unhandled error:', err.message);
        // Always 200 to Telegram to avoid retries
        return res.status(200).json({ error: 'Internal error', detail: err.message });
    }
};

console.log('✅ bot.js loaded');
