// ========== KEYBOARD SHORTCUTS ==========

export class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Don't trigger shortcuts when typing in inputs
            if (this.isInputFocused()) return;

            const key = this.getKeyCombo(e);
            const shortcut = this.shortcuts.get(key);

            if (shortcut) {
                e.preventDefault();
                shortcut.handler();
            }
        });
    }

    isInputFocused() {
        const activeEl = document.activeElement;
        if (!activeEl) return false;

        const tagName = activeEl.tagName.toLowerCase();
        return tagName === 'input' ||
               tagName === 'textarea' ||
               tagName === 'select' ||
               activeEl.isContentEditable;
    }

    getKeyCombo(e) {
        const parts = [];

        if (e.ctrlKey || e.metaKey) parts.push('mod');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');

        // Normalize key
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key === 'escape') key = 'esc';

        parts.push(key);
        return parts.join('+');
    }

    register(combo, handler, description = '') {
        this.shortcuts.set(combo.toLowerCase(), { handler, description });
        return this;
    }

    unregister(combo) {
        this.shortcuts.delete(combo.toLowerCase());
        return this;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    getAll() {
        const list = [];
        this.shortcuts.forEach((value, key) => {
            list.push({ key, description: value.description });
        });
        return list;
    }
}

// Default shortcuts setup
export function setupDefaultShortcuts(app) {
    const keyboard = new KeyboardShortcuts();

    // Navigation
    keyboard.register('1', () => app.switchTab('overview'), 'Overview tab');
    keyboard.register('2', () => app.switchTab('screener'), 'Screener tab');
    keyboard.register('3', () => app.switchTab('heatmap'), 'Heat Map tab');
    keyboard.register('4', () => app.switchTab('alerts'), 'Alerts tab');

    // Panels
    keyboard.register('w', () => app.toggleWatchlist(), 'Toggle watchlist');
    keyboard.register('d', () => app.toggleDetails(), 'Toggle details');
    keyboard.register('c', () => app.toggleCompactMode(), 'Toggle compact mode');

    // Search
    keyboard.register('s', () => app.focusSearch(), 'Focus search');
    keyboard.register('mod+k', () => app.openCommandPalette(), 'Command palette');

    // Help
    keyboard.register('?', () => app.showShortcuts(), 'Show shortcuts');
    keyboard.register('shift+/', () => app.showShortcuts(), 'Show shortcuts');

    // Close
    keyboard.register('esc', () => app.closeModal(), 'Close modal/panel');

    return keyboard;
}
