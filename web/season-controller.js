// Owns the Harvest Moon season view and its DOM handlers. Season plan state remains in app.js
// because persistence and the solver input adapter also consume it.
export function createSeasonController(deps) {
    function updatePlotsSummary() {
        const summaryEl = deps.document.getElementById('season-plots-summary');
        if (!summaryEl) return;
        const plots = deps.getPlots();
        const totalFarmland = deps.simpleSetup(deps.getHomeLevel()).facilities.Farmland?.[0]?.count || 32;
        const used = plots.radish + plots.pepper;
        const remaining = Math.max(0, totalFarmland - used);
        summaryEl.innerHTML = deps.getLanguage() === 'vi'
            ? `Dành <strong>${used} ô đất</strong> (${plots.radish} Củ cải + ${plots.pepper} Ớt) cho sự kiện Trung Thu. Còn lại <strong>${remaining} ô đất nông nghiệp</strong> cho nhân sâm, lúa nước và các cây trồng khác.`
            : `Dedicated <strong>${used} plots</strong> (${plots.radish} Radish + ${plots.pepper} Pepper) for the event. Remaining <strong>${remaining} farmland plots</strong> for standard agriculture.`;
    }

    function render() {
        const seasonSec = deps.document.getElementById('season-section');
        const divider = deps.document.querySelector('.custom-card-divider');
        const available = deps.isSeasonAvailable();
        if (seasonSec) {
            seasonSec.hidden = !available;
            seasonSec.style.display = available ? '' : 'none';
        }
        if (divider) divider.style.display = available ? '' : 'none';
        const seasonCfg = deps.document.getElementById('season-config');
        if (seasonCfg) seasonCfg.hidden = !deps.isSeasonActive();
        if (!available) return;

        deps.updateTitleCountdown();
        const plots = deps.getPlots();
        const radishInput = deps.document.getElementById('season-radish-plots');
        if (radishInput) radishInput.value = plots.radish;
        const pepperInput = deps.document.getElementById('season-pepper-plots');
        if (pepperInput) pepperInput.value = plots.pepper;
        updatePlotsSummary();

        const notesGrid = deps.document.getElementById('season-notes');
        if (notesGrid) {
            const selected = deps.getSelectedDishes();
            const isVi = deps.getLanguage() === 'vi';
            notesGrid.innerHTML = deps.recipes.map(recipe => {
                const checked = selected.has(recipe.name);
                const pointsText = `+${recipe.points} ${isVi ? 'điểm' : 'pts'}`;
                return `
            <label class="season-dish-card ${checked ? 'active' : ''}">
                <input type="checkbox" class="dish-checkbox" data-season-dish="${recipe.name}"${checked ? ' checked' : ''}>
                <div class="dish-thumb">
                    ${deps.renderItemIcon(recipe.name)}
                </div>
                <div class="dish-details">
                    <span class="dish-name">${deps.getItemDisplayName(recipe.name)}</span>
                    <span class="dish-meta">
                        <span class="dish-facility">${deps.getFacilityDisplayName(recipe.facility)}</span>
                        <span class="dish-points-badge">${pointsText}</span>
                    </span>
                </div>
            </label>`;
            }).join('');
        }
    }

    function attachHandlers() {
        deps.document.getElementById('season-on')?.addEventListener('change', () => {
            deps.renderStrategy();
            deps.saveInputsToStorage();
        });

        deps.document.querySelectorAll('[data-step-plot]').forEach(button => {
            button.addEventListener('click', () => {
                const crop = button.dataset.stepPlot;
                if (crop !== 'radish' && crop !== 'pepper') return;
                const plots = deps.getPlots();
                const value = Math.max(0, Math.min(10, plots[crop] + Number(button.dataset.stepDir)));
                deps.setPlot(crop, value);
                const input = deps.document.getElementById(`season-${crop}-plots`);
                if (input) input.value = value;
                updatePlotsSummary();
                deps.saveInputsToStorage();
            });
        });

        for (const crop of ['radish', 'pepper']) {
            deps.document.getElementById(`season-${crop}-plots`)?.addEventListener('input', event => {
                const value = Math.max(0, Math.min(10, Number(event.target.value) || 0));
                event.target.value = value;
                deps.setPlot(crop, value);
                updatePlotsSummary();
                deps.saveInputsToStorage();
            });
        }

        deps.document.getElementById('season-notes')?.addEventListener('change', event => {
            const name = event.target.dataset.seasonDish;
            if (!name) return;
            deps.setDishSelected(name, event.target.checked);
            event.target.closest('.season-dish-card')?.classList.toggle('active', event.target.checked);
            deps.saveInputsToStorage();
        });
    }

    return { render, attachHandlers, updatePlotsSummary };
}
