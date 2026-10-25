// Resolves the worker assignment mode used by the standard Aniimo crew summary.
// Kept pure so renderer mode fallbacks can be verified independently from app state.
export function resolveAniimoCrewStepMode({ step = {}, baseFacility, emodeAvailable, overrides = [] }) {
    if (step.mode) return step.mode;

    const rawFacility = step.facility || '';
    if (emodeAvailable && (step.is_emode || rawFacility.includes('(Electric)'))) return 'electric';
    if (step.is_manual || rawFacility.includes('(Manual)') || step.item_name?.includes('__manual')) return 'manual';
    if (step.is_specialist || rawFacility.includes('(Prismana)') || step.item_name?.includes('__specialist')) return 'prismana';

    const override = overrides.find(item => item.facility === baseFacility);
    if (override?.target_mode) return override.target_mode;
    return 'prismana';
}
