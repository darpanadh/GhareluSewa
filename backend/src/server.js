import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initializeSocket } from './config/socket.js';
import { setIO } from './config/socketHelper.js';
import { initializeDatabase } from './config/initDb.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Always permit requests with no origin, localhost, 127.0.0.1, or specified FRONTEND_URL
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// ── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.IO Setup ────────────────────────────────────────────────────────
const io = initializeSocket(server);
setIO(io);

// ── Start Server ────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Initialize database
    console.log('🔄 Initializing database...');
    await initializeDatabase();

    // Start server
    server.listen(PORT, () => {
      console.log(`\n✅ Gharelu Sewa Backend Server Running`);
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`🔗 API Docs: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`\n📚 Available Endpoints:`);
      console.log(`   POST   /api/auth/register       - Register new user`);
      console.log(`   POST   /api/auth/login          - User login`);
      console.log(`   GET    /api/auth/me             - Get current user`);
      console.log(`   GET    /api/users/providers     - Get all providers`);
      console.log(`   GET    /api/categories          - Get service categories`);
      console.log(`   POST   /api/bookings            - Create booking`);
      console.log(`   GET    /api/bookings            - Get user bookings`);
      console.log(`   POST   /api/reviews             - Create review`);
      console.log(`   POST   /api/messages            - Send message`);
      console.log(`   GET    /api/notifications       - Get notifications`);
      console.log(`   GET    /api/admin/stats         - Admin statistics`);
      console.log('\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();

export { app, server, io };
