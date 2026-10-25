export function buildImprovementRankingMarkup({ model, open = false }) {
    if (!model.total) return `<p class="hint">${model.status}</p>`;
    const checked = `<details class="explain improve-checked"${open ? ' open' : ''}><summary>${model.status}</summary>${model.checkedGroups
        .map(({ kind, entries }) => `<p class="assume-title">${kind}</p><ul class="improve-checked-list">${entries.map(entry => {
            const outcome = entry.gain
                ? `<span class="improve-gain">${entry.levelPrefix}${entry.gain.text}</span>`
                : `<span class="improve-none">${entry.done ? 'no gain' : 'checking…'}</span>`;
            return `<li><span>${entry.name}</span>${outcome}</li>`;
        }).join('')}</ul>`)
        .join('')}</details>`;
    const rows = model.rows.length
        ? `<ol class="improve-list">${model.rows.map(row => `<li><span class="improve-name">${row.candidate.label}</span><span class="improve-gain">${row.gain.text}</span></li>`).join('')}</ol>`
        : '';
    return checked + rows;
}
