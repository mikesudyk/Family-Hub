require('dotenv').config();
const http         = require('http');
const { Server }   = require('socket.io');
const jwt          = require('jsonwebtoken');

const { runMigrations } = require('./db');
const { setIo }         = require('./socket');
const { app, allowedOrigins } = require('./app');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});
setIo(io);

// Socket.io — verify JWT from httpOnly cookie
io.use((socket, next) => {
  const cookieStr = socket.handshake.headers.cookie || '';
  const match = cookieStr.match(/(?:^|;\s*)aeramea_token=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : null;
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
    setInterval(runPeriodicSync, 15 * 60 * 1000);
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
