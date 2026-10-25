import { buildFacilityPlanTableMarkup as defaultBuildFacilityPlanTableMarkup } from './facility-plan-table-renderer.js?v=aniimolab_v1';
import { buildFacilityPlanRows as defaultBuildFacilityPlanRows } from './facility-plan-row-renderer.js?v=aniimolab_v1';
import { buildFacilityPlanMarkup as defaultBuildFacilityPlanMarkup } from './facility-plan-renderer.js?v=aniimolab_v1';

export const DEFAULT_ENVIRONMENT_MODE_COLORS = {
    Warm: '#f59e0b',
    Scorching: '#ef4444',
    Cool: '#67e8f9',
    Freeze: '#2563eb',
    Adequate: '#facc15',
};

export function createFacilityPlanViewController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    environmentModeOrder = [],
    environmentRenderer,
    facilityCategories = [],
    facilityCategoryByName = {},
    facilities = [],
    facilityPowerWatts = {},
    selectedHomeLevel = () => 1,
    getFacilityOverrides = () => [],
    getLastEmodeCounts = () => null,
    getOwnedFacilityCounts = () => ({}),
    getLastPlan = () => null,
    renderFacilityIcon,
    renderItemIcon,
    getFacilityDisplayName = name => name,
    prettyItem = name => name,
    prettyReason = reason => reason,
    formatNumber = n => String(n),
    aniimoLabel = (ability, level, specific) => `${ability} ${level}`,
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
    splitEnvironmentRowsByUnit = (rows, assignmentsForMode) => rows,
    splitByEnvironmentUnit = splitEnvironmentRowsByUnit,
    buildFacilityPlanTableMarkup = defaultBuildFacilityPlanTableMarkup,
    buildFacilityPlanRows = defaultBuildFacilityPlanRows,
    buildFacilityPlanMarkup = defaultBuildFacilityPlanMarkup,
    environmentModeColors = DEFAULT_ENVIRONMENT_MODE_COLORS,
} = {}) {
    function listOf(items = []) {
        if (!items || items.length === 0) return '';
        if (items.length === 1) return String(items[0]);
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
    }

    function modeTag(mode) {
        const isVi = isVietnamese();
        const displayMode = (isVi && win?.VI_ENV_MODES && win.VI_ENV_MODES[mode])
            ? win.VI_ENV_MODES[mode]
            : mode;
        const tint = environmentModeColors[mode] || '#9aa0a8';
        return `<span class="env-mode-tag" style="--tint:${tint}">${displayMode}</span>`;
    }

    function whereText(g) {
        if (!g) return '';
        const jobs = g.jobs ? [...g.jobs] : [];
        const where = g.where ? [...g.where.entries()] : [];
        return jobs
            .map(([job, at]) => `${job} ${at.size > 1 ? 'crops' : listOf([...at].map(facility => facility.toLowerCase()))}`)
            .concat(where.map(([place, n]) => `${n > 1 ? n + '× ' : ''}${place}`))
            .join(', ');
    }

    function planRows(rows, options = {}) {
        const isVi = isVietnamese();
        const homeLevel = selectedHomeLevel();
        const facilityOverrides = typeof getFacilityOverrides === 'function' ? getFacilityOverrides() : [];
        const lastEmodeCounts = typeof getLastEmodeCounts === 'function' ? getLastEmodeCounts() : null;
        const lastPlan = typeof getLastPlan === 'function' ? getLastPlan() : null;
        const ownedCounts = typeof getOwnedFacilityCounts === 'function' ? getOwnedFacilityCounts() : {};

        const rendered = buildFacilityPlanRows({
            rows,
            isFarm: options.isFarm || false,
            isVietnamese: isVi,
            homeLevel,
            emodeAvailable: homeLevel >= 12,
            facilities,
            facilityOverrides,
            lastEmodeCounts,
            powerWatts: facilityPowerWatts,
            ownedFacilityCounts: ownedCounts,
            stepIndex: step => (lastPlan?.coin_items || []).indexOf(step),
            renderFacilityIcon,
            renderItemIcon,
            getFacilityDisplayName,
            prettyItem,
            prettyReason,
            formatNumber,
            aniimoLabel,
        });

        if (rendered?.modeUpdates) {
            for (const { step, mode } of rendered.modeUpdates) {
                if (step) step.mode = mode;
            }
        }
        return rendered?.html ?? '';
    }

    function facilityPlanTableOf(groups, options = {}) {
        const isVi = isVietnamese();
        const isFarm = options.isFarm || false;
        const facilityOverrides = typeof getFacilityOverrides === 'function' ? getFacilityOverrides() : [];
        const hasOverrides = facilityOverrides && facilityOverrides.length > 0;
        return buildFacilityPlanTableMarkup({
            groups,
            isFarm,
            isVietnamese: isVi,
            hasOverrides,
            renderRows: rows => planRows(rows, options),
            heading: (key, fallback) => (win?.th ? win.th(key, fallback) : fallback),
        });
    }

    function facilityPlanTable(rows, options = {}) {
        return facilityPlanTableOf([{ rows }], options);
    }

    function renderFacilityPlan(plan) {
        const container = document?.getElementById?.('facility-plan-container');
        if (!container) return;
        const isVi = isVietnamese();
        container.innerHTML = buildFacilityPlanMarkup(plan, {
            environmentModeOrder,
            splitByEnvironmentUnit,
            modeTag,
            environmentRenderer,
            facilityPlanTableOf,
            facilityPlanTable,
            facilityCategories,
            facilityCategoryByName,
            getFacilityDisplayName,
            isVietnamese: isVi,
        });
    }

    return {
        listOf,
        modeTag,
        whereText,
        planRows,
        facilityPlanTable,
        facilityPlanTableOf,
        renderFacilityPlan,
    };
}
