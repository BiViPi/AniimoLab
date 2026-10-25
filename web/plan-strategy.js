// Builds the worker strategy payload without consulting page state.
// Level-up and endgame objectives are mutually exclusive by contract.
export function buildStrategyPlanInput({ commonInput, isEndgame, getPriorities, getLevelUp }) {
    if (isEndgame) {
        return {
            ...commonInput,
            strategy_policy: 'endgame',
            priorities: getPriorities(),
            level_up: null,
            prioritize_byproducts: false,
        };
    }

    return {
        ...commonInput,
        strategy_policy: 'level_up',
        priorities: [],
        level_up: getLevelUp(),
        prioritize_byproducts: false,
    };
}
