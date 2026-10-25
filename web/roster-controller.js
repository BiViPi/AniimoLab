export function createRosterController(options) {
    let replanTimer = null;
    const getRoster = options.getRoster;
    const setRoster = options.setRoster;

    function rosterChanged(rerender = true) {
        options.saveInputsToStorage();
        if (rerender) options.renderRoster();
        options.clearTimeoutFn(replanTimer);
        replanTimer = options.setTimeoutFn(options.switchAniimoSetup, 700);
    }

    function importBestTeam() {
        const cards = new Map();
        for (const group of options.getBestTeam() || []) {
            const personalities = options.personalityPairs.map(pair => pair.names.find(name => group.personalities?.has(name)) || pair.names[0]);
            const key = `${group.ability}|${group.level}|${personalities.join()}`;
            if (cards.has(key)) cards.get(key).count += group.count;
            else cards.set(key, { ...options.createNewAniimo({ [group.ability]: group.level }, personalities), count: group.count });
        }
        setRoster([...cards.values()]);
    }

    function attachHandlers() {
        const editor = options.document.getElementById('roster-editor');
        if (!editor) return;
        editor.addEventListener('click', event => {
            const button = event.target.closest('button');
            if (!button) return;
            const { count, remove, drop, roster: action } = button.dataset;
            const roster = getRoster();
            if (count) {
                const [index, by] = count.split('|').map(Number);
                roster[index].count = Math.max(1, roster[index].count + by);
            } else if (remove) {
                roster.splice(Number(remove), 1);
            } else if (drop) {
                const [index, ability] = drop.split('|');
                delete roster[Number(index)].abilities[ability];
            } else if (action === 'add') {
                roster.push(options.createNewAniimo());
            } else if (action === 'from-best' && options.getBestTeam()) {
                importBestTeam();
            } else return;
            rosterChanged();
        });

        editor.addEventListener('change', event => {
            const { level, personality, add, name } = event.target.dataset;
            const roster = getRoster();
            if (level) {
                const [index, ability] = level.split('|');
                roster[Number(index)].abilities[ability] = Number(event.target.value);
            } else if (personality) {
                const [index, pair] = personality.split('|').map(Number);
                roster[index].personalities[pair] = event.target.value;
            } else if (add) {
                if (!event.target.value) return;
                roster[Number(add)].abilities[event.target.value] = 1;
            } else if (name !== undefined) {
                roster[Number(name)].name = event.target.value;
                options.saveInputsToStorage();
                return;
            } else return;
            rosterChanged();
        });
    }

    return { attachHandlers, rosterChanged };
}
