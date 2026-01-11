// ========== SCREENER COMPONENT ==========
import { formatNumber, formatPercent, formatSignal, formatConfidence, getChangeClass, getTradingIcon } from '../utils/formatters.js';

export class Screener {
    constructor(container, options = {}) {
        this.container = container;
        this.filtersEl = container.querySelector('#active-filters');
        this.resultsEl = container.querySelector('#screener-results');
        this.filters = [];
        this.results = [];
        this.allData = [];
        this.onSelect = options.onSelect || (() => {});

        this.bindEvents();
    }

    setData(data) {
        this.allData = data;
    }

    addFilter(filter) {
        // filter: { indicator, condition, value, id }
        filter.id = Date.now();
        this.filters.push(filter);
        this.renderFilters();
    }

    removeFilter(id) {
        this.filters = this.filters.filter(f => f.id !== id);
        this.renderFilters();
    }

    clearFilters() {
        this.filters = [];
        this.renderFilters();
    }

    scan() {
        if (this.allData.length === 0) {
            this.results = [];
            this.renderResults();
            return;
        }

        this.results = this.allData.filter(item => {
            return this.filters.every(filter => this.matchFilter(item, filter));
        });

        this.renderResults();
    }

    matchFilter(item, filter) {
        let value = this.getIndicatorValue(item, filter.indicator);
        const filterValue = parseFloat(filter.value) || filter.value;

        if (value === null || value === undefined) return false;

        switch (filter.condition) {
            case 'above':
                return value > filterValue;
            case 'below':
                return value < filterValue;
            case 'equals':
                if (typeof value === 'string') {
                    return value.toLowerCase() === String(filterValue).toLowerCase();
                }
                return value === filterValue;
            default:
                return false;
        }
    }

    getIndicatorValue(item, indicator) {
        switch (indicator) {
            case 'confidence':
                return item.analysis?.confidence;
            case 'rsi':
                return item.indicators?.momentum?.rsi;
            case 'adx':
                return item.indicators?.momentum?.adx;
            case 'direction':
                return item.analysis?.mainScenario?.direction;
            case 'price':
                return item.price;
            case 'change':
                return item.changePercent;
            default:
                return null;
        }
    }

    renderFilters() {
        if (!this.filtersEl) return;

        if (this.filters.length === 0) {
            this.filtersEl.innerHTML = '<span class="no-filters">No filters active</span>';
            return;
        }

        this.filtersEl.innerHTML = this.filters.map(f => `
            <span class="filter-badge" data-filter-id="${f.id}">
                ${f.indicator} ${f.condition} ${f.value}
                <button class="filter-remove" data-remove-filter="${f.id}">×</button>
            </span>
        `).join('');
    }

    renderResults() {
        if (!this.resultsEl) return;

        if (this.results.length === 0) {
            this.resultsEl.innerHTML = `
                <div class="empty-state">
                    <p>No results match your criteria</p>
                    <p class="text-muted">Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        this.resultsEl.innerHTML = `
            <div class="screener-results-header">
                <span>${this.results.length} results found</span>
            </div>
            <div class="screener-results-list">
                ${this.results.map(r => this.renderResultItem(r)).join('')}
            </div>
        `;
    }

    renderResultItem(item) {
        const changeClass = getChangeClass(item.changePercent);
        const signal = formatSignal(item.analysis?.mainScenario?.direction);
        const confidence = formatConfidence(item.analysis?.confidence);

        return `
            <div class="screener-result-item" data-code="${item.code}">
                <div class="result-main">
                    <span class="result-symbol">${item.emoji || ''} ${item.symbol || item.code}</span>
                    <span class="result-name">${item.name || ''}</span>
                </div>
                <div class="result-price">
                    <span class="price">${formatNumber(item.price, 2)}</span>
                    <span class="change ${changeClass}">${formatPercent(item.changePercent)}</span>
                </div>
                <div class="result-indicators">
                    <span class="signal-badge ${signal.class}">${signal.text}</span>
                    <span class="confidence-badge ${confidence.class}">${confidence.text}</span>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            // Remove filter
            const removeBtn = e.target.closest('[data-remove-filter]');
            if (removeBtn) {
                const id = parseInt(removeBtn.dataset.removeFilter, 10);
                this.removeFilter(id);
                return;
            }

            // Select result
            const resultItem = e.target.closest('.screener-result-item');
            if (resultItem) {
                this.onSelect(resultItem.dataset.code);
            }
        });

        // Add filter button
        const addFilterBtn = this.container.querySelector('#btn-add-filter');
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', () => {
                const indicator = this.container.querySelector('#filter-indicator')?.value;
                const condition = this.container.querySelector('#filter-condition')?.value;
                const value = this.container.querySelector('#filter-value')?.value;

                if (indicator && condition && value) {
                    this.addFilter({ indicator, condition, value });
                    // Clear input
                    const valueInput = this.container.querySelector('#filter-value');
                    if (valueInput) valueInput.value = '';
                }
            });
        }

        // Scan button
        const scanBtn = this.container.querySelector('#btn-scan');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.scan());
        }
    }
}
