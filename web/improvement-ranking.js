// Generates immutable plan variants the ranking worker can compare with the current plan.
// Game data and page-owned choices are injected so candidate construction is independently testable.
export function createImprovementCandidateBuilder(deps) {
    const tierCount = tiers => (tiers || []).reduce((sum, tier) => sum + tier.count, 0);
    const tierLevel = tiers => Math.max(0, ...(tiers || []).filter(tier => tier.count > 0).map(tier => tier.level));

    function homeLevelCovering(input) {
        for (let level = 1; level <= deps.maxHomeLevel; level++) {
            const allowed = deps.simpleSetup(level);
            const facilitiesFit = deps.facilities.every(facility => {
                const have = input.facilities[facility.name];
                if (tierCount(have) === 0) return true;
                const cap = allowed.facilities[facility.name];
                return tierCount(have) <= tierCount(cap)
                    && (facility.hasLevels === false || tierLevel(have) <= tierLevel(cap));
            });
            const modulesFit = Object.entries(input.modules).every(([name, level_]) => level_ <= (allowed.modules[name] ?? 0));
            if (facilitiesFit && modulesFit) return level;
        }
        return deps.maxHomeLevel;
    }

    function improvementCandidates(base, setup) {
        const candidates = [];
        const owns = name => tierCount(base.facilities[name]) > 0;
        const planContext = deps.getPlanContext();
        const skipped = new Set(planContext?.skipped ?? deps.getSkippedRecipes());
        const locked = [
            ...deps.specialRecipes.map(recipe => ({ ...recipe, note: false })),
            ...(base.season ? deps.seasonRecipeNotes.map(recipe => ({ ...recipe, note: true })) : []),
        ];
        for (const recipe of locked) {
            if (!base.exclude.includes(recipe.name) || skipped.has(recipe.name)) continue;
            if (recipe.facility && !owns(recipe.facility)) continue;
            candidates.push({
                kind: 'Recipes',
                label: recipe.note ? `Recipe Note: ${deps.prettyItem(recipe.name)}` : `Unlock ${deps.prettyItem(recipe.name)}`,
                input: { ...base, exclude: base.exclude.filter(name => name !== recipe.name) },
            });
        }

        for (const name of [...skipped].sort((a, b) => deps.prettyItem(a).localeCompare(deps.prettyItem(b)))) {
            if (!base.exclude.includes(name)) continue;
            candidates.push({
                kind: 'Recipes',
                label: `Unskip ${deps.prettyItem(name)}`,
                input: { ...base, exclude: base.exclude.filter(item => item !== name) },
            });
        }

        const levelsAbove = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, index) => from + 1 + index);
        const abilities = new Set(deps.facilities.filter(facility => facility.ability && owns(facility.name)).map(facility => facility.ability));
        if (setup.startsWith('roster') && base.roster) {
            const roster = deps.getRoster();
            base.roster.members.forEach((member, index) => {
                const rosterMember = roster[index] || member;
                const who = rosterMember.name?.trim()
                    ? deps.escapeText(rosterMember.name.trim())
                    : `${deps.getRosterLabel(rosterMember, index)} Aniimo`;
                for (const [ability, level] of Object.entries(member.abilities).filter(([name]) => abilities.has(name))) {
                    for (const next of levelsAbove(level, deps.defaultLevelFor(ability))) {
                        const trained = { ...member, count: 1, abilities: { ...member.abilities, [ability]: next } };
                        const members = member.count > 1
                            ? [...base.roster.members.map((current, i) => (i === index ? { ...current, count: current.count - 1 } : current)), trained]
                            : base.roster.members.map((current, i) => (i === index ? trained : current));
                        const family = `${member.count > 1 ? 'One ' : ''}${who}: ${ability}`;
                        candidates.push({
                            kind: 'Aniimo', group: `roster:${index}:${ability}`, family, level: next,
                            label: `${family} Lv.${next}`,
                            input: { ...base, roster: { ...base.roster, members } },
                        });
                    }
                }
            });
        }
        if (setup.startsWith('best')) {
            for (const ability of deps.getLevelledAbilities().filter(name => abilities.has(name))) {
                const level = base.aniimo_levels[ability] ?? deps.defaultLevelFor(ability);
                for (const next of levelsAbove(level, deps.defaultLevelFor(ability))) {
                    candidates.push({
                        kind: 'Aniimo', group: `aniimo:${ability}`, family: `${ability} Aniimo`, level: next,
                        label: `${ability} Aniimo Lv.${next}`,
                        input: { ...base, aniimo_levels: { ...base.aniimo_levels, [ability]: next } },
                    });
                }
            }
        }

        if (planContext && !planContext.simple) {
            const allowed = deps.simpleSetup(homeLevelCovering(base));
            for (const [module, level] of Object.entries(base.modules)) {
                for (const next of levelsAbove(level, allowed.modules[module] ?? 0)) {
                    candidates.push({
                        kind: 'Modules', group: `module:${module}`, family: deps.moduleNames[module] || module, level: next,
                        label: `${deps.moduleNames[module] || module} Lv.${next}`,
                        input: { ...base, modules: { ...base.modules, [module]: next } },
                    });
                }
            }
            for (const facility of deps.facilities) {
                const tiers = (base.facilities[facility.name] || []).filter(tier => tier.count > 0);
                const cap = allowed.facilities[facility.name];
                const capLevel = facility.hasLevels === false ? 1 : tierLevel(cap);
                if (tierCount(tiers) < tierCount(cap)) {
                    for (const level of levelsAbove(0, capLevel)) {
                        candidates.push({
                            kind: 'Facilities', group: `another:${facility.name}`, family: `+1 ${facility.name}`,
                            level: facility.hasLevels === false || capLevel === 1 ? null : level,
                            label: facility.hasLevels === false || capLevel === 1 ? `+1 ${facility.name}` : `+1 ${facility.name} (Lv.${level})`,
                            input: { ...base, facilities: { ...base.facilities, [facility.name]: [...tiers, { count: 1, level }] } },
                        });
                    }
                }
                if (facility.hasLevels === false || tiers.length === 0) continue;
                const lowest = tiers.reduce((first, tier) => tier.level < first.level ? tier : first);
                for (const level of levelsAbove(lowest.level, capLevel)) {
                    const raised = tiers
                        .map(tier => tier === lowest ? { ...tier, count: tier.count - 1 } : tier)
                        .filter(tier => tier.count > 0)
                        .concat({ count: 1, level });
                    candidates.push({
                        kind: 'Facilities', group: `upgrade:${facility.name}`, level,
                        family: tierCount(tiers) > 1 ? `1 ${facility.name} to` : `${facility.name} to`,
                        label: tierCount(tiers) > 1 ? `1 ${facility.name} to Lv.${level}` : `${facility.name} to Lv.${level}`,
                        input: { ...base, facilities: { ...base.facilities, [facility.name]: raised } },
                    });
                }
            }
        }
        return candidates;
    }

    return { homeLevelCovering, improvementCandidates };
}

