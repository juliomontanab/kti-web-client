// ========== WEBSOCKET MODULE ==========
// Conexión WebSocket para precios en tiempo real

const WS_URL = 'wss://d9ndopwfif.execute-api.us-east-1.amazonaws.com/dev';

let ws = null;
let wsReconnectInterval = null;
let priceUpdateCallbacks = [];

export const realtimePrices = {};

export function onPriceUpdate(callback) {
    priceUpdateCallbacks.push(callback);
    console.log(`[WS] Callback de precio registrado. Total callbacks: ${priceUpdateCallbacks.length}`);
    return () => {
        priceUpdateCallbacks = priceUpdateCallbacks.filter(cb => cb !== callback);
    };
}

function notifyPriceUpdate(symbol, priceData) {
    priceUpdateCallbacks.forEach(cb => cb(symbol, priceData));
}

export function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('[WS] Ya existe una conexión WebSocket activa');
        return;
    }

    console.log('[WS] Conectando a WebSocket...');
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('[WS] Conectado al WebSocket');
        if (wsReconnectInterval) {
            clearInterval(wsReconnectInterval);
            wsReconnectInterval = null;
        }
        notifyConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('[WS] Mensaje recibido:', data);

            if (data.message && Array.isArray(data.message)) {
                console.log(`[WS] Procesando ${data.message.length} símbolos...`);

                data.message.forEach(symbolData => {
                    const { symbol, price, change, changePercent, timestamp } = symbolData;
                    console.log(`[WS] Precio actualizado para ${symbol}: ${price}`);

                    realtimePrices[symbol] = {
                        price,
                        change,
                        changePercent,
                        timestamp
                    };

                    notifyPriceUpdate(symbol, realtimePrices[symbol]);
                });

                console.log(`[WS] ✓ ${data.message.length} símbolos actualizados`);
            } else {
                console.log('[WS] Mensaje no tiene formato esperado (data.message array)');
            }
        } catch (error) {
            console.error('[WS] Error al procesar mensaje:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('[WS] Error en WebSocket:', error);
        notifyConnectionStatus('error');
    };

    ws.onclose = () => {
        console.log('[WS] Conexión cerrada. Intentando reconectar...');
        ws = null;
        notifyConnectionStatus('disconnected');

        if (!wsReconnectInterval) {
            wsReconnectInterval = setInterval(() => {
                console.log('[WS] Intentando reconectar...');
                connectWebSocket();
            }, 5000);
        }
    };
}

export function disconnectWebSocket() {
    if (ws) {
        console.log('[WS] Cerrando conexión WebSocket');
        ws.close();
        ws = null;
    }

    if (wsReconnectInterval) {
        clearInterval(wsReconnectInterval);
        wsReconnectInterval = null;
    }
}

export function getConnectionStatus() {
    if (!ws) return 'disconnected';
    switch (ws.readyState) {
        case WebSocket.CONNECTING: return 'connecting';
        case WebSocket.OPEN: return 'connected';
        case WebSocket.CLOSING: return 'closing';
        case WebSocket.CLOSED: return 'disconnected';
        default: return 'unknown';
    }
}

let connectionStatusCallbacks = [];

export function onConnectionStatusChange(callback) {
    connectionStatusCallbacks.push(callback);
    return () => {
        connectionStatusCallbacks = connectionStatusCallbacks.filter(cb => cb !== callback);
    };
}

function notifyConnectionStatus(status) {
    connectionStatusCallbacks.forEach(cb => cb(status));
}
