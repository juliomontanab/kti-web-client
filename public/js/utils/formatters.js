// ========== FORMATTERS MODULE ==========
// Funciones de formateo de datos

// Sistema de íconos Lucide para símbolos de trading
export const TRADING_ICONS = {
    // Por tipo de activo / categoría
    types: {
        'PRECIOUS_METALS': { icon: 'gem', color: '#FFD700' },
        'METALS': { icon: 'gem', color: '#FFD700' },
        'COMMODITIES': { icon: 'package', color: '#CD853F' },
        'CRYPTO': { icon: 'bitcoin', color: '#F7931A' },
        'CRYPTOCURRENCY': { icon: 'bitcoin', color: '#F7931A' },
        'FOREX': { icon: 'currency', color: '#4CAF50' },
        'CURRENCIES': { icon: 'currency', color: '#4CAF50' },
        'STOCKS': { icon: 'building-2', color: '#2196F3' },
        'INDICES': { icon: 'bar-chart-3', color: '#9C27B0' },
        'INDEX': { icon: 'bar-chart-3', color: '#9C27B0' },
        'ENERGY': { icon: 'fuel', color: '#FF5722' },
        'AGRICULTURE': { icon: 'wheat', color: '#8BC34A' },
        'BONDS': { icon: 'file-text', color: '#607D8B' },
        'ETF': { icon: 'layers', color: '#00BCD4' },
    },
    // Por símbolo específico
    symbols: {
        // Metales preciosos
        'GOLD': { icon: 'circle-dollar-sign', color: '#FFD700' },
        'XAUUSD': { icon: 'circle-dollar-sign', color: '#FFD700' },
        'SILVER': { icon: 'coins', color: '#C0C0C0' },
        'XAGUSD': { icon: 'coins', color: '#C0C0C0' },
        'PLATINUM': { icon: 'gem', color: '#E5E4E2' },
        'PALLADIUM': { icon: 'gem', color: '#CED0DD' },
        'COPPER': { icon: 'circle', color: '#B87333' },
        // Crypto
        'BTC': { icon: 'bitcoin', color: '#F7931A' },
        'BTCUSD': { icon: 'bitcoin', color: '#F7931A' },
        'BTCUSDT': { icon: 'bitcoin', color: '#F7931A' },
        'ETH': { icon: 'hexagon', color: '#627EEA' },
        'ETHUSD': { icon: 'hexagon', color: '#627EEA' },
        'ETHUSDT': { icon: 'hexagon', color: '#627EEA' },
        'SOL': { icon: 'sun', color: '#9945FF' },
        'SOLUSD': { icon: 'sun', color: '#9945FF' },
        'XRP': { icon: 'droplet', color: '#23292F' },
        'ADA': { icon: 'flower-2', color: '#0033AD' },
        'DOGE': { icon: 'dog', color: '#C2A633' },
        'DOT': { icon: 'circle-dot', color: '#E6007A' },
        'AVAX': { icon: 'mountain', color: '#E84142' },
        'LINK': { icon: 'link', color: '#2A5ADA' },
        'MATIC': { icon: 'pentagon', color: '#8247E5' },
        'UNI': { icon: 'sparkles', color: '#FF007A' },
        // Índices
        'SPX': { icon: 'trending-up', color: '#1E88E5' },
        'SPX500': { icon: 'trending-up', color: '#1E88E5' },
        'US500': { icon: 'trending-up', color: '#1E88E5' },
        'NDX': { icon: 'cpu', color: '#00C853' },
        'NASDAQ': { icon: 'cpu', color: '#00C853' },
        'US100': { icon: 'cpu', color: '#00C853' },
        'DJI': { icon: 'building', color: '#1565C0' },
        'US30': { icon: 'building', color: '#1565C0' },
        'VIX': { icon: 'activity', color: '#FF5722' },
        'DAX': { icon: 'landmark', color: '#FFEB3B' },
        'FTSE': { icon: 'landmark', color: '#C62828' },
        // Forex
        'EURUSD': { icon: 'euro', color: '#003399' },
        'GBPUSD': { icon: 'pound-sterling', color: '#C8102E' },
        'USDJPY': { icon: 'yen', color: '#BC002D' },
        'DXY': { icon: 'dollar-sign', color: '#85BB65' },
        // Energía
        'OIL': { icon: 'droplets', color: '#1A1A1A' },
        'CRUDE': { icon: 'droplets', color: '#1A1A1A' },
        'WTI': { icon: 'droplets', color: '#1A1A1A' },
        'BRENT': { icon: 'droplets', color: '#2E7D32' },
        'NATGAS': { icon: 'flame', color: '#FF9800' },
    },
    // Ícono por defecto
    default: { icon: 'circle', color: '#9E9E9E' }
};

