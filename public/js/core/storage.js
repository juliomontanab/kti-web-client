// ========== STORAGE MODULE ==========
// Persistencia en LocalStorage

export const STORAGE_KEYS = {
    WATCHLIST: 'kti_watchlist',
    ALERTS: 'kti_alerts',
    PREFERENCES: 'kti_preferences',
    POSITIONS: 'kti_positions',
    LAYOUT: 'kti_layout',
    VERSION: 'kti_version'
};

export const Storage = {
    get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('[Storage] Error reading:', key, error);
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('[Storage] Error writing:', key, error);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('[Storage] Error removing:', key, error);
            return false;
        }
    },

    update(key, updateFn) {
        const current = this.get(key);
        const updated = updateFn(current);
        return this.set(key, updated);
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('[Storage] Error clearing:', error);
            return false;
        }
    }
};

// Preferencias específicas
export const Preferences = {
    defaults: {
        compactMode: false,
        theme: 'dark-pro',
        tickerSpeed: 50,
        soundEnabled: true,
        notificationsEnabled: true
    },

    get() {
        return { ...this.defaults, ...Storage.get(STORAGE_KEYS.PREFERENCES) };
    },

    set(prefs) {
        return Storage.set(STORAGE_KEYS.PREFERENCES, { ...this.get(), ...prefs });
    },

    reset() {
        return Storage.set(STORAGE_KEYS.PREFERENCES, this.defaults);
    }
};

// Watchlist helpers
export const WatchlistStorage = {
    get() {
        return Storage.get(STORAGE_KEYS.WATCHLIST) || [];
    },

    add(symbol) {
        const watchlist = this.get();
        if (!watchlist.find(s => s.code === symbol.code)) {
            watchlist.push(symbol);
            Storage.set(STORAGE_KEYS.WATCHLIST, watchlist);
        }
        return watchlist;
    },

    remove(code) {
        const watchlist = this.get().filter(s => s.code !== code);
        Storage.set(STORAGE_KEYS.WATCHLIST, watchlist);
        return watchlist;
    },

    has(code) {
        return this.get().some(s => s.code === code);
    },

    clear() {
        return Storage.set(STORAGE_KEYS.WATCHLIST, []);
    }
};

// Alertas helpers
export const AlertsStorage = {
    get() {
        return Storage.get(STORAGE_KEYS.ALERTS) || [];
    },

    add(alert) {
        const alerts = this.get();
        alert.id = Date.now();
        alert.createdAt = new Date().toISOString();
        alert.active = true;
        alert.triggered = false;
        alerts.push(alert);
        Storage.set(STORAGE_KEYS.ALERTS, alerts);
        return alert;
    },

    remove(id) {
        const alerts = this.get().filter(a => a.id !== id);
        Storage.set(STORAGE_KEYS.ALERTS, alerts);
        return alerts;
    },

    update(id, updates) {
        const alerts = this.get().map(a =>
            a.id === id ? { ...a, ...updates } : a
        );
        Storage.set(STORAGE_KEYS.ALERTS, alerts);
        return alerts;
    },

    getActive() {
        return this.get().filter(a => a.active && !a.triggered);
    },

    markTriggered(id) {
        return this.update(id, {
            triggered: true,
            triggeredAt: new Date().toISOString()
        });
    }
};

// Posiciones/Portfolio helpers
export const PositionsStorage = {
    get() {
        return Storage.get(STORAGE_KEYS.POSITIONS) || [];
    },

    add(position) {
        const positions = this.get();
        position.id = Date.now();
        position.openedAt = new Date().toISOString();
        positions.push(position);
        Storage.set(STORAGE_KEYS.POSITIONS, positions);
        return position;
    },

    remove(id) {
        const positions = this.get().filter(p => p.id !== id);
        Storage.set(STORAGE_KEYS.POSITIONS, positions);
        return positions;
    },

    update(id, updates) {
        const positions = this.get().map(p =>
            p.id === id ? { ...p, ...updates } : p
        );
        Storage.set(STORAGE_KEYS.POSITIONS, positions);
        return positions;
    },

    close(id, closePrice) {
        return this.update(id, {
            closed: true,
            closePrice,
            closedAt: new Date().toISOString()
        });
    }
};
