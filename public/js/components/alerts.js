// ========== ALERTS COMPONENT ==========
import { AlertsStorage, Preferences } from '../core/storage.js';
import { formatNumber } from '../utils/formatters.js';

export class AlertManager {
    constructor(container, options = {}) {
        this.container = container;
        this.listEl = container.querySelector('#alerts-list') || container;
        this.alerts = AlertsStorage.get();
        this.onTrigger = options.onTrigger || (() => {});

        this.render();
    }

    createAlert(config) {
        const alert = AlertsStorage.add({
            symbol: config.symbol,
            symbolName: config.symbolName,
            type: config.type, // 'price', 'signal'
            condition: config.condition, // 'above', 'below', 'changes'
            value: config.value,
            message: config.message || `Alert: ${config.symbol} ${config.condition} ${config.value}`
        });

        this.alerts = AlertsStorage.get();
        this.render();
        return alert;
    }

    removeAlert(id) {
        AlertsStorage.remove(id);
        this.alerts = AlertsStorage.get();
        this.render();
    }

    checkPrice(symbol, currentPrice, previousPrice) {
        const activeAlerts = this.alerts.filter(a =>
            a.active &&
            !a.triggered &&
            a.symbol === symbol &&
            a.type === 'price'
        );

        activeAlerts.forEach(alert => {
            let triggered = false;

            if (alert.condition === 'above' && currentPrice >= alert.value) {
                triggered = true;
            } else if (alert.condition === 'below' && currentPrice <= alert.value) {
                triggered = true;
            }

            if (triggered) {
                this.triggerAlert(alert, currentPrice);
            }
        });
    }

    checkSignal(symbol, currentSignal, previousSignal) {
        if (currentSignal === previousSignal) return;

        const activeAlerts = this.alerts.filter(a =>
            a.active &&
            !a.triggered &&
            a.symbol === symbol &&
            a.type === 'signal'
        );

        activeAlerts.forEach(alert => {
            if (alert.condition === 'changes') {
                this.triggerAlert(alert, currentSignal);
            }
        });
    }

    triggerAlert(alert, triggerValue) {
        AlertsStorage.markTriggered(alert.id);
        this.alerts = AlertsStorage.get();
        this.render();

        // Callback
        this.onTrigger(alert, triggerValue);

        // Browser notification
        this.showNotification(alert, triggerValue);

        // Sound
        this.playSound();

        // UI notification
        this.showUINotification(alert, triggerValue);
    }

    showNotification(alert, value) {
        const prefs = Preferences.get();
        if (!prefs.notificationsEnabled) return;

        if (Notification.permission === 'granted') {
            new Notification(`KTI Alert: ${alert.symbol}`, {
                body: alert.message,
                icon: '/icon-192.png',
                tag: `alert-${alert.id}`
            });
        }
    }

    playSound() {
        const prefs = Preferences.get();
        if (!prefs.soundEnabled) return;

        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch (e) {
            console.warn('Could not play alert sound:', e);
        }
    }

    showUINotification(alert, value) {
        // Create floating notification
        const notification = document.createElement('div');
        notification.className = 'alert-notification';
        notification.innerHTML = `
            <div class="alert-notification-content">
                <span class="alert-notification-icon"><i data-lucide="bell-ring" style="width:20px;height:20px;color:#fbbf24;"></i></span>
                <div class="alert-notification-text">
                    <strong>${alert.symbol}</strong>
                    <span>${alert.message}</span>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('visible'), 10);

        // Auto remove
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    render() {
        const activeAlerts = this.alerts.filter(a => a.active && !a.triggered);
        const triggeredAlerts = this.alerts.filter(a => a.triggered);

        if (this.alerts.length === 0) {
            this.listEl.innerHTML = `
                <div class="empty-state">
                    <p>No alerts configured</p>
                    <p class="text-muted">Create an alert to get notified when conditions are met</p>
                </div>
            `;
            return;
        }

        let html = '';

        if (activeAlerts.length > 0) {
            html += `
                <div class="alerts-section">
                    <h4 class="alerts-section-title">Active Alerts (${activeAlerts.length})</h4>
                    ${activeAlerts.map(a => this.renderAlert(a)).join('')}
                </div>
            `;
        }

        if (triggeredAlerts.length > 0) {
            html += `
                <div class="alerts-section triggered-section">
                    <h4 class="alerts-section-title">Triggered Alerts</h4>
                    ${triggeredAlerts.slice(0, 10).map(a => this.renderAlert(a)).join('')}
                </div>
            `;
        }

        this.listEl.innerHTML = html;
    }

    renderAlert(alert) {
        const triggeredClass = alert.triggered ? 'triggered' : '';
        const icon = alert.type === 'price' ? '<i data-lucide="dollar-sign" style="width:16px;height:16px;"></i>' : '<i data-lucide="bar-chart-2" style="width:16px;height:16px;"></i>';
        const conditionText = this.formatCondition(alert);

        return `
            <div class="alert-item ${triggeredClass}" data-id="${alert.id}">
                <span class="alert-icon">${icon}</span>
                <div class="alert-info">
                    <span class="alert-symbol">${alert.symbolName || alert.symbol}</span>
                    <span class="alert-condition">${conditionText}</span>
                    ${alert.triggered ? `<span class="alert-triggered-time">Triggered ${this.formatTime(alert.triggeredAt)}</span>` : ''}
                </div>
                <button class="alert-delete" data-delete="${alert.id}" title="Delete">×</button>
            </div>
        `;
    }

    formatCondition(alert) {
        if (alert.type === 'price') {
            return `${alert.condition} ${formatNumber(alert.value, 2)}`;
        }
        return 'Signal changes';
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    getActiveCount() {
        return this.alerts.filter(a => a.active && !a.triggered).length;
    }

    bindEvents() {
        this.container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.alert-delete');
            if (deleteBtn) {
                const id = parseInt(deleteBtn.dataset.delete, 10);
                this.removeAlert(id);
            }
        });
    }
}
