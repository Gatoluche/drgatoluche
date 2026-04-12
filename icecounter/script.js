/* ════════════════════════════════════════════════════════════
   SECTION: CONFIGURATION
   ════════════════════════════════════════════════════════════ */

/** Path to the Icecounter backend API handler. */
const API_URL = '/../.backend/icecounter_api.php';

/**
 * Cookie names used to persist the signed-in key pair.
 * NOTE: These are stored client-side. Always serve the
 *       app over HTTPS so credentials aren't sent in clear text.
 */
const COOKIE_A = 'ic_pa';
const COOKIE_B = 'ic_pb';

/** How long login cookies last (30 days in milliseconds). */
const COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Logs fetched per page in infinite-scroll activity list. */
const LOGS_PAGE_SIZE = 5;


/* ════════════════════════════════════════════════════════════
   SECTION: STATE
   ════════════════════════════════════════════════════════════ */

/**
 * Holds the currently signed-in credentials.
 * Null means no active session.
 * @type {{ passwordA: string, passwordB: string } | null}
 */
let session = null;

/**
 * Holds the pending key pair while the create-account modal
 * is open, so the modal's confirm handler can use them.
 * @type {{ passwordA: string, passwordB: string } | null}
 */
let pendingCreate = null;

let logsOffset = 0;
let logsLoading = false;
let logsHasMore = true;


/* ════════════════════════════════════════════════════════════
   SECTION: DOM REFERENCES
   ════════════════════════════════════════════════════════════ */

// Shorthand — getElementById
const el = id => document.getElementById(id);

const statusDot      = el('status-dot');
const statusText     = el('status-text');
const signOutBtn     = el('sign-out-btn');

const counterSection = el('counter-section');
const btnMonster     = el('btn-monster');
const btnIce         = el('btn-ice');
const countMonster   = el('count-monster');
const countIce       = el('count-ice');
const activityPanel  = el('activity-panel');
const inputDescription = el('input-description');
const logsList       = el('logs-list');
const logsStatus     = el('logs-status');

const loginPanel     = el('login-panel');
const inputPA        = el('input-pa');
const inputPB        = el('input-pb');
const confirmBtn     = el('confirm-btn');
const loginError     = el('login-error');

const modalOverlay   = el('modal-overlay');
const modalCancel    = el('modal-cancel');
const modalCreate    = el('modal-create');

const toast          = el('toast');
const bootScreen     = el('boot-screen');


/* ════════════════════════════════════════════════════════════
   SECTION: API HELPER
   ════════════════════════════════════════════════════════════ */

/**
 * POST a JSON body to the Icecounter backend API and return the parsed response.
 * Throws on network errors or non-2xx HTTP status codes.
 *
 * @param {string} action   - The action key for the PHP router.
 * @param {object} [data]   - Additional fields to merge into the body.
 * @returns {Promise<object>}
 */
async function apiPost(action, data = {}) {
    const response = await fetch(API_URL, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body:        JSON.stringify({ action, ...data }),
    });

    let parsed = null;
    let rawText = '';

    try {
        rawText = await response.text();
        parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
        parsed = null;
    }

    if (!response.ok) {
        const detail = parsed?.debug?.error || parsed?.message || rawText || `HTTP ${response.status}`;
        throw new Error(detail);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid API response payload.');
    }

    return parsed;
}

function getErrorMessage(error, fallback = 'Connection error. Please try again.') {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}


/* ════════════════════════════════════════════════════════════
   SECTION: COOKIE UTILITIES
   ════════════════════════════════════════════════════════════ */

/**
 * Write a cookie with a 30-day expiry and SameSite=Strict.
 */
function setCookie(name, value) {
    const expires = new Date(Date.now() + COOKIE_TTL_MS).toUTCString();
    document.cookie = [
        `${name}=${encodeURIComponent(value)}`,
        `expires=${expires}`,
        'path=/',
        'SameSite=Strict',
    ].join('; ');
}

/**
 * Read a cookie by name. Returns null if not found.
 */
