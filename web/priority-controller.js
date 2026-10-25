export function createPriorityController({ list, getPriorityOrder, render, save }) {
    function movePriority(from, to) {
        const priorityOrder = getPriorityOrder();
        if (to < 0 || to >= priorityOrder.length || from === to) return;
        const [moved] = priorityOrder.splice(from, 1);
        priorityOrder.splice(to, 0, moved);
        render();
        save();
    }

    function attach() {
        if (!list) return;
        list.addEventListener('change', event => {
            const priorityOrder = getPriorityOrder();
            const index = Number(event.target.dataset.toggle);
            if (Number.isNaN(index) || !priorityOrder[index]) return;
            priorityOrder[index].on = event.target.checked;
            render();
            save();
        });
        list.addEventListener('click', event => {
            const button = event.target.closest('[data-move]');
            if (!button) return;
            const to = Number(button.dataset.to);
            movePriority(Number(button.dataset.move), to);
            list.querySelector(`[data-move="${to}"][data-by="${button.dataset.by}"]`)?.focus();
        });
        let dragFrom = null;
        list.addEventListener('dragstart', event => {
            const item = event.target.closest('li[data-index]');
            if (!item) return;
            dragFrom = Number(item.dataset.index);
            item.classList.add('dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(dragFrom));
        });
        list.addEventListener('dragover', event => {
            if (dragFrom === null) return;
            event.preventDefault();
            const over = event.target.closest('li[data-index]');
            list.querySelectorAll('.drop-target').forEach(element => element.classList.remove('drop-target'));
            if (over) over.classList.add('drop-target');
        });
        list.addEventListener('drop', event => {
            event.preventDefault();
            const over = event.target.closest('li[data-index]');
            if (dragFrom !== null && over) movePriority(dragFrom, Number(over.dataset.index));
            dragFrom = null;
        });
        list.addEventListener('dragend', () => {
            dragFrom = null;
            render();
        });
    }

    return { attach, movePriority };
}
