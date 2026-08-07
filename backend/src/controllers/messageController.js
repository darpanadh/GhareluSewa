import { query } from '../config/database.js';
import { sendNotification } from '../config/socketHelper.js';

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { booking_id, content } = req.body;

    if (!booking_id || !content) {
      return res.status(400).json({ error: 'Booking ID and content required' });
    }

    // Verify user is part of booking
    const bookingResult = await query(
      'SELECT customer_id, provider_id FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (req.userId !== booking.customer_id && req.userId !== booking.provider_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create message
    const result = await query(
      `INSERT INTO messages (booking_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, booking_id, sender_id, content, sent_at`,
      [booking_id, req.userId, content]
    );

    const message = result.rows[0];

    // Notify the other party
    const otherUserId = req.userId === booking.customer_id ? booking.provider_id : booking.customer_id;
    const senderUser = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const senderName = senderUser.rows[0]?.name || 'User';

    await sendNotification(
      otherUserId,
      booking_id,
      `💬 New message from ${senderName}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      'new_message'
    );

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages for booking
export const getBookingMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify access
    const bookingResult = await query(
      'SELECT customer_id, provider_id FROM bookings WHERE id = $1',
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    if (req.userId !== booking.customer_id && req.userId !== booking.provider_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT m.id, m.booking_id, m.sender_id, m.content, m.sent_at,
              u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.booking_id = $1
       ORDER BY m.sent_at DESC
       LIMIT $2 OFFSET $3`,
      [bookingId, limit, offset]
    );

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Get message count for booking
export const getMessageCount = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await query(
      'SELECT COUNT(*) as total FROM messages WHERE booking_id = $1',
      [bookingId]
    );

    res.json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Get message count error:', error);
    res.status(500).json({ error: 'Failed to fetch message count' });
  }
};
