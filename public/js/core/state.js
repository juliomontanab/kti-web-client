// ========== STATE MODULE ==========
// Estado global de la aplicación

const APP_VERSION = '2.0.0';

// Estado global
const state = {
    // Datos
    currentSymbol: null,
    currentAnalysis: null,
    symbolTypes: [],
    allSymbols: [],
    opportunities: [],
    marketIndexes: null,

    // UI
    activeTab: 'overview',
    detailsPanelOpen: false,
    compactMode: false,

    // Filtros
    confidenceFilter: 65,
    typeFilter: null,

    // Navegación
    navigationHistory: []
};

// Listeners para cambios de estado
const listeners = new Map();

export function getState() {
    return { ...state };
}

export function setState(updates) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
        if (state[key] !== value) {
            state[key] = value;
            changedKeys.push(key);
        }
    }

    // Notificar a listeners
    changedKeys.forEach(key => {
        if (listeners.has(key)) {
            listeners.get(key).forEach(cb => cb(state[key], state));
        }
    });

    // Notificar listeners globales
    if (changedKeys.length > 0 && listeners.has('*')) {
        listeners.get('*').forEach(cb => cb(state, changedKeys));
    }
}

export function subscribe(key, callback) {
    if (!listeners.has(key)) {
        listeners.set(key, []);
    }
    listeners.get(key).push(callback);

    // Retornar función para desuscribirse
    return () => {
        const keyListeners = listeners.get(key);
        const index = keyListeners.indexOf(callback);
        if (index > -1) {
            keyListeners.splice(index, 1);
        }
    };
}

// Navegación
export function pushHistory(entry) {
    state.navigationHistory.push(entry);
}

export function popHistory() {
    return state.navigationHistory.pop();
}

export function clearHistory() {
    state.navigationHistory = [];
}

// Helpers
export function setActiveTab(tab) {
    setState({ activeTab: tab });
}

export function setCurrentSymbol(symbol) {
    setState({ currentSymbol: symbol });
}

export function setCurrentAnalysis(analysis) {
    setState({ currentAnalysis: analysis });
}

export function toggleDetailsPanel() {
    setState({ detailsPanelOpen: !state.detailsPanelOpen });
}

export function toggleCompactMode() {
    setState({ compactMode: !state.compactMode });
}

export { APP_VERSION };
