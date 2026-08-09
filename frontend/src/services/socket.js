import io from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  socket = io(socketUrl, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event listeners helpers
export const onNotification = (callback) => {
  if (socket) {
    socket.on('notification', callback);
  }
};

export const onMessage = (callback) => {
  if (socket) {
    socket.on('receive_message', callback);
  }
};

export const onStatusUpdate = (callback) => {
  if (socket) {
    socket.on('status_updated', callback);
  }
};

export const onTyping = (callback) => {
  if (socket) {
    socket.on('user_typing', callback);
  }
};

export const onProviderStatusChanged = (callback) => {
  if (socket) {
    socket.on('provider_status_changed', callback);
  }
};

// Socket emit helpers
export const joinBooking = (bookingId) => {
  if (socket) {
    socket.emit('join_booking', bookingId);
  }
};

export const leaveBooking = (bookingId) => {
  if (socket) {
    socket.emit('leave_booking', bookingId);
  }
};

export const sendMessage = (bookingId, message, senderName) => {
  if (socket) {
    socket.emit('send_message', {
      bookingId,
      message,
      senderName,
      senderId: localStorage.getItem('userId'),
      timestamp: new Date(),
    });
  }
};

export const updateBookingStatus = (bookingId, status, recipientId) => {
  if (socket) {
    socket.emit('booking_status_changed', {
      bookingId,
      status,
      recipientId,
    });
  }
};

export const emitNewBookingRequest = (providerId, bookingId, customerName, serviceCategory, isEmergency) => {
  if (socket) {
    socket.emit('new_booking_request', {
      providerId,
      bookingId,
      customerName,
      serviceCategory,
      isEmergency,
    });
  }
};

export const emitTyping = (bookingId) => {
  if (socket) {
    socket.emit('typing', { bookingId });
  }
};

export const emitStopTyping = (bookingId) => {
  if (socket) {
    socket.emit('stop_typing', { bookingId });
  }
};

export const emitAvailabilityChanged = (isAvailable) => {
  if (socket) {
    socket.emit('availability_changed', { isAvailable });
  }
};
