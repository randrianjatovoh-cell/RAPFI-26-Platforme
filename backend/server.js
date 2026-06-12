require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gl', require('./routes/gl'));
app.use('/api/depenses', require('./routes/depenses'));
app.use('/api/membres', require('./routes/membres'));
app.use('/api/months', require('./routes/months'));
app.use('/api/config', require('./routes/config'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/frais', require('./routes/frais'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/eglises', require('./routes/eglises'));

const start = async () => {
  await initDb();
  app.listen(process.env.PORT || 5000, () => {
    console.log('✅ Backend démarré sur http://localhost:5000');
  });
};
start();