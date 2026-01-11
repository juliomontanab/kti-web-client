const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

// Leer el archivo input.css
const css = fs.readFileSync('input.css', 'utf8');

// Procesar con PostCSS
postcss([tailwindcss, autoprefixer])
  .process(css, { from: 'input.css', to: 'public/styles.css' })
  .then(result => {
    // Escribir el resultado
    fs.writeFileSync('public/styles.css', result.css);
    if (result.map) {
      fs.writeFileSync('public/styles.css.map', result.map.toString());
    }
    console.log('✅ CSS generado exitosamente en public/styles.css');
  })
  .catch(error => {
    console.error('❌ Error al generar CSS:', error);
    process.exit(1);
  });
