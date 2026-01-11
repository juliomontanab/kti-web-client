const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());

// New dashboard (default) - must be before static middleware
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); });

// Legacy app
app.get('/legacy', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard.html')); });

app.listen(PORT, () => {
    console.log(`🚀 KTI Dashboard ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Dashboard Pro: http://localhost:${PORT}/`);
    console.log(`📱 App Legacy: http://localhost:${PORT}/legacy`);
    console.log(`Presiona Ctrl+C para detener el servidor`);
});