// Función para obtener la configuración del ícono
export function getTradingIconConfig(symbolCode, type) {
    const code = (symbolCode || '').toUpperCase();
    const typeCode = (type || '').toUpperCase().replace(/\s+/g, '_');

    let iconConfig = TRADING_ICONS.symbols[code];
    if (!iconConfig && typeCode) {
        iconConfig = TRADING_ICONS.types[typeCode];
    }
    if (!iconConfig) {
        iconConfig = TRADING_ICONS.default;
    }

    return iconConfig;
}

// Función para obtener el ícono Lucide HTML de un símbolo
export function getTradingIcon(symbolCode, type, size = 24) {
    const iconConfig = getTradingIconConfig(symbolCode, type);
    return `<i data-lucide="${iconConfig.icon}" style="width:${size}px;height:${size}px;color:${iconConfig.color};"></i>`;
}

export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

export function formatPercent(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${Number(value).toFixed(decimals)}%`;
}

export function formatCurrency(value, currency = 'USD', decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

export function formatVolume(value) {
    if (value === null || value === undefined || isNaN(value)) return '--';

    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toString();
}

export function formatDate(date, format = 'short') {
    if (!date) return '--';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';

    switch (format) {
        case 'short':
            return d.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        case 'long':
            return d.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        case 'time':
            return d.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        case 'datetime':
            return d.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'iso':
            return d.toISOString();
        default:
            return d.toLocaleDateString();
    }
}

export function formatRelativeTime(date) {
    if (!date) return '--';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';

    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHour < 24) return `Hace ${diffHour}h`;
    if (diffDay < 7) return `Hace ${diffDay}d`;

    return formatDate(d, 'short');
}

export function formatPriceChange(change, changePercent) {
    const arrow = change >= 0 ? '▲' : '▼';
    const sign = change >= 0 ? '+' : '';
    return `${arrow} ${sign}${formatNumber(change)} (${formatPercent(changePercent)})`;
}

export function formatSignal(direction) {
    if (!direction) return { text: '--', class: 'neutral' };

    const upper = direction.toUpperCase();
    if (upper === 'LONG' || upper === 'BUY' || upper === 'BULLISH') {
        return { text: 'LONG', class: 'bullish' };
    }
    if (upper === 'SHORT' || upper === 'SELL' || upper === 'BEARISH') {
        return { text: 'SHORT', class: 'bearish' };
    }
    return { text: direction, class: 'neutral' };
}

export function formatConfidence(value) {
    if (value === null || value === undefined) return { text: '--', class: 'neutral' };

    const num = Number(value);
    let colorClass = 'low';

    if (num >= 80) colorClass = 'high';
    else if (num >= 65) colorClass = 'medium';

    return {
        text: `${num}%`,
        class: colorClass,
        value: num
    };
}

export function getChangeClass(value) {
    if (value > 0) return 'bullish';
    if (value < 0) return 'bearish';
    return 'neutral';
}

export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Mapeo de símbolos
export const SYMBOL_MAP = {
    'GOLD': 'XAU',
    'SILVER': 'XAG',
    'COPPER': 'XCU',
    'PLATINUM': 'XPT',
    'PALLADIUM': 'XPD'
};

export function getSymbolCode(symbol) {
    if (!symbol) return null;

    if (symbol.includes('XAU')) return 'GOLD';
    if (symbol.includes('XAG')) return 'SILVER';
    if (symbol.includes('XCU')) return 'COPPER';
    if (symbol.includes('XPT')) return 'PLATINUM';
    if (symbol.includes('XPD')) return 'PALLADIUM';

    return symbol;
}
