/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        // Tema original (legacy)
        primary: '#2d4263',
        secondary: '#c84b31',
        accent: '#ecdbba',
        dark: '#191919',
        light: '#f5f5f5',

        // Tema Pro Trading
        'pro-bg': {
          primary: '#0a0a0a',
          secondary: '#111111',
          tertiary: '#1a1a1a',
          panel: '#0d0d0d',
          card: '#141414'
        },
        'pro-border': {
          DEFAULT: '#252525',
          active: '#404040',
          highlight: '#333333'
        },
        'pro-text': {
          primary: '#f5f5f5',
          secondary: '#a0a0a0',
          muted: '#666666'
        },

        // Colores de trading
        bullish: '#00d26a',
        bearish: '#ff3b3b',
        neutral: '#888888',
        warning: '#ffa600',

        // Acentos profesionales
        'pro-accent': {
          DEFAULT: '#3b82f6',
          secondary: '#60a5fa',
          orange: '#ff6600'
        }
      },
      backgroundImage: {
        // Gradientes legacy
        'kti-main': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        'kti-card': 'linear-gradient(135deg, rgba(45, 66, 99, 0.4) 0%, rgba(200, 75, 49, 0.2) 100%)',
        'kti-disclaimer': 'linear-gradient(135deg, rgba(231, 76, 60, 0.2) 0%, rgba(243, 156, 18, 0.2) 100%)',
        'kti-trade-setup': 'linear-gradient(135deg, rgba(45, 66, 99, 0.4) 0%, rgba(200, 75, 49, 0.2) 100%)',
        'kti-swing': 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%)',
        'kti-best-opportunities': 'linear-gradient(135deg, rgba(255, 102, 0, 0.15) 0%, rgba(45, 66, 99, 0.3) 100%)',
        'kti-summary': 'linear-gradient(135deg, rgba(200, 75, 49, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%)',
        'kti-realtime': 'linear-gradient(135deg, rgba(39, 174, 96, 0.2) 0%, rgba(45, 66, 99, 0.3) 100%)',
        'kti-market-indexes': 'linear-gradient(135deg, rgba(45, 66, 99, 0.4) 0%, rgba(200, 75, 49, 0.2) 100%)',
        'kti-ask-question': 'linear-gradient(135deg, rgba(45, 66, 99, 0.4) 0%, rgba(200, 75, 49, 0.15) 100%)',

        // Gradientes Pro Trading
        'pro-main': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
        'pro-panel': 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)',
        'pro-card-bullish': 'linear-gradient(135deg, rgba(0, 210, 106, 0.05) 0%, rgba(0, 210, 106, 0.02) 100%)',
        'pro-card-bearish': 'linear-gradient(135deg, rgba(255, 59, 59, 0.05) 0%, rgba(255, 59, 59, 0.02) 100%)',
        'pro-header': 'linear-gradient(90deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)'
      },
      backdropBlur: {
        'kti': '10px'
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', 'Source Code Pro', 'monospace'],
        'trading': ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      },
      fontSize: {
        'ticker': '0.75rem',
        'table': '0.8125rem',
        'compact': '0.875rem'
      },
      spacing: {
        'panel': '280px',
        'details': '320px',
        'ticker': '40px',
        'status': '30px'
      },
      keyframes: {
        spin: {
          'to': { transform: 'rotate(360deg)' }
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(30px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        letterBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        disclaimerPulse: {
          '0%, 100%': {
            borderColor: 'rgba(231, 76, 60, 0.5)',
            boxShadow: '0 0 0 0 rgba(231, 76, 60, 0.4)'
          },
          '50%': {
            borderColor: 'rgba(231, 76, 60, 0.8)',
            boxShadow: '0 0 20px 0 rgba(231, 76, 60, 0.4)'
          }
        },
        defconPulse: {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '50%': {
            transform: 'scale(1.05)',
            opacity: '0.9'
          }
        },
        divergencePulse: {
          '0%, 100%': {
            borderColor: 'rgba(243, 156, 18, 0.5)',
            boxShadow: '0 0 0 0 rgba(243, 156, 18, 0.3)'
          },
          '50%': {
            borderColor: 'rgba(243, 156, 18, 0.8)',
            boxShadow: '0 0 15px 0 rgba(243, 156, 18, 0.4)'
          }
        },
        priceUpdate: {
          '0%, 100%': { opacity: '1' },
          '50%': {
            opacity: '0.7',
            background: 'rgba(39, 174, 96, 0.3)'
          }
        },
        // Nuevas animaciones Pro
        tickerScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        priceFlash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(0, 210, 106, 0.2)' }
        },
        priceFlashDown: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255, 59, 59, 0.2)' }
        },
        slideInRight: {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInLeft: {
          'from': { transform: 'translateX(-100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'fadeInUp': 'fadeInUp 1s ease-out',
        'letterBounce': 'letterBounce 1.5s ease-in-out infinite',
        'disclaimerPulse': 'disclaimerPulse 2s ease-in-out infinite',
        'defconPulse': 'defconPulse 1s ease-in-out infinite',
        'divergencePulse': 'divergencePulse 2s ease-in-out infinite',
        'priceUpdate': 'priceUpdate 0.5s ease',
        // Nuevas animaciones Pro
        'ticker': 'tickerScroll 60s linear infinite',
        'ticker-fast': 'tickerScroll 30s linear infinite',
        'price-flash': 'priceFlash 0.5s ease-out',
        'price-flash-down': 'priceFlashDown 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse': 'pulse 2s ease-in-out infinite'
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'width': 'width'
      },
      boxShadow: {
        'pro-card': '0 1px 3px rgba(0, 0, 0, 0.5)',
        'pro-panel': '0 0 20px rgba(0, 0, 0, 0.5)',
        'pro-glow-green': '0 0 10px rgba(0, 210, 106, 0.3)',
        'pro-glow-red': '0 0 10px rgba(255, 59, 59, 0.3)'
      }
    }
  },
  plugins: []
}
