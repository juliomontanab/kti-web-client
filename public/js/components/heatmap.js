// ========== HEATMAP COMPONENT ==========
import { getTradingIcon } from '../utils/formatters.js';

export class HeatMap {
    constructor(container, options = {}) {
        this.container = container;
        this.sectors = [];
        this.onSelect = options.onSelect || (() => {});

        this.bindEvents();
    }

    setData(sectors) {
        // sectors: [{ name, code, symbols: [{ code, symbol, changePercent }] }]
        this.sectors = sectors;
        this.render();
    }

    updatePrice(wsSymbol, priceData) {
        // Buscar por data-ws-symbol que contiene el símbolo del WebSocket (GOLD, BTCUSD, etc.)
        const cell = this.container.querySelector(`.heatmap-cell[data-ws-symbol="${wsSymbol}"]`);
        if (!cell) return;

        const changeEl = cell.querySelector('.cell-change');

        // Get current value from DOM (trim to remove whitespace)
        const currentChangeText = changeEl ? changeEl.textContent.trim() : '';

        // Format new value
        const sign = priceData.changePercent >= 0 ? '+' : '';
        const newChangeFormatted = `${sign}${priceData.changePercent.toFixed(1)}%`;

        // Only update if value actually changed (compare formatted strings)
        // Empty current value means first render, so update
        if (changeEl && (!currentChangeText || currentChangeText !== newChangeFormatted)) {
            changeEl.textContent = newChangeFormatted;

            // Update background color
            cell.style.backgroundColor = this.getColor(priceData.changePercent);
        }
    }

    getColor(change) {
        // Green to red gradient based on percentage change
        if (change > 5) return '#00c853';
        if (change > 3) return '#00d26a';
        if (change > 1.5) return '#4caf50';
        if (change > 0.5) return '#8bc34a';
        if (change > 0) return '#c5e1a5';
        if (change > -0.5) return '#ffcdd2';
        if (change > -1.5) return '#ef9a9a';
        if (change > -3) return '#e57373';
        if (change > -5) return '#ff3b3b';
        return '#d32f2f';
    }

    getTextColor(change) {
        // Dark text for light backgrounds, light text for dark backgrounds
        return Math.abs(change) < 1 ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
    }

    render() {
        if (this.sectors.length === 0) {
            this.container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
            return;
        }

        this.container.innerHTML = this.sectors.map(sector => this.renderSector(sector)).join('');
        if (window.refreshLucideIcons) window.refreshLucideIcons();
    }

    renderSector(sector) {
        const cells = sector.symbols.map(s => this.renderCell(s)).join('');

        return `
            <div class="heatmap-sector" data-sector="${sector.code}">
                <h4 class="sector-title">${getTradingIcon(null, sector.code, 16)} ${sector.name}</h4>
                <div class="sector-grid">
                    ${cells}
                </div>
            </div>
        `;
    }

    renderCell(symbol) {
        const change = symbol.changePercent || 0;
        const bgColor = this.getColor(change);
        const textColor = this.getTextColor(change);
        const sign = change >= 0 ? '+' : '';
        // Usar wsSymbol para el mapeo con WebSocket (GOLD, BTCUSD, etc.)
        const wsSymbol = symbol.wsSymbol || symbol.symbol || symbol.code;

        return `
            <div class="heatmap-cell"
                 data-code="${symbol.code}"
                 data-ws-symbol="${wsSymbol}"
                 style="background-color: ${bgColor}; color: ${textColor}"
                 title="${symbol.name || symbol.symbol}: ${sign}${change.toFixed(2)}%">
                <span class="cell-symbol">${symbol.symbol || symbol.code}</span>
                <span class="cell-change">${sign}${change.toFixed(1)}%</span>
            </div>
        `;
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.heatmap-cell');
            if (cell) {
                console.log('[HeatMap] Click on cell:', cell.dataset);
                this.onSelect(cell.dataset.code);
            }
        });
    }
}
