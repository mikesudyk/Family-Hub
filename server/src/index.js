require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');

const { runMigrations } = require('./db');
const { setIo }         = require('./socket');
const { verifyToken }   = require('./middleware/auth');

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

const app    = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
setIo(io);

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/calendar', calendarSyncRoutes); // /connect, /callback, /webhook — some public, some use verifyToken internally
app.use('/api/calendar', verifyToken, calendarRoutes);
app.use('/api/settings', verifyToken, settingsRoutes);

// Socket.io — verify JWT, join family room
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId   = payload.userId;
    socket.familyId = payload.familyId;
    socket.memberId = payload.memberId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', socket => {
  const room = `family:${socket.familyId}`;
  socket.join(room);
  console.log(`[ws] ${socket.id} joined ${room}`);
  socket.on('disconnect', () => console.log(`[ws] ${socket.id} left ${room}`));
});

const PORT = process.env.PORT || 3001;

async function runPeriodicSync() {
  try {
    const { pool } = require('./db');
    const { syncFromGoogle } = require('./services/googleCalendar');
    const { syncFromIcloud } = require('./services/icloudCalendar');
    const r = await pool.query('SELECT * FROM calendar_connections');
    for (const conn of r.rows) {
      if (conn.provider === 'google') {
        await syncFromGoogle(conn).catch(err => console.error(`[sync google ${conn.id}]`, err.message));
      } else if (conn.provider === 'icloud') {
        await syncFromIcloud(conn).catch(err => console.error(`[sync icloud ${conn.id}]`, err.message));
      }
    }
  } catch (err) {
    console.error('[periodic sync]', err.message);
  }
}

async function start() {
  try {
    await runMigrations();
    server.listen(PORT, () => console.log(`Aeramea API running on port ${PORT}`));
    // Sync all Google calendars every 15 minutes
    setInterval(runPeriodicSync, 15 * 60 * 1000);
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
