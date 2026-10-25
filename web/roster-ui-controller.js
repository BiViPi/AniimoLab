import { buildRosterEditorMarkup } from './roster-editor-renderer.js';
import { calculateAniimoRosterSummary } from './aniimo-roster-summary.js';
import { createRosterController } from './roster-controller.js';
import { buildRosterSummaryMarkup } from './roster-summary-renderer.js';

export function createRosterUIController({
    document,
    window,
    facilities = [],
    abilities = [],
    personalityPairs = [],
    environmentBuildingAbility = {},
    personalityLetter,
    abilityTag,
    escapeText = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    prettyItem = x => x,
    getRecipeIndex = () => [],
    saveInputsToStorage,
    switchAniimoSetup,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
}) {
    let roster = [];
    let lastBestTeam = null;

    const residentFacilities = new Set(facilities.filter(f => f.category === 'Aniimo Materials').map(f => f.name));

    function getRoster() {
        return roster;
    }

    function setRoster(value) {
        roster = Array.isArray(value) ? value : [];
    }

    function getLastBestTeam() {
        return lastBestTeam;
    }

    function setLastBestTeam(team) {
        lastBestTeam = team;
    }

    function newRosterAniimo(currentAbilities = {}, currentPersonalities = null) {
        return {
            name: '',
            count: 1,
            abilities: currentAbilities,
            personalities: currentPersonalities || personalityPairs.map(pair => pair.names[0]),
        };
    }

    function rosterPayload() {
        return {
            members: roster.map(a => ({ count: a.count, abilities: a.abilities, personalities: a.personalities })),
            residents: [...residentFacilities],
            environment: environmentBuildingAbility,
            personalities: Object.fromEntries(facilities.filter(f => f.personality).map(f => [f.name, f.personality])),
        };
    }

    function rosterLabel(aniimo, i) {
        if (aniimo.name?.trim()) return escapeText(aniimo.name.trim());
        const abs = Object.entries(aniimo.abilities || {}).map(([ability, level]) => `${ability} ${level}`).join(', ');
        return abs || `Aniimo ${i + 1}`;
    }

    function renderRoster() {
        const editor = document.getElementById('roster-editor');
        if (!editor) return;
        editor.innerHTML = buildRosterEditorMarkup({
            roster,
            abilities,
            personalityPairs,
            lastBestTeam,
            abilityTag,
            escapeText,
        });
    }

    function showSetupOnly() {
        const content = document.getElementById('results-content');
        if (content) {
            content.style.display = 'block';
            content.classList.add('setup-only');
        }
        const collapsedSummary = document.getElementById('aniimo-collapsed-summary');
        if (collapsedSummary) collapsedSummary.textContent = '';
        const summary = document.getElementById('aniimo-summary');
        if (summary) summary.innerHTML = '';
        const abilitiesEl = document.getElementById('aniimo-abilities');
        if (abilitiesEl) abilitiesEl.innerHTML = '';
        const count = document.getElementById('aniimo-count');
        if (count) count.hidden = true;
    }

    function showRosterShortfall() {
        const errEl = document.getElementById('error-message');
        if (errEl) errEl.style.display = 'none';
        showSetupOnly();
        const anyAble = roster.some(a => a.count > 0 && Object.keys(a.abilities || {}).length);
        const collapsedSummary = document.getElementById('aniimo-collapsed-summary');
        if (collapsedSummary) {
            collapsedSummary.textContent = anyAble ? 'No plan found with these Aniimo.' : '';
        }
    }

    const rosterController = createRosterController({
        document,
        getRoster,
        setRoster,
        getBestTeam: getLastBestTeam,
        createNewAniimo: newRosterAniimo,
        personalityPairs,
        saveInputsToStorage,
        renderRoster,
        switchAniimoSetup,
        setTimeoutFn,
        clearTimeoutFn,
    });

    function rosterChanged(rerender = true) {
        rosterController.rosterChanged(rerender);
    }

    function attachRosterHandlers() {
        rosterController.attachHandlers();
    }

    function renderRosterSummary(plan, options = {}) {
        const isVi = window?.i18n && window.i18n.getLang() === 'vi';
        const activeRoster = options.roster || options.crew?.members || roster;
        const recipeIndex = getRecipeIndex ? getRecipeIndex() : [];

        const { working, have, busy, where, guardDoubleCountingViolations, guardMappingErrors } = calculateAniimoRosterSummary(plan, {
            roster: activeRoster,
            residentFacilities,
            recipeIndex,
            prettyItem,
            rosterLabel,
            isVietnamese: isVi,
        });

        const rosterSummaryMarkup = buildRosterSummaryMarkup({
            roster: activeRoster,
            busy,
            where,
            guardDoubleCountingViolations,
            guardMappingErrors,
            working,
            have,
            isVi,
            rosterLabel,
            abilityTag,
            personalityLetter,
            labels: {
                aniimo: window?.th ? window.th('th_aniimo', 'Aniimo') : 'Aniimo',
                howMany: window?.th ? window.th('th_how_many', 'How many') : 'How many',
                busyAverage: window?.th ? window.th('th_busy_avg', 'Busy on average') : 'Busy on average',
                where: window?.th ? window.th('th_where', 'Where') : 'Where',
            },
        });

        const container = document.getElementById('aniimo-summary');
        if (container) {
            container.innerHTML = rosterSummaryMarkup;
        }
        const collapsedSummary = document.getElementById('aniimo-collapsed-summary');
        if (collapsedSummary) collapsedSummary.textContent = '';
        const abilitiesEl = document.getElementById('aniimo-abilities');
        if (abilitiesEl) abilitiesEl.innerHTML = '';
        const count = document.getElementById('aniimo-count');
        if (count) {
            const haveEl = document.getElementById('aniimo-count-have');
            if (haveEl) haveEl.textContent = working;
            const of = document.getElementById('aniimo-count-of');
            if (of) {
                of.textContent = have;
                of.hidden = false;
            }
            count.hidden = false;
            count.classList.remove('over');
            count.title = `${working} of your ${have} Aniimo have work in this plan`;
        }

        return {
            working,
            have,
            busy,
            where,
            guardDoubleCountingViolations,
            guardMappingErrors,
        };
    }

    return {
        getRoster,
        setRoster,
        getLastBestTeam,
        setLastBestTeam,
        newRosterAniimo,
        rosterPayload,
        rosterLabel,
        renderRoster,
        showRosterShortfall,
        showSetupOnly,
        rosterChanged,
        attachRosterHandlers,
        renderRosterSummary,
    };
}
