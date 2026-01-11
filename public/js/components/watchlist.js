// ========== WATCHLIST COMPONENT ==========
import { WatchlistStorage } from '../core/storage.js';
import { formatNumber, formatPercent, getTradingIcon } from '../utils/formatters.js';

export class Watchlist {
    constructor(container, options = {}) {
        this.container = container;
        this.emptyEl = container.querySelector('#watchlist-empty');
        this.items = WatchlistStorage.get();
        this.selectedCode = null;
        this.onSelect = options.onSelect || (() => {});
        this.onRemove = options.onRemove || (() => {});

        this.render();
        this.bindEvents();
    }

    addSymbol(symbol) {
        if (!this.items.find(s => s.code === symbol.code)) {
            this.items = WatchlistStorage.add(symbol);
            this.render();
        }
    }

    removeSymbol(code) {
        this.items = WatchlistStorage.remove(code);
        if (this.selectedCode === code) {
            this.selectedCode = null;
        }
        this.render();
        this.onRemove(code);
    }

    hasSymbol(code) {
        return WatchlistStorage.has(code);
    }

    selectSymbol(code, triggerCallback = false) {
        this.selectedCode = code;
        this.container.querySelectorAll('.watchlist-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.code === code);
        });
        // Solo llamar onSelect si se solicita explícitamente (ej: click directo en el watchlist)
        if (triggerCallback) {
            this.onSelect(code);
        }
    }

    updatePrice(wsSymbol, priceData) {
        // Buscar por data-ws-symbol que contiene el símbolo del WebSocket (GOLD, BTCUSD, etc.)
        const item = this.container.querySelector(`.watchlist-item[data-ws-symbol="${wsSymbol}"]`);
        if (!item) return;

        const priceEl = item.querySelector('.wl-price');
        const changeEl = item.querySelector('.wl-change');

        // Get current values from DOM (trim to remove whitespace)
        const currentPriceText = priceEl ? priceEl.textContent.trim().replace(/,/g, '') : '';
        const currentChangeText = changeEl ? changeEl.textContent.trim() : '';

        // Format new values
        const newPriceFormatted = formatNumber(priceData.price, 2);
        const newChangeFormatted = formatPercent(priceData.changePercent);

        // Only update if values actually changed (compare formatted strings)
        // Empty current value means first render, so update
        let hasChanged = false;

        if (priceEl) {
            const newPriceClean = newPriceFormatted.replace(/,/g, '');
            if (!currentPriceText || currentPriceText !== newPriceClean) {
                priceEl.textContent = newPriceFormatted;
                hasChanged = true;
            }
        }

        if (changeEl) {
            if (!currentChangeText || currentChangeText !== newChangeFormatted) {
                changeEl.textContent = newChangeFormatted;
                changeEl.classList.remove('up', 'down');
                changeEl.classList.add(priceData.changePercent >= 0 ? 'up' : 'down');
                hasChanged = true;
            }
        }

        // Only apply flash animation if something changed AND it's not the first update
        if (hasChanged && currentPriceText && currentChangeText) {
            item.style.animation = 'none';
            item.offsetHeight;
            item.style.animation = priceData.changePercent >= 0 ? 'priceFlash 0.3s ease' : 'priceFlashDown 0.3s ease';
        }
    }

    render() {
        if (this.items.length === 0) {
            if (this.emptyEl) this.emptyEl.style.display = 'block';
            this.renderEmpty();
            return;
        }

        if (this.emptyEl) this.emptyEl.style.display = 'none';

        const html = this.items.map(item => this.renderItem(item)).join('');

        // Find or create items container
        let itemsContainer = this.container.querySelector('.watchlist-items');
        if (!itemsContainer) {
            itemsContainer = document.createElement('div');
            itemsContainer.className = 'watchlist-items';
            this.container.appendChild(itemsContainer);
        }

        itemsContainer.innerHTML = html;
        if (window.refreshLucideIcons) window.refreshLucideIcons();
    }

    renderItem(item) {
        const selected = item.code === this.selectedCode ? 'selected' : '';
        const price = item.price ? formatNumber(item.price, 2) : '--';
        const changeClass = (item.changePercent || 0) >= 0 ? 'up' : 'down';
        const change = item.changePercent ? formatPercent(item.changePercent) : '--';
        // Usar wsSymbol para el mapeo con WebSocket (GOLD, BTCUSD, etc.)
        const wsSymbol = item.wsSymbol || item.symbol || item.code;

        return `
            <div class="watchlist-item ${selected}" data-code="${item.code}" data-ws-symbol="${wsSymbol}">
                <div class="wl-info">
                    <span class="wl-icon">${getTradingIcon(item.code, item.type, 14)}</span>
                    <span class="wl-symbol">${item.symbol || item.code}</span>
                    <span class="wl-name">${item.name || ''}</span>
                </div>
                <span class="wl-price">${price}</span>
                <span class="wl-change ${changeClass}">${change}</span>
                <div class="wl-spark" id="spark-${item.code}"></div>
                <button class="wl-remove" data-remove="${item.code}" title="Remove">×</button>
            </div>
        `;
    }

    renderEmpty() {
        let itemsContainer = this.container.querySelector('.watchlist-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.wl-remove');
            if (removeBtn) {
                e.stopPropagation();
                const code = removeBtn.dataset.remove;
                this.removeSymbol(code);
                return;
            }

            const item = e.target.closest('.watchlist-item');
            if (item) {
                this.selectSymbol(item.dataset.code, true); // true = trigger callback para click directo
            }
        });
    }

    getSymbols() {
        return [...this.items];
    }

    clear() {
        WatchlistStorage.clear();
        this.items = [];
        this.selectedCode = null;
        this.render();
    }
}
