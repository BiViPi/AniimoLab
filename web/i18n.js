/**
 * AniimoLab i18n Core Module
 * Manages language selection and translations using independent locale files:
 * - web/locales/vi.js (Vietnamese)
 * - web/locales/en.js (English)
 */

const I18N_STORAGE_KEY = 'aniimolab_lang';

let currentLang = 'vi';

function getActiveLocale() {
    if (currentLang === 'vi') {
        return window.LOCALE_VI || {};
    }
    return window.LOCALE_EN || {};
}

function getFallbackLocale() {
    return window.LOCALE_EN || {};
}

function initI18n() {
    try {
        const saved = localStorage.getItem(I18N_STORAGE_KEY);
        if (saved === 'vi' || saved === 'en') {
            currentLang = saved;
        } else {
            // Default to Vietnamese
            currentLang = 'vi';
        }
    } catch (e) {
        currentLang = 'vi';
    }
    applyI18n();
}

function getLang() {
    return currentLang;
}

function setLang(lang) {
    if (lang !== 'vi' && lang !== 'en') return;
    currentLang = lang;
    try {
        localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch (e) {}
    applyI18n();
    // Dispatch event so app.js and other components re-render immediately
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function toggleLang() {
    setLang(currentLang === 'vi' ? 'en' : 'vi');
}

/**
 * Translate a UI key with optional fallback and parameter interpolation
 * @param {string} key 
 * @param {string|object} [fallback] 
 * @param {object} [params] 
 * @returns {string}
 */
function t(key, fallback = '', params = null) {
    if (typeof fallback === 'object' && fallback !== null && !params) {
        params = fallback;
        fallback = '';
    }

    const locale = getActiveLocale();
    const ui = locale.ui || {};

    let text = ui[key];
    if (text === undefined) {
        const fbLocale = getFallbackLocale();
        const fbUi = fbLocale.ui || {};
        text = fbUi[key];
    }

    if (text === undefined) {
        text = fallback || key;
    }

    if (params && typeof text === 'string') {
        Object.entries(params).forEach(([pKey, pVal]) => {
            text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
        });
    }

    return text;
}

/**
 * Translate facility display name
 */
function getFacilityDisplayName(name) {
    if (!name) return name;
    const locale = getActiveLocale();
    const facDict = locale.facilities || {};

    const cleanName = name.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();
    const isElectric = name.includes('(Electric)') || name.includes('(Điện)');
    const isManual = name.includes('(Manual)') || name.includes('(Thủ công)');

    let suffix = '';
    if (isElectric) {
        suffix = currentLang === 'vi' ? ' (Điện)' : ' (Electric)';
    } else if (isManual) {
        suffix = currentLang === 'vi' ? ' (Thủ công)' : ' (Manual)';
    }

    if (facDict[cleanName]) {
        return facDict[cleanName] + suffix;
    }

    // Fallback: check other locale
    const fb = getFallbackLocale().facilities || {};
    if (fb[cleanName]) {
        return fb[cleanName] + suffix;
    }

    return name;
}

/**
 * Translate climate/environment mode name (Scorching, Warm, Cool, Freeze, etc.)
 */
function getModeDisplayName(mode) {
    if (!mode) return mode;
    const locale = getActiveLocale();
    const modes = locale.modes || {};
    if (modes[mode]) return modes[mode];

    // Fallback
    const fbModes = getFallbackLocale().modes || {};
    if (fbModes[mode]) return fbModes[mode];

    return mode;
}

/**
 * Translate upgrade module name
 */
function getModuleDisplayName(name) {
    if (!name) return name;
    const locale = getActiveLocale();
    const modules = locale.modules || {};
    if (modules[name]) return modules[name];

    const fbModules = getFallbackLocale().modules || {};
    if (fbModules[name]) return fbModules[name];

    return name.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

/**
 * Translate item/crop/material name
 */
function getItemDisplayName(name) {
    if (!name) return name;
    const base = name.replace(/__(specialist|manual)$/, '');
    const snake = base.toLowerCase().replace(/[\s-]+/g, '_');

    const locale = getActiveLocale();
    const items = locale.items || {};

    if (items[name]) return items[name];
    if (items[base]) return items[base];
    if (items[snake]) return items[snake];

    const fbItems = getFallbackLocale().items || {};
    if (fbItems[name]) return fbItems[name];
    if (fbItems[base]) return fbItems[base];
    if (fbItems[snake]) return fbItems[snake];

    return base.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

/**
 * Translate Aniimo ability (Fire, Water, Earth, etc.)
 */
function getAbilityDisplayName(ability) {
    if (!ability) return ability;
    const locale = getActiveLocale();
    const abilities = locale.abilities || {};
    return abilities[ability] || ability;
}

/**
 * Translate Aniimo personality (Instinctive, Energetic, etc.)
 */
function getPersonalityDisplayName(personality) {
    if (!personality) return personality;
    const locale = getActiveLocale();
    const personalities = locale.personalities || {};
    return personalities[personality] || personality;
}

/**
 * Translate facility category (Materials, Environment, etc.)
 */
function getCategoryDisplayName(cat) {
    if (!cat) return cat;
    const locale = getActiveLocale();
    const categories = locale.categories || {};
    return categories[cat] || cat;
}

/**
 * Translate job step (seed, water, harvest, etc.)
 */
function getJobStepDisplayName(step) {
    if (!step) return step;
    const locale = getActiveLocale();
    const steps = locale.jobSteps || {};
    return steps[step] || step;
}

/**
 * Get layout template string with parameter replacement
 */
function getLayoutString(key, params = {}) {
    const locale = getActiveLocale();
    const layout = locale.layout || {};
    let text = layout[key];
    if (text === undefined) {
        text = (getFallbackLocale().layout || {})[key] || key;
    }
    if (typeof text === 'string') {
        Object.entries(params).forEach(([pKey, pVal]) => {
            text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
        });
    }
    return text;
}

/**
 * Apply translations to DOM elements
 */
function applyI18n() {
    // 1. Text elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            const val = t(key);
            if (val) el.textContent = val;
        }
    });

    // 1b. HTML elements with data-i18n-html
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (key) {
            const val = t(key);
            if (val) el.innerHTML = val;
        }
    });

    // 2. Titles with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('title', val);
        }
    });

    // 3. Placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            const val = t(key);
            if (val) el.setAttribute('placeholder', val);
        }
    });

    // 4. Update language toggle button label
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.innerHTML = currentLang === 'vi' 
            ? '<span class="btn-sym">🇻🇳</span> VI' 
            : '<span class="btn-sym">🇬🇧</span> EN';
        langBtn.title = currentLang === 'vi' ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt';
    }

    // 5. Update html lang attribute
    document.documentElement.lang = currentLang;

    // 6. Update theme button text
    if (typeof updateThemeButton === 'function') {
        const isLight = document.body.classList.contains('light');
        updateThemeButton(isLight);
    }
}

