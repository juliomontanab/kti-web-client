# Trading Analysis PWA

Progressive Web App para análisis técnico multi-temporal de metales preciosos y criptomonedas.

## 🚀 Características

- **Listado de instrumentos**: Vista de tarjetas con todos los símbolos disponibles
- **Análisis detallado**: Visualización completa del análisis técnico al hacer clic en un símbolo
- **Diseño responsive**: Optimizado para móviles, tablets y desktop
- **PWA completa**: Funciona offline y se puede instalar como app nativa
- **Actualización en tiempo real**: Conecta con tu API para datos actualizados

## 📋 Estructura del Proyecto

```
trading-pwa/
├── index.html          # HTML principal con vistas de listado y detalle
├── app.js              # Lógica de la aplicación
├── manifest.json       # Configuración de la PWA
├── sw.js               # Service Worker para funcionalidad offline
├── icon-192.png        # Icono de la app (192x192)
├── icon-512.png        # Icono de la app (512x512)
└── README.md           # Esta documentación
```

## ⚙️ Configuración

### 1. Configurar URL de la API

Edita `app.js` y actualiza la URL base de tu API:

```javascript
const API_BASE_URL = 'https://tu-api.com/api';
```

### 2. Endpoints esperados

La aplicación espera dos endpoints:

**GET /symbols** - Lista de símbolos
```json
[
  {
    "_id": "695583038e6da051ccdcf195",
    "instrument": {
      "symbol": "XAUUSD",
      "name": "CFDs on Gold (US$ / OZ)",
      "timeframe": "1h",
      "assetType": "Commodity"
    }
  }
]
```

**GET /analysis?id={_id}** - Detalle del análisis
```json
{
  "_id": "695583038e6da051ccdcf195",
  "instrument": { ... },
  "price": { ... },
  "trend": { ... },
  "levels": { ... },
  "indicators": { ... },
  "correlations": { ... },
  "patterns": { ... },
  "analysis": { ... },
  "riskManagement": { ... },
  "summary": { ... },
  "metadata": { ... }
}
```

### 3. Generar iconos

Crea dos iconos para la PWA:

- `icon-192.png` (192x192 px)
- `icon-512.png` (512x512 px)

Puedes usar herramientas online como:
- https://realfavicongenerator.net/
- https://www.favicon-generator.org/

### 4. Modo desarrollo (datos mock)

Por defecto, si la API no está disponible, la app usa datos de prueba (mock data).

Para testing sin backend, la función `getMockSymbols()` y `getMockDetail()` proporcionan datos de ejemplo.

## 🔧 Instalación y Despliegue

### Opción 1: Desarrollo Local con Node.js

```bash
# Instalar dependencias
npm install

# Modo desarrollo (con auto-reload)
npm run dev

# O modo producción
npm start
```

Luego abre: http://localhost:3000

### Opción 2: Deploy en AWS Amplify (Recomendado)

**Paso 1: Preparar el repositorio**
```bash
git init
git add .
git commit -m "Initial commit - Trading PWA"
git branch -M main
git remote add origin https://github.com/tu-usuario/trading-pwa.git
git push -u origin main
```

**Paso 2: Deploy en Amplify**
1. Ingresa a [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click en "New app" → "Host web app"
3. Conecta tu repositorio de GitHub
4. Amplify detectará automáticamente `amplify.yml`
5. Click en "Save and deploy"
6. ¡Tu PWA estará online en minutos!

**Configuración Amplify:**
- Build command: `npm run build` (ya configurado en amplify.yml)
- Output directory: `public` (ya configurado)
- Node version: 18.x o superior

### Opción 3: Otros servicios cloud

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Railway:**
```bash
# Conecta tu repo en railway.app
# Railway detectará automáticamente Node.js
```

## 📱 Instalación como PWA

### En Android (Chrome):
1. Abre la web en Chrome
2. Toca el menú (⋮) > "Agregar a pantalla de inicio"
3. La app se instalará como aplicación nativa

### En iOS (Safari):
1. Abre la web en Safari
2. Toca el botón "Compartir" 
3. Selecciona "Agregar a pantalla de inicio"

### En Desktop (Chrome/Edge):
1. Abre la web en Chrome o Edge
2. Busca el icono de instalación en la barra de direcciones
3. Haz clic en "Instalar"

## 🎨 Personalización

### Cambiar colores del tema

Edita las variables CSS en `index.html`:

```css
:root {
  --primary: #2d4263;      /* Color primario */
  --secondary: #c84b31;    /* Color secundario (rojo/naranja) */
  --accent: #ecdbba;       /* Color de acento */
  --dark: #191919;         /* Fondo oscuro */
  --light: #f5f5f5;        /* Texto claro */
  --success: #27ae60;      /* Verde para valores positivos */
  --danger: #e74c3c;       /* Rojo para valores negativos */
  --warning: #f39c12;      /* Amarillo para advertencias */
}
```

### Modificar el layout

El diseño usa CSS Grid responsive. Ajusta los breakpoints en:

```css
@media (max-width: 768px) {
  /* Estilos para móviles */
}
```

## 🔌 Integración con API Real

### Ejemplo de servidor Node.js/Express

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// Endpoint de símbolos
app.get('/api/symbols', async (req, res) => {
  // Consulta a tu base de datos
  const symbols = await db.collection('analyses')
    .find({})
    .project({ _id: 1, instrument: 1 })
    .toArray();
  
  res.json(symbols);
});

// Endpoint de detalle
app.get('/api/analysis', async (req, res) => {
  const { id } = req.query;
  const analysis = await db.collection('analyses')
    .findOne({ _id: new ObjectId(id) });
  
  res.json(analysis);
});

app.listen(3000, () => console.log('API running on port 3000'));
```

## 🐛 Solución de Problemas

### La PWA no se instala
- Verifica que estés usando HTTPS (o localhost)
- Asegúrate que el Service Worker esté registrado correctamente
- Revisa la consola del navegador por errores

### Los datos no se cargan
- Verifica la URL de la API en `app.js`
- Revisa que los endpoints respondan correctamente
- Abre la consola del navegador para ver errores de CORS

### Los iconos no aparecen
- Verifica que los archivos `icon-192.png` e `icon-512.png` existan
- Comprueba que las rutas en `manifest.json` sean correctas
- Limpia la caché del navegador

## 📊 Funcionalidades

### Vista de Listado
- Muestra todos los símbolos disponibles
- Filtrable por tipo de activo
- Tarjetas con información básica
- Click para ver detalle completo

### Vista de Detalle
- Precio actual y variación
- Análisis multi-temporal completo
- Niveles de soporte y resistencia
- Indicadores técnicos (RSI, MACD, SRSI, ADX)
- Correlaciones macro (DXY, Yields, VIX)
- Escenarios de trading con objetivos
- Gestión de riesgo
- Resumen ejecutivo

### Características PWA
- Funciona offline (caché de última versión)
- Instalable en cualquier dispositivo
- Notificaciones push (configurable)
- Actualizaciones automáticas

## 🔄 Actualizaciones

Para actualizar la PWA después de cambios:

1. Incrementa la versión en `sw.js`:
```javascript
const CACHE_NAME = 'trading-analysis-v1.1';  // Incrementar versión
```

2. El Service Worker se actualizará automáticamente en la siguiente visita

## 📝 Licencia

Proyecto privado - Julio Montana Trading System

## 🤝 Soporte

Para problemas o sugerencias, contacta al desarrollador.

---

**Versión:** 1.0
**Última actualización:** Diciembre 2025
