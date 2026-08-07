require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const connectDatabase = require('./config/database');

require('./models');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const invitationRoutes = require('./routes/invitationRoutes');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// This serves App3.html from Backend/public
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/invitations', invitationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ZooOps backend is running'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'App3.html'));
});

app.get('/App3.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'App3.html'));
});

app.get('/App3', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'App3.html'));
});

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });