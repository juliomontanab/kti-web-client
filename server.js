const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.listen(PORT, () => { console.log(`🚀 Trading PWA ejecutándose en http://localhost:${PORT}`); console.log(`📊 Presiona Ctrl+C para detener el servidor`); });
