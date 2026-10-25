export function normalizeRecipeSearchText(value) {
    return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
}

export function createRecipeSearchController({ document, getLanguage }) {
    function filter() {
        const input = document.getElementById('facilities-recipe-search');
        const container = document.getElementById('facilities-modal-container');
        const empty = document.getElementById('facilities-search-empty');
        if (!input || !container || !empty) return;

        const query = normalizeRecipeSearchText(input.value.trim());
        let visibleRows = 0;
        container.querySelectorAll('.facility-recipe-table').forEach(table => {
            let hasVisibleRow = false;
            table.querySelectorAll('.facility-recipe-row').forEach(row => {
                const matches = !query || normalizeRecipeSearchText(row.dataset.searchText).includes(query);
                row.hidden = !matches;
                hasVisibleRow ||= matches;
                if (matches) visibleRows++;
            });
            table.hidden = !hasVisibleRow;
        });
        container.querySelectorAll('.facility-category').forEach(category => {
            category.hidden = !category.querySelector('.facility-recipe-table:not([hidden])');
        });

        empty.hidden = visibleRows > 0;
        empty.textContent = query
            ? (getLanguage() === 'vi' ? 'Không tìm thấy công thức phù hợp.' : 'No matching recipes found.')
            : '';
    }

    function attach() {
        document.getElementById('facilities-recipe-search')?.addEventListener('input', filter);
    }

    return { attach, filter };
}