// Fans ranking candidates out over a bounded worker pool and rejects events from stopped runs.
export function createImprovementRankingController({ WorkerImpl = Worker, workerUrl, workerCount }) {
    let generation = 0;
    let workers = [];

    function stop() {
        generation++;
        workers.forEach(worker => worker.terminate());
        workers = [];
    }

    function start({ measure, base, candidates, baseTop, onProgress = () => {}, onError = () => {}, onComplete = () => {} }) {
        stop();
        if (!candidates.length) {
            onComplete(false);
            return 0;
        }

        const currentGeneration = generation;
        const shares = Array.from({ length: Math.min(workerCount, candidates.length) }, () => []);
        candidates.forEach((candidate, index) => shares[index % shares.length].push(index));
        let running = shares.length;
        let failed = false;

        const finish = (worker, didFail) => {
            worker.terminate();
            failed ||= didFail;
            if (currentGeneration !== generation) return;
            if (--running === 0) {
                workers = [];
                onComplete(failed);
            }
        };

        workers = shares.map(indices => {
            const worker = new WorkerImpl(workerUrl, { type: 'module' });
            let finished = false;
            const complete = didFail => {
                if (finished) return;
                finished = true;
                finish(worker, didFail);
            };
            worker.onmessage = event => {
                if (currentGeneration !== generation) return;
                const { type, count, ok, error } = event.data;
                if (type === 'progress') {
                    const candidateIndex = count.index === -1 ? null : indices[count.index];
                    onProgress(count, candidateIndex);
                    return;
                }
                if (!ok) onError(error);
                complete(!ok);
            };
            worker.onerror = event => {
                if (currentGeneration !== generation) return;
                onError(event);
                complete(true);
            };
            worker.postMessage({
                id: 1,
                type: 'rank_improvements',
                payload: JSON.stringify({ measure, base, candidates: indices.map(index => candidates[index].input), baseTop }),
            });
            return worker;
        });
        return workers.length;
    }

    return { start, stop };
}

