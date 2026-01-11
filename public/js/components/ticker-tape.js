// ========== TICKER TAPE COMPONENT ==========
import { formatNumber, formatPercent, getTradingIcon } from '../utils/formatters.js';

export class TickerTape {
    constructor(container, options = {}) {
        this.container = container;
        this.contentEl = container.querySelector('#ticker-content');
        this.duplicateEl = container.querySelector('#ticker-content-duplicate');
        this.symbols = [];
        this.speed = options.speed || 60;
    }

    setSymbols(symbols) {
        this.symbols = symbols;
        this.render();
    }

    updatePrice(wsSymbol, priceData) {
        // Buscar por data-ws-symbol que contiene el símbolo del WebSocket (GOLD, BTCUSD, etc.)
        const items = this.container.querySelectorAll(`.ticker-item[data-ws-symbol="${wsSymbol}"]`);
        items.forEach(item => {
            const priceEl = item.querySelector('.ticker-price');
            const changeEl = item.querySelector('.ticker-change');

            if (priceEl) priceEl.textContent = formatNumber(priceData.price, 2);
            if (changeEl) {
                const sign = priceData.changePercent >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${priceData.changePercent.toFixed(2)}%`;
            }

            // Update color class
            item.classList.remove('up', 'down');
            item.classList.add(priceData.changePercent >= 0 ? 'up' : 'down');

            // Flash animation
            item.style.animation = 'none';
            item.offsetHeight; // Trigger reflow
            item.style.animation = priceData.changePercent >= 0 ? 'priceFlash 0.5s ease' : 'priceFlashDown 0.5s ease';
        });
    }

    render() {
        const html = this.symbols.map(s => this.renderItem(s)).join('');
        if (this.contentEl) this.contentEl.innerHTML = html;
        if (this.duplicateEl) this.duplicateEl.innerHTML = html;
        if (window.refreshLucideIcons) window.refreshLucideIcons();
    }

    renderItem(symbol) {
        const changeClass = (symbol.changePercent || 0) >= 0 ? 'up' : 'down';
        const sign = (symbol.changePercent || 0) >= 0 ? '+' : '';
        const price = symbol.price ? formatNumber(symbol.price, 2) : '--';
        const change = symbol.changePercent ? `${sign}${symbol.changePercent.toFixed(2)}%` : '--';
        // Usar wsSymbol para el mapeo con WebSocket (GOLD, BTCUSD, etc.)
        const wsSymbol = symbol.wsSymbol || symbol.symbol || symbol.code;

        return `
            <div class="ticker-item ${changeClass}" data-code="${symbol.code}" data-ws-symbol="${wsSymbol}">
                <span class="ticker-icon">${getTradingIcon(symbol.code, symbol.type, 12)}</span>
                <span class="ticker-symbol">${symbol.symbol || symbol.code}</span>
                <span class="ticker-price">${price}</span>
                <span class="ticker-change">${change}</span>
            </div>
        `;
    }

    pause() {
        const track = this.container.querySelector('.ticker-track');
        if (track) track.style.animationPlayState = 'paused';
    }

    resume() {
        const track = this.container.querySelector('.ticker-track');
        if (track) track.style.animationPlayState = 'running';
    }

    setSpeed(seconds) {
        this.speed = seconds;
        const track = this.container.querySelector('.ticker-track');
        if (track) track.style.animationDuration = `${seconds}s`;
    }
}
