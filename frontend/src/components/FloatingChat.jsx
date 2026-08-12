import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { messageAPI, bookingAPI } from '../services/api';
import { format } from 'date-fns';

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Listen for new messages & open requests globally
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Listen for custom trigger events (e.g. from clicking a chat button or notification)
    const handleOpenChat = (e) => {
      const { bookingId } = e.detail;
      if (bookingId) {
        setActiveBookingId(bookingId);
        setIsOpen(true);
        setIsMinimized(false);
      }
    };

    // Listen for socket message notifications to auto pop up
    const handleNewSocketMessage = (e) => {
      const data = e.detail;
      if (data.type === 'new_message' && data.bookingId) {
        // If it's a new message, pop it up!
        if (activeBookingId !== data.bookingId) {
          setActiveBookingId(data.bookingId);
          setIsOpen(true);
          setIsMinimized(false);
          setUnreadCount(prev => prev + 1);
        } else if (isMinimized) {
          setIsMinimized(false);
        }
      }
    };

    window.addEventListener('open_global_chat', handleOpenChat);
    window.addEventListener('new_chat_notification', handleNewSocketMessage);

    return () => {
      window.removeEventListener('open_global_chat', handleOpenChat);
      window.removeEventListener('new_chat_notification', handleNewSocketMessage);
    };
  }, [isAuthenticated, user, activeBookingId, isMinimized]);

  // 2. Manage Socket room & listen for messages in real-time when chat is active
  useEffect(() => {
    if (!activeBookingId) return;

    // Fetch booking details (to display correct names & info)
    const fetchDetails = async () => {
      try {
        const res = await bookingAPI.getBookingById(activeBookingId);
        setBookingDetails(res.data);
      } catch (err) {
        console.error('Failed to load booking details for popup chat', err);
      }
    };
    fetchDetails();

    // Fetch messages
    const fetchMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await messageAPI.getBookingMessages(activeBookingId);
        const data = Array.isArray(res.data) ? res.data : [];
        const transformed = data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name || 'User',
          content: m.content,
          timestamp: m.sent_at
        }));
        setMessages(transformed);
      } catch (err) {
        setError('Failed to load chat history');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    // Socket listeners setup
    const socket = getSocket();
    if (socket) {
      socketRef.current = socket;
      socket.emit('join_booking', activeBookingId);

      socket.on('receive_message', (message) => {
        if (message.senderId !== user.id) {
          setMessages(prev => [...prev, message]);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_booking', activeBookingId);
        socketRef.current.off('receive_message');
      }
      setBookingDetails(null);
      setMessages([]);
    };
  }, [activeBookingId, user]);

  // 3. Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!isAuthenticated || !user || user.role === 'admin') return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeBookingId) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      // Optimistic local state update
      const localMsg = {
        id: `local-${Date.now()}`,
        senderId: user.id,
        senderName: user.name,
        content: messageText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, localMsg]);

      // Save to database
      await messageAPI.sendMessage({
        booking_id: activeBookingId,
        content: messageText
      });

      // Emit via socket
      const socket = getSocket();
      if (socket) {
        socket.emit('send_message', {
          bookingId: activeBookingId,
          message: messageText,
          senderName: user.name,
          senderId: user.id
        });
      }
    } catch (err) {
      console.error('Failed to send popup message', err);
    }
  };

  const getOtherPartyName = () => {
    if (!bookingDetails) return `Job #${activeBookingId}`;
    return user.role === 'customer' 
      ? bookingDetails.provider_name || 'Verified Provider' 
      : bookingDetails.customer_name || 'Customer';
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveBookingId(null);
    setUnreadCount(0);
  };

  // Render bubble icon
  if (!isOpen) {
    if (unreadCount === 0) return null; // Only show bubble if there are new unread messages

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 w-14 h-14 bg-[#07535f] hover:bg-[#06424b] text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 duration-200 z-[999] animate-bounce group cursor-pointer"
        title="Open Live Chat"
      >
        <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-extrabold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
          {unreadCount}
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed right-24 z-[999] transition-all duration-300 flex flex-col shadow-2xl border border-gray-200 bg-white overflow-hidden ${
      isMinimized 
        ? "bottom-6 w-72 h-14 rounded-2xl" 
        : "bottom-6 w-80 h-96 sm:w-96 sm:h-[480px] rounded-3xl"
    }`}>
      {/* ── Header ── */}
      <div 
        onClick={() => isMinimized && setIsMinimized(false)}
        className={`px-4 py-3 bg-gradient-to-r from-[#07535f] to-[#0a7587] text-white flex items-center justify-between select-none shrink-0 ${
          isMinimized ? "cursor-pointer h-full" : "h-14"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute" />
          <div className="ml-1">
            <h4 className="font-extrabold text-xs truncate max-w-[140px] sm:max-w-[200px] leading-tight">
              {getOtherPartyName()}
            </h4>
            {!isMinimized && (
              <p className="text-[10px] text-teal-100 font-medium">
                {bookingDetails?.service_category || 'Service Booking'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isMinimized ? "Expand Chat" : "Minimize Chat"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close Chat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Chat Messages Body ── */}
      {!isMinimized && (
        <>
          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50 flex flex-col min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#07535f] mb-2" />
                <span className="text-xs font-semibold">Loading conversation...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-rose-500 text-center p-4">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 text-xs my-auto">
                Send a message to start chatting!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div 
                    key={msg.id || idx} 
                    className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}
                  >
                    {!isMe && (
                      <span className="text-[9px] text-gray-400 mb-0.5 ml-1 font-semibold">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={clsx(
                      "max-w-[80%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed",
                      isMe 
                        ? "bg-[#07535f] text-white rounded-tr-sm" 
                        : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-xs"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-gray-400 mt-1 mx-1">
                      {format(new Date(msg.timestamp), 'h:mm a')}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Box ── */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#07535f] focus:border-[#07535f] text-gray-800 font-medium"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-[#07535f] hover:bg-[#06424b] disabled:opacity-50 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