export function calculateImprovementGain({
    result,
    base,
    measure,
    aniipod,
    unit,
    rankMinGain,
    paceUnitSeconds,
    formatters,
}) {
    if (!result || result.top == null || !base || base.top == null) return null;
    const about = result.proven === false || base.proven === false ? '~' : '';
    const { multiplier, suffix } = unit;

    if (result.top > base.top * (1 + rankMinGain) + 1e-12) {
        if (measure === 'level_up') {
            const before = base.top > 0 ? paceUnitSeconds / base.top : null;
            const after = paceUnitSeconds / result.top;
            return {
                score: 1 + (before ? (before - after) / before : 1),
                text: before
                    ? `${about}−${formatters.formatDuration(before - after)} level-up (${formatters.formatDuration(after)})`
                    : `Level-up in ${about}${formatters.formatDuration(after)}`,
            };
        }
        const label = measure === 'coins' ? 'Home Coins' : formatters.priorityLabel(measure, aniipod);
        const added = `+${formatters.formatRate((result.top - base.top) * multiplier)}${suffix}`;
        return {
            score: 1 + (base.top > 0 ? (result.top - base.top) / base.top : 1),
            text: base.top > 0
                ? `${about}+${formatters.formatPercent((result.top - base.top) / base.top)} ${label} (${added})`
                : `${about}${added} ${label}`,
        };
    }

    const coins = result.coins;
    if (coins && coins.base > 0 && coins.value > coins.base * (1 + rankMinGain)) {
        const gain = (coins.value - coins.base) / coins.base;
        return {
            score: gain,
            text: `${about}+${formatters.formatPercent(gain)} Home Coins (+${formatters.formatRate((coins.value - coins.base) * multiplier)}${suffix})`,
        };
    }
    return null;
}

// Projects worker results into the data the ranking view needs. This stays free of DOM/HTML so
// grouping, progress, and ordering can be checked independently from the renderer.
export function buildImprovementRankingViewModel({ ranking, getGain, rankMinGain, priorityLabel }) {
    if (!ranking) return null;
    const candidates = ranking.candidates || [];
    const results = ranking.results || [];
    const checked = results.filter(Boolean).length;
    const total = candidates.length;
    const within = ranking.homeLevel ? ` Within RV ${ranking.homeLevel} limits.` : '';
    const by = ranking.measure === 'level_up' ? 'level-up time, then Home Coins'
        : ranking.measure === 'coins' ? 'Home Coins' : `${priorityLabel(ranking.measure)}, then Home Coins`;

    const best = new Map();
    candidates.forEach((candidate, index) => {
        const gain = getGain(results[index]);
        if (!gain) return;
        const key = candidate.group || `#${index}`;
        const held = best.get(key);
        if (!held || gain.score > held.gain.score * (1 + rankMinGain)) best.set(key, { candidate, gain });
    });
    const rows = [...best.values()].sort((a, b) => b.gain.score - a.gain.score);
    const options = new Set(candidates.map((candidate, index) => candidate.group || `#${index}`)).size;
    const status = total === 0 ? `Nothing left to unlock or upgrade.${within}`
        : !ranking.done ? `Checking ${checked} of ${total}…${within}`
            : rows.length === 0 ? `No improvements found (${options} checked).${within}`
                : `Ranked by ${by}. ${rows.length} of ${options} help.${within}`;

    const groups = new Map();
    candidates.forEach((candidate, index) => {
        const key = candidate.group || `#${index}`;
        if (!groups.has(key)) groups.set(key, { kind: candidate.kind, candidates: [], indices: [] });
        groups.get(key).candidates.push(candidate);
        groups.get(key).indices.push(index);
    });
    const checkedByKind = new Map();
    for (const [key, group] of groups) {
        const first = group.candidates[0];
        const levels = group.candidates.map(candidate => candidate.level).filter(level => level != null);
        const name = first.family
            ? `${first.family}${levels.length ? ` Lv.${levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0]}` : ''}`
            : first.label;
        const found = best.get(key);
        const entry = {
            name,
            done: group.indices.every(index => !!results[index]),
            gain: found?.gain || null,
            levelPrefix: found?.candidate.level != null && levels.length > 1 ? `Lv.${found.candidate.level}: ` : '',
        };
        if (!checkedByKind.has(group.kind)) checkedByKind.set(group.kind, []);
        checkedByKind.get(group.kind).push(entry);
    }

    return { checked, total, options, status, rows, checkedGroups: [...checkedByKind].map(([kind, entries]) => ({ kind, entries })) };
}
