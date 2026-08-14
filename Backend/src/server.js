require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const connectDatabase = require('./config/database');
const ensureDefaultRoles = require('./utils/ensureDefaultRoles');
const migrateDatabase = require('./utils/migrateDatabase');
const ensureDefaultLocations = require('./utils/ensureDefaultLocations');

require('./models');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const fileRoutes = require('./routes/fileRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const assistantRoutes = require('./routes/assistantRoutes');

const app = express();

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '').split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/assistant', assistantRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'App3.html')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ZooOps backend is running'
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled request error:', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: error.message || 'Unexpected server error.' });
});

const port = process.env.PORT || 5000;

connectDatabase()
  .then(async () => {
    await migrateDatabase();
    await ensureDefaultRoles();
    await ensureDefaultLocations();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });
