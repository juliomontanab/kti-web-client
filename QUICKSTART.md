# 🚀 Inicio Rápido - Trading PWA

## Pasos para poner en marcha tu PWA en 5 minutos

### 1️⃣ Generar los Iconos

1. Abre el archivo `create-icons.html` en tu navegador
2. Descarga los dos iconos (192x192 y 512x512)
3. Guárdalos en la carpeta raíz del proyecto con los nombres:
   - `icon-192.png`
   - `icon-512.png`

### 2️⃣ Configurar la API

Edita `app.js` línea 1 y cambia la URL de tu API:

```javascript
const API_BASE_URL = 'https://tu-api.com/api';
```

**Endpoints necesarios:**
- `GET /symbols` → Lista de símbolos
- `GET /analysis?id={_id}` → Detalle del análisis

### 3️⃣ Instalar y probar localmente

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

Luego abre: http://localhost:3000

### 4️⃣ Testing sin API (Modo Demo)

Si aún no tienes la API lista, la PWA funcionará automáticamente con datos de prueba.

Los datos mock están en `app.js` en las funciones:
- `getMockSymbols()`
- `getMockDetail()`

### 5️⃣ Deploy en AWS Amplify

**Opción A - Desde GitHub (Recomendado):**
1. Sube tu proyecto a GitHub
2. Ve a [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
3. Click "New app" → "Host web app"
4. Conecta tu repositorio
5. Amplify detecta automáticamente la configuración
6. ¡Deploy automático en cada push!

**Opción B - Deploy rápido (Netlify):**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Opción C - Vercel:**
```bash
npx vercel --prod
```

## ✅ Checklist Pre-Deploy

- [ ] Iconos generados (icon-192.png, icon-512.png)
- [ ] URL de API configurada en app.js
- [ ] Probado localmente
- [ ] Manifest.json personalizado (nombre, descripción)
- [ ] Service Worker funcionando (revisa en DevTools)

## 🎯 Siguientes Pasos

1. **Personaliza los colores**: Edita las variables CSS en `index.html`
2. **Ajusta el logo**: Cambia el emoji 📊 en el header
3. **Configura notificaciones**: Implementa push notifications
4. **Agrega más filtros**: Filtro por tipo de activo, timeframe, etc.

## 📱 Instalar como App

### Android:
1. Chrome → Menú → "Agregar a pantalla de inicio"

### iOS:
1. Safari → Compartir → "Agregar a pantalla de inicio"

### Desktop:
1. Chrome/Edge → Icono de instalación en barra de direcciones

## 🆘 Problemas Comunes

**Error: Service Worker no registra**
→ Debes usar HTTPS (o localhost)

**Error: CORS al llamar la API**
→ Configura CORS en tu backend:
```javascript
app.use(cors());
```

**Los datos no se muestran**
→ Revisa la consola del navegador (F12)
→ Verifica que los endpoints retornen el JSON correcto

**PWA no se instala**
→ Verifica que existan los archivos icon-192.png y icon-512.png
→ Revisa que manifest.json esté correctamente configurado

## 🔄 Actualizar la PWA

Después de hacer cambios:

1. Incrementa la versión en `sw.js`:
```javascript
const CACHE_NAME = 'trading-analysis-v1.1';
```

2. Los usuarios obtendrán la actualización en su siguiente visita

## 💡 Tips Pro

- Usa Chrome DevTools → Lighthouse para auditar tu PWA
- Revisa Application → Service Workers para debugging
- Prueba en modo offline (DevTools → Network → Offline)
- Optimiza las imágenes antes de incluirlas

---

**¿Necesitas ayuda?** Revisa el README.md completo o contacta al desarrollador.

Julio Montana - Trading Analysis System
