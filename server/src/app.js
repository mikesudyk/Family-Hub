require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');

const { verifyToken } = require('./middleware/auth');

const authRoutes         = require('./routes/auth');
const familyRoutes       = require('./routes/family');
const membersRoutes      = require('./routes/members');
const choresRoutes       = require('./routes/chores');
const goalsRoutes        = require('./routes/goals');
const todosRoutes        = require('./routes/todos');
const mealsRoutes        = require('./routes/meals');
const shoppingRoutes     = require('./routes/shopping');
const calendarRoutes     = require('./routes/calendar');
const calendarSyncRoutes = require('./routes/calendarSync');
const settingsRoutes     = require('./routes/settings');
const feedbackRoutes     = require('./routes/feedback');
const uploadsRoutes      = require('./routes/uploads');

const allowedOrigins = process.env.CLIENT_URL
  ? [...process.env.CLIENT_URL.split(','), 'http://localhost:5173']
  : ['http://localhost:5173'];

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/join',   authLimiter);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/family',   verifyToken, familyRoutes);
app.use('/api/members',  verifyToken, membersRoutes);
app.use('/api/chores',   verifyToken, choresRoutes);
app.use('/api/goals',    verifyToken, goalsRoutes);
app.use('/api/todos',    verifyToken, todosRoutes);
app.use('/api/meals',    verifyToken, mealsRoutes);
app.use('/api/shopping', verifyToken, shoppingRoutes);
app.use('/api/calendar', calendarSyncRoutes);
app.use('/api/calendar', verifyToken, calendarRoutes);
app.use('/api/settings', verifyToken, settingsRoutes);
app.use('/api/feedback', verifyToken, feedbackRoutes);
app.use('/api/uploads',  verifyToken, uploadsRoutes);

module.exports = { app, allowedOrigins };