function getCookie(name) {
    const pattern = new RegExp('(?:^|; )' + name + '=([^;]*)');
    const match   = document.cookie.match(pattern);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Delete a cookie by setting its expiry to the past.
 */
function deleteCookie(name) {
    document.cookie = [
        `${name}=`,
        'expires=Thu, 01 Jan 1970 00:00:00 UTC',
        'path=/',
        'SameSite=Strict',
    ].join('; ');
}


/* ════════════════════════════════════════════════════════════
   SECTION: TOAST NOTIFICATIONS
   ════════════════════════════════════════════════════════════ */

let toastTimer = null;

/**
 * Show a brief toast message at the bottom of the screen.
 * Auto-hides after 2 seconds.
 *
 * @param {string} message
 */
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}


/* ════════════════════════════════════════════════════════════
   SECTION: COUNT BUMP ANIMATION
   ════════════════════════════════════════════════════════════ */

/**
 * Trigger the pop/bounce animation on a count element.
 * Removes then re-adds the class to restart the animation
 * even if it's already running (force reflow trick).
 *
 * @param {HTMLElement} element
 */
function bump(element) {
    element.classList.remove('count-bump');
    void element.offsetWidth;           // flush paint queue → restart animation
    element.classList.add('count-bump');
}


/* ════════════════════════════════════════════════════════════
   SECTION: UI STATE TRANSITIONS
   Two states: logged-in (shows counters) and logged-out
   (shows login panel). These functions switch between them.
   ════════════════════════════════════════════════════════════ */

/**
 * Switch to the authenticated view and populate counts.
 *
 * @param {number} icecream  - Current ice cream count from the DB.
 * @param {number} monster   - Current monster count from the DB.
 */
function showMainUI(icecream, monster) {
    countIce.textContent     = icecream;
    countMonster.textContent = monster;

    loginPanel.hidden       = true;
    activityPanel.hidden    = false;
    counterSection.hidden   = false;
    signOutBtn.hidden       = false;

    statusDot.classList.add('active');
    statusText.textContent = 'Signed in';
}

/**
 * Switch back to the login view and clear session state.
 */
function showLoginUI() {
    counterSection.hidden = true;
    loginPanel.hidden     = false;
    activityPanel.hidden  = true;
    signOutBtn.hidden     = true;

    if (logsList) {
        logsList.innerHTML = '';
    }
    if (logsStatus) {
        logsStatus.textContent = '';
    }

    logsOffset = 0;
    logsLoading = false;
    logsHasMore = true;

    statusDot.classList.remove('active');
    statusText.textContent = 'Not signed in';

    session = null;
}

/**
 * Display an error message below the confirm button.
 *
 * @param {string} message
 */
function setLoginError(message) {
    loginError.textContent = message;
}

function setLogsStatus(message) {
    if (logsStatus) {
        logsStatus.textContent = message;
    }
}

function createLogElement(log) {
    const item = document.createElement('div');
    item.className = 'log-item';

    const header = document.createElement('div');
    header.className = 'log-item-header';

    const pill = document.createElement('span');
    pill.className = `log-pill ${log.entryType}`;
    pill.textContent = log.entryType === 'monster' ? 'Monster' : 'Ice Cream';

    const stamp = document.createElement('span');
    stamp.textContent = log.timestamp;

    header.appendChild(pill);
    header.appendChild(stamp);

    const description = document.createElement('p');
    description.className = 'log-description';
    description.textContent = log.description;

    item.appendChild(header);
    item.appendChild(description);
    return item;
}

async function loadLogs({ reset = false } = {}) {
    if (!session || logsLoading) return;

    if (reset) {
        logsOffset = 0;
        logsHasMore = true;
        logsList.innerHTML = '';
    }

    if (!logsHasMore) return;

    logsLoading = true;
    setLogsStatus('Loading logs...');

    try {
        const res = await apiPost('list_logs', {
            passwordA: session.passwordA,
            passwordB: session.passwordB,
            offset: logsOffset,
            limit: LOGS_PAGE_SIZE,
        });

        if (res.status === 'unauthorized') {
            deleteCookie(COOKIE_A);
            deleteCookie(COOKIE_B);
            showLoginUI();
            setLoginError('Session expired. Please sign in again.');
            return;
        }

        if (res.status !== 'ok' || !Array.isArray(res.logs)) {
            setLogsStatus('Could not load logs.');
            return;
        }

        if (res.logs.length === 0 && logsOffset === 0) {
            setLogsStatus('No logs yet. Your first increment will appear here.');
            logsHasMore = false;
            return;
        }

        for (const log of res.logs) {
            logsList.appendChild(createLogElement(log));
        }

        logsOffset += res.logs.length;
        logsHasMore = res.logs.length === LOGS_PAGE_SIZE;
        setLogsStatus(logsHasMore ? 'Scroll for more...' : 'End of log history.');
    } catch (error) {
        setLogsStatus(getErrorMessage(error, 'Could not load logs.'));
    } finally {
        logsLoading = false;
    }
}

/**
 * Finalize startup by hiding the loading screen and revealing UI.
 */
function finishBoot() {
    if (bootScreen) {
        bootScreen.style.opacity = '0';
        setTimeout(() => {
            bootScreen.hidden = true;
            document.body.classList.remove('app-booting');
        }, 240);
    } else {
        document.body.classList.remove('app-booting');
    }
}


/* ════════════════════════════════════════════════════════════
   SECTION: AUTO-LOGIN (cookie restore on page load)
   If cookies from a previous session are present, try to
   silently sign back in before showing any UI.
   ════════════════════════════════════════════════════════════ */

async function tryAutoLogin() {
    const savedA = getCookie(COOKIE_A);
    const savedB = getCookie(COOKIE_B);

    if (!savedA || !savedB) {
        // No saved credentials → go straight to login screen
        showLoginUI();
        return;
    }

    try {
        const res = await apiPost('login', { passwordA: savedA, passwordB: savedB });

        if (res.status === 'ok') {
            session = { passwordA: savedA, passwordB: savedB };
            showMainUI(res.icecream, res.monster);
            await loadLogs({ reset: true });
        } else {
            // Saved pair is no longer valid (DB was wiped, etc.)
            deleteCookie(COOKIE_A);
            deleteCookie(COOKIE_B);
            showLoginUI();
        }
    } catch (error) {
        // Network error — still show login so the user can retry
        console.error('icecounter auto-login:', error);
        showLoginUI();
    }
}


/* ════════════════════════════════════════════════════════════
   SECTION: LOGIN — CONFIRM BUTTON
   Validates inputs, hits the API, then either:
     • Signs in with existing counts
     • Opens the create-account modal
     • Shows an inline error
   ════════════════════════════════════════════════════════════ */

confirmBtn.addEventListener('click', async () => {
    const pA = inputPA.value.trim();
    const pB = inputPB.value.trim();

    setLoginError('');

    // ── Client-side validation ──
    if (!pA || !pB) {
        setLoginError('Both keys are required.');
        return;
    }
    if (pA.length > 64 || pB.length > 64) {
        setLoginError('Keys must be 64 characters or fewer.');
        return;
    }

    confirmBtn.disabled = true;

    try {
        const res = await apiPost('login', { passwordA: pA, passwordB: pB });

        switch (res.status) {
            case 'ok':
                // ✓ Valid key pair — save cookies and show the counter UI
                setCookie(COOKIE_A, pA);
                setCookie(COOKIE_B, pB);
                session = { passwordA: pA, passwordB: pB };
                showMainUI(res.icecream, res.monster);
                await loadLogs({ reset: true });
                break;

            case 'not_found':
                // Key pair doesn't exist yet — ask if the user wants to create it
                pendingCreate = { passwordA: pA, passwordB: pB };
                modalOverlay.hidden = false;
                break;

            case 'wrong_password':
                setLoginError('Incorrect key pair.');
                break;

            default:
                setLoginError('Unexpected server response. Please try again.');
        }
    } catch (error) {
        console.error('icecounter login:', error);
        setLoginError(getErrorMessage(error));
    } finally {
        confirmBtn.disabled = false;
    }
});

// Allow submitting with Enter from either input field
[inputPA, inputPB].forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmBtn.click();
    });
});


/* ════════════════════════════════════════════════════════════
   SECTION: CREATE-ACCOUNT MODAL
   ════════════════════════════════════════════════════════════ */

// ── Cancel — close without creating anything ──
modalCancel.addEventListener('click', () => {
    modalOverlay.hidden = true;
    pendingCreate = null;
});