// Global exposure for seamless application-wide access
window.i18n = {
    init: initI18n,
    getLang,
    setLang,
    toggleLang,
    t,
    apply: applyI18n,
    getFacilityDisplayName,
    getModeDisplayName,
    getModuleDisplayName,
    getItemDisplayName,
    getAbilityDisplayName,
    getPersonalityDisplayName,
    getCategoryDisplayName,
    getJobStepDisplayName,
    getLayoutString,
    // Access active dictionaries
    get facilities() { return getActiveLocale().facilities || {}; },
    get modes() { return getActiveLocale().modes || {}; },
    get abilities() { return getActiveLocale().abilities || {}; },
    get modules() { return getActiveLocale().modules || {}; },
    get personalities() { return getActiveLocale().personalities || {}; },
    get items() { return getActiveLocale().items || {}; },
    get categories() { return getActiveLocale().categories || {}; },
    get jobSteps() { return getActiveLocale().jobSteps || {}; },
    get layout() { return getActiveLocale().layout || {}; }
};

// Global shortcuts
window.t = t;
window.th = (key, fallback) => t(key, fallback);
window.getFacilityDisplayName = getFacilityDisplayName;
window.getModeDisplayName = getModeDisplayName;
window.getModuleDisplayName = getModuleDisplayName;
window.getItemDisplayName = getItemDisplayName;
window.getPersonalityDisplayName = getPersonalityDisplayName;
window.getAbilityDisplayName = getAbilityDisplayName;
window.getCategoryDisplayName = getCategoryDisplayName;
window.getJobStepDisplayName = getJobStepDisplayName;
window.getLayoutString = getLayoutString;

// Backward-compatible dictionary references
Object.defineProperty(window, 'VI_FACILITY_NAMES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.facilities : {}) });
Object.defineProperty(window, 'VI_ENV_MODES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.modes : {}) });
Object.defineProperty(window, 'VI_ABILITIES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.abilities : {}) });
Object.defineProperty(window, 'VI_MODULE_NAMES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.modules : {}) });
Object.defineProperty(window, 'VI_PERSONALITIES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.personalities : {}) });
Object.defineProperty(window, 'VI_ITEM_NAMES', { get: () => (window.LOCALE_VI ? window.LOCALE_VI.items : {}) });
