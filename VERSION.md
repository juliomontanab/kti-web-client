# Control de Versiones y Caché

## Cómo actualizar la aplicación

Cada vez que hagas cambios en el código, sigue estos pasos:

### 1. Incrementar la versión en ambos archivos:

**En `public/app.js`** (línea 2):
```javascript
const APP_VERSION = '1.0.X'; // Incrementa X
```

**En `public/sw.js`** (línea 2):
```javascript
const VERSION = '1.0.X'; // Usa el mismo número que en app.js
```

### 2. ¿Qué pasa cuando cambias la versión?

- El sistema detecta automáticamente que hay una nueva versión
- Limpia el localStorage (preservando configuraciones importantes)
- Elimina cachés antiguos del Service Worker
- Recarga la página automáticamente con la nueva versión
- Los archivos HTML, JS y CSS siempre se traen desde la red (Network First)
- Las imágenes y recursos estáticos usan caché (Cache First)

### 3. Estrategias de caché implementadas:

#### Network First (HTML, JS, CSS):
- Siempre intenta traer desde la red
- Si falla la red, usa el caché como fallback
- Garantiza que siempre tengas la última versión del código

#### Cache First (Imágenes, iconos):
- Usa el caché si existe
- Si no existe en caché, lo trae de la red
- Más rápido para recursos que no cambian frecuentemente

### 4. Limpieza manual de caché (para desarrollo):

Si necesitas forzar la limpieza de caché durante el desarrollo, abre la consola del navegador y ejecuta:

```javascript
// Limpiar todo el caché
caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
    console.log('Caché limpiado');
});

// Limpiar localStorage
localStorage.clear();
console.log('localStorage limpiado');

// Recargar la página
location.reload(true);
```

### 5. Verificación automática de actualizaciones:

- El Service Worker verifica actualizaciones cada 5 minutos
- Puedes forzar una verificación recargando la página
- Los logs en consola te indican cuando se detecta una actualización

### 6. Ejemplo de flujo de actualización:

```
Usuario visita la app:
1. checkVersion() compara versión almacenada con APP_VERSION
2. Si son diferentes:
   - Limpia localStorage (preservando user_preferences)
   - Limpia cachés antiguos
   - Guarda nueva versión
   - Recarga la página
3. Si son iguales:
   - Continúa normalmente
```

## Logs en consola

Busca estos logs para verificar que todo funciona:

- `[Version] Actualización detectada: X.X.X -> X.X.X`
- `[Cache] Eliminando caché antigua: trading-analysis-vX.X.X`
- `[SW] Installing version: X.X.X`
- `[SW] Activating version: X.X.X`
- `[SW] Deleting old cache: trading-analysis-vX.X.X`
- `[SW] Service Worker registrado`