// ── Confirm — call the create endpoint ──
modalCreate.addEventListener('click', async () => {
    if (!pendingCreate) return;

    modalCreate.disabled = true;

    try {
        const res = await apiPost('create', pendingCreate);

        switch (res.status) {
            case 'ok':
                setCookie(COOKIE_A, pendingCreate.passwordA);
                setCookie(COOKIE_B, pendingCreate.passwordB);
                session       = pendingCreate;
                pendingCreate = null;
                modalOverlay.hidden = true;
                showMainUI(0, 0);
                await loadLogs({ reset: true });
                showToast('Account created!');
                break;

            case 'exists':
                // Race condition: someone else created the same passwordA between
                // the login check and now. Just ask the user to sign in normally.
                modalOverlay.hidden = true;
                pendingCreate = null;
                setLoginError('Key pair already exists — please sign in.');
                break;

            default:
                modalOverlay.hidden = true;
                setLoginError('Could not create account. Please try again.');
        }
    } catch (error) {
        console.error('icecounter create:', error);
        modalOverlay.hidden = true;
        setLoginError(getErrorMessage(error));
    } finally {
        modalCreate.disabled = false;
    }
});


/* ════════════════════════════════════════════════════════════
   SECTION: SIGN OUT
   ════════════════════════════════════════════════════════════ */

signOutBtn.addEventListener('click', () => {
    deleteCookie(COOKIE_A);
    deleteCookie(COOKIE_B);
    // Clear visible counts so re-login visibly reloads from DB.
    countMonster.textContent = '0';
    countIce.textContent = '0';
    inputPA.value = '';
    inputPB.value = '';
    inputDescription.value = '';
    setLoginError('');
    showLoginUI();
    showToast('Signed out.');
});


/* ════════════════════════════════════════════════════════════
   SECTION: INCREMENT COUNTERS
   Re-sends credentials with each request (stateless API).
   On success: updates the displayed number with a bump anim.
   On unauthorized: drops back to login (session expired).
   ════════════════════════════════════════════════════════════ */

/**
 * Increment a counter field in the database and update the DOM.
 *
 * @param {'monster' | 'icecream'} field - The DB column to increment.
 */
async function increment(field) {
    if (!session) return;   // Defensive: button shouldn't be clickable anyway

    const description = inputDescription.value.trim();
    if (!description) {
        showToast('Please add a description before logging this increment.');
        return;
    }

    try {
        const res = await apiPost('increment', {
            passwordA: session.passwordA,
            passwordB: session.passwordB,
            field,
            description,
        });

        switch (res.status) {
            case 'ok':
                if (field === 'monster') {
                    countMonster.textContent = res.newValue;
                    bump(countMonster);
                    showToast(`+1 Monster 🥤 - ${res.description}`);
                } else {
                    countIce.textContent = res.newValue;
                    bump(countIce);
                    showToast(`+1 Ice Cream 🍦 - ${res.description}`);
                }
                inputDescription.value = '';
                await loadLogs({ reset: true });
                inputDescription.focus();
                break;

            case 'invalid_description':
                showToast('Description is required (max 280 characters).');
                break;

            case 'unauthorized':
                // Cookies are stale (DB was cleared, etc.) — force re-login
                deleteCookie(COOKIE_A);
                deleteCookie(COOKIE_B);
                showLoginUI();
                setLoginError('Session expired. Please sign in again.');
                break;

            default:
                showToast('Something went wrong — try again.');
        }
    } catch (error) {
        console.error('icecounter increment:', error);
        showToast(getErrorMessage(error, 'Connection error.'));
    }
}

btnMonster.addEventListener('click', () => increment('monster'));
btnIce.addEventListener('click',     () => increment('icecream'));

if (logsList) {
    logsList.addEventListener('scroll', () => {
        const nearBottom = logsList.scrollTop + logsList.clientHeight >= logsList.scrollHeight - 24;
        if (nearBottom) {
            loadLogs();
        }
    });
}


/* ════════════════════════════════════════════════════════════
   SECTION: INIT
   ════════════════════════════════════════════════════════════ */

async function initApp() {
    // Lock UI while auth state is verified to avoid signed-out flicker.
    document.body.classList.add('app-booting');

    try {
        await tryAutoLogin();
    } finally {
        finishBoot();
    }
}

initApp();
