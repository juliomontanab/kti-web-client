// ========== API MODULE ==========
// Funciones para comunicación con el backend

const API_BASE_URL = 'https://ffmzs9evxj.execute-api.us-east-1.amazonaws.com/dev';

export { API_BASE_URL };

export async function fetchSymbolTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}/list/type/symbols`);
        if (!response.ok) throw new Error('Error al cargar tipos de símbolos');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchSymbolTypes:', error);
        return [];
    }
}

export async function fetchSymbolsByType(typeCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbols/${typeCode}`);
        if (!response.ok) throw new Error('Error al cargar símbolos');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchSymbolsByType:', error);
        return [];
    }
}

export async function fetchSymbolResults(symbolCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbol/results/${symbolCode}`);
        if (!response.ok) throw new Error('Error al cargar resultados');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchSymbolResults:', error);
        return [];
    }
}

export async function fetchSymbolDetail(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/detail/${id}`);
        if (!response.ok) throw new Error('Error al cargar detalle');
        const result = await response.json();
        const data = result.data || result;
        return Array.isArray(data) ? data[0] : data;
    } catch (error) {
        console.error('[API] Error fetchSymbolDetail:', error);
        return null;
    }
}

export async function fetchBestOpportunities(minConfidence = 65) {
    try {
        const response = await fetch(`${API_BASE_URL}/list/symbol/results/confidence/${minConfidence}`);
        if (!response.ok) throw new Error('Error al cargar mejores oportunidades');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchBestOpportunities:', error);
        return [];
    }
}

export async function fetchMarketIndexes() {
    try {
        const response = await fetch(`${API_BASE_URL}/market/indexes`);
        if (!response.ok) throw new Error('Error al cargar índices de mercado');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchMarketIndexes:', error);
        return null;
    }
}

export async function fetchSymbolsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/symbols/data`);
        if (!response.ok) throw new Error('Error al cargar datos de símbolos');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchSymbolsData:', error);
        return { symbols: [], symbolTypes: [] };
    }
}

export async function fetchOHLC(symbolCode, timeframe = '1h', limit = 100) {
    try {
        const response = await fetch(`${API_BASE_URL}/ohlc/${symbolCode}?timeframe=${timeframe}&limit=${limit}`);
        if (!response.ok) throw new Error('Error al cargar datos OHLC');
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error fetchOHLC:', error);
        return [];
    }
}

export async function fetchAllSymbolsWithPrices() {
    try {
        const types = await fetchSymbolTypes();
        const allSymbols = [];

        for (const type of types) {
            const symbols = await fetchSymbolsByType(type.code);
            allSymbols.push(...symbols.map(s => ({ ...s, type: type.code, typeName: type.name })));
        }

        return allSymbols;
    } catch (error) {
        console.error('[API] Error fetchAllSymbolsWithPrices:', error);
        return [];
    }
}

export async function askQuestion(recordId, question) {
    try {
        const encodedQuestion = encodeURIComponent(question);
        const response = await fetch(`${API_BASE_URL}/ask/${recordId}?q=${encodedQuestion}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const result = await response.json();
        return result.data || result;
    } catch (error) {
        console.error('[API] Error askQuestion:', error);
        throw error;
    }
}
