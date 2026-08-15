import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    socket.userId = decoded.userId;
    socket.role = decoded.role;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected: ${socket.id}`);

    // Join user-specific room for notifications
    socket.join(`user_${socket.userId}`);

    // ── Join booking room ──────────────────────────────────────────────────
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
      console.log(`User ${socket.userId} joined booking ${bookingId}`);
    });

    // ── Leave booking room ─────────────────────────────────────────────────
    socket.on('leave_booking', (bookingId) => {
      socket.leave(`booking_${bookingId}`);
      console.log(`User ${socket.userId} left booking ${bookingId}`);
    });

    // ── Send message ───────────────────────────────────────────────────────
    socket.on('send_message', (data) => {
      // data = { bookingId, message, senderName, senderId, timestamp }
      io.to(`booking_${data.bookingId}`).emit('receive_message', {
        senderId: socket.userId,
        senderName: data.senderName,
        content: data.message,
        timestamp: new Date(),
      });
    });

    // ── Booking status update ──────────────────────────────────────────────
    socket.on('booking_status_changed', (data) => {
      // data = { bookingId, status, message }
      io.to(`booking_${data.bookingId}`).emit('status_updated', {
        status: data.status,
        message: data.message,
        timestamp: new Date(),
      });

      // Also notify the other user specifically
      io.to(`user_${data.recipientId}`).emit('notification', {
        type: 'booking_update',
        message: `Booking status changed to ${data.status}`,
        bookingId: data.bookingId,
      });
    });

    // ── New booking request (for providers) ─────────────────────────────────
    socket.on('new_booking_request', (data) => {
      // data = { providerId, bookingId, customerName, serviceCategory }
      io.to(`user_${data.providerId}`).emit('notification', {
        type: 'new_booking',
        message: `New ${data.serviceCategory} booking from ${data.customerName}`,
        bookingId: data.bookingId,
        urgent: data.isEmergency || false,
      });
    });

    // ── Typing indicator ───────────────────────────────────────────────────
    socket.on('typing', (data) => {
      socket.broadcast.to(`booking_${data.bookingId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('stop_typing', (data) => {
      socket.broadcast.to(`booking_${data.bookingId}`).emit('user_typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // ── Provider real-time location update ────────────────────────────────
    // data = { bookingId, lat, lng, distance?, timeRemaining? }
    socket.on('provider_location_update', (data) => {
      if (!data.bookingId || data.lat === undefined || data.lng === undefined) return;
      io.to(`booking_${data.bookingId}`).emit('location_update', {
        lat:           data.lat,
        lng:           data.lng,
        distance:      data.distance,
        timeRemaining: data.timeRemaining,
      });
    });

    // ── Provider availability toggled ──────────────────────────────────────
    socket.on('availability_changed', (data) => {
      // data = { providerId, isAvailable }
      io.emit('provider_status_changed', {
        providerId: socket.userId,
        isAvailable: data.isAvailable,
      });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });

    // ── Error handling ─────────────────────────────────────────────────────
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
};

// Helper function to emit notification to specific user
export const notifyUser = (io, userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

// Helper function to broadcast to booking participants
export const notifyBookingParticipants = (io, bookingId, event, data) => {
  io.to(`booking_${bookingId}`).emit(event, data);
};
