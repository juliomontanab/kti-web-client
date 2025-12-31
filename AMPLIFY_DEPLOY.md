# 🚀 Guía de Deploy en AWS Amplify

## Preparación del Proyecto

### 1. Configurar la API

Antes de desplegar, asegúrate de configurar la URL de tu API en `public/app.js`:

```javascript
const API_BASE_URL = 'https://tu-api-real.com/api';
```

### 2. Subir a GitHub

```bash
# Inicializar repositorio Git
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "Initial commit - Trading PWA"

# Renombrar rama a main
git branch -M main

# Conectar con GitHub (crea el repo primero en github.com)
git remote add origin https://github.com/tu-usuario/trading-pwa.git

# Subir el código
git push -u origin main
```

## Deploy en AWS Amplify

### Opción 1: Desde la Consola Web (Más Fácil)

1. **Accede a AWS Amplify Console**
   - Ve a https://console.aws.amazon.com/amplify/
   - O busca "Amplify" en la consola de AWS

2. **Crear Nueva App**
   - Click en "New app" → "Host web app"
   
3. **Conectar Repositorio**
   - Selecciona "GitHub"
   - Autoriza a AWS Amplify a acceder a tus repos
   - Selecciona el repositorio `trading-pwa`
   - Selecciona la rama `main`

4. **Configuración de Build**
   Amplify detectará automáticamente `amplify.yml` con esta configuración:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: public
       files:
         - '**/*'
   ```

5. **Variables de Entorno (Opcional)**
   Si necesitas variables de entorno:
   - En "Advanced settings"
   - Agrega: `API_BASE_URL=https://tu-api.com/api`

6. **Guardar y Desplegar**
   - Click en "Save and deploy"
   - Amplify comenzará el proceso de build
   - En 2-3 minutos tendrás tu URL pública

### Opción 2: Desde AWS CLI

```bash
# Instalar Amplify CLI
npm install -g @aws-amplify/cli

# Configurar credenciales AWS
amplify configure

# Inicializar proyecto
amplify init

# Agregar hosting
amplify add hosting

# Publicar
amplify publish
```

## Configuración Post-Deploy

### 1. Configurar Dominio Personalizado

En la consola de Amplify:
1. Ve a "Domain management"
2. Click "Add domain"
3. Ingresa tu dominio (ej: `trading.tudominio.com`)
4. Amplify configurará automáticamente el certificado SSL

### 2. Configurar Notificaciones

Para recibir alertas de deploy:
1. Ve a "Notifications"
2. Configura notificaciones por email o SNS
3. Recibirás alertas de builds exitosos/fallidos

### 3. Habilitar CI/CD

Ya está habilitado por defecto:
- Cada push a `main` despliega automáticamente
- Puedes configurar branch previews para PRs
- Rollback instantáneo a versiones anteriores

## Estructura de URLs

Después del deploy, tendrás:

- **URL de producción**: `https://main.xxxxx.amplifyapp.com`
- **Dominio personalizado**: `https://trading.tudominio.com` (si lo configuraste)

## Variables de Entorno en Amplify

Para configurar diferentes APIs según el ambiente:

1. En la consola de Amplify, ve a "Environment variables"
2. Agrega:
   ```
   API_BASE_URL=https://api-produccion.com/api
   ```

3. Modifica `public/app.js` para usar la variable:
   ```javascript
   const API_BASE_URL = process.env.API_BASE_URL || 'https://api-default.com/api';
   ```

## Monitoreo y Logs

### Ver Logs de Build

1. En la consola de Amplify
2. Click en el build que quieres revisar
3. Ve la sección "Build logs"

### Métricas de la App

Amplify proporciona:
- Número de visitantes
- Solicitudes por minuto
- Datos transferidos
- Errores 4xx/5xx

## Solución de Problemas

### Build Falla

**Error común**: Node version incompatible

Solución: Especifica la versión de Node en `package.json`:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### PWA no se instala

Asegúrate que:
1. Los iconos estén en `/public/icon-192.png` y `/public/icon-512.png`
2. El manifest.json tenga las rutas correctas
3. El Service Worker esté registrado correctamente

### CORS en producción

Si tienes problemas de CORS con tu API:

1. Configura tu API para permitir el dominio de Amplify:
   ```javascript
   app.use(cors({
     origin: 'https://main.xxxxx.amplifyapp.com'
   }));
   ```

## Actualizar la App

```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción de los cambios"
git push

# Amplify desplegará automáticamente
```

## Rollback a Versión Anterior

1. En la consola de Amplify
2. Ve a "Deployments"
3. Selecciona el deployment anterior
4. Click en "Redeploy this version"

## Costos

AWS Amplify ofrece:
- **Free Tier**: 1000 horas de build/mes
- **Hosting gratuito**: Hasta 15GB transferidos/mes
- Después: ~$0.15 por GB transferido

Para una PWA pequeña, probablemente te mantengas en el free tier.

## Mejores Prácticas

1. **Usa variables de entorno** para configuraciones sensibles
2. **Habilita branch previews** para probar antes de producción
3. **Configura notifications** para estar al tanto de los deploys
4. **Usa dominio personalizado** para una URL profesional
5. **Revisa los logs** regularmente para detectar problemas

## Recursos Útiles

- [Documentación AWS Amplify](https://docs.amplify.aws/)
- [Guía de PWA en Amplify](https://docs.amplify.aws/guides/hosting/progressive-web-app/)
- [Troubleshooting Amplify](https://docs.amplify.aws/guides/hosting/troubleshooting/)

---

**¿Necesitas ayuda?** Contacta al equipo de desarrollo.

Julio Montana - Trading Analysis System
