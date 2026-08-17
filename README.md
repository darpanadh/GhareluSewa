# Gharelu Sewa - Local Service Platform

🏠 **Connecting you with trusted local service providers**

A full-stack web application for booking household services like electrical work, plumbing, tutoring, cleaning, and repairs. Built with modern web technologies for scalability, security, and user experience.

## 📋 Quick Start

### Prerequisites
- **Node.js** (v16+ recommended)
- **npm** or **yarn**
- **PostgreSQL** (v12+)

### Installation

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials (required before starting!)
nano .env

# Initialize database (creates tables and mock data)
npm run init-db

# Start development server
npm run dev
```

**Environment Variables (.env):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gharelu_sewa
DB_USER=postgres
DB_PASSWORD=yourpassword
PORT=5000
JWT_SECRET=your_super_secret_key_change_this
FRONTEND_URL=http://localhost:5173
```

The server will automatically create all tables on first run.

#### 2. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

**Environment Variables (.env):**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

## 🏗️ Architecture

```
Gharelu Sewa/
├── Backend/
│   ├── src/
│   │   ├── config/         # Database & Socket configuration
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # API client service
│   │   ├── utils/          # JWT, password utilities
│   │   └── server.js       # Express app entry
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Page components
│   │   ├── services/       # API & Socket clients
│   │   ├── App.jsx         # Main app with routing
│   │   └── main.jsx        # Entry point
│   ├── index.html
│   └── package.json
│
└── README.md
```

## 🔑 Demo Credentials

### Customer
- **Email**: customer@test.com
- **Password**: password123

### Service Provider
- **Email**: provider@test.com
- **Password**: password123

### Administrator
- **Email**: admin@test.com
- **Password**: password123

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **Lucide Icons** - Icon library
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Socket.IO** - WebSocket server
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📚 API Endpoints

### Authentication
```
POST   /api/auth/register      - User registration
POST   /api/auth/login         - User login
GET    /api/auth/me            - Get current authenticated user
POST   /api/auth/reverify-kyc  - Re-submit provider KYC verification
```

### Users & Providers Lookup
```
PATCH  /api/users/profile                    - Update user profile
GET    /api/users/providers                  - Browse all service providers
GET    /api/users/providers/:id              - Get provider profile details
GET    /api/users/providers-by-ward/:ward/:category_id - Filter providers by ward & category
GET    /api/users/search                     - Search users/providers
GET    /api/users/public-stats               - Get public platform statistics
```

### Service Categories
```
GET    /api/categories                       - Get all service categories
GET    /api/categories/:id/providers         - Get providers in category
POST   /api/categories                       - Create category (Admin)
PATCH  /api/categories/:id                   - Update category (Admin)
DELETE /api/categories/:id                   - Delete category (Admin)
```

### Bookings
```
POST   /api/bookings                         - Create booking request
GET    /api/bookings                         - User's bookings
GET    /api/bookings/:id                     - Get booking details
PATCH  /api/bookings/:id/status              - Update booking status
PATCH  /api/bookings/:id/cancel              - Cancel booking
POST   /api/bookings/emergency/create       - Create emergency booking request
```

### Payments & Escrow
```
POST   /api/payments/initiate/:bookingId     - Initiate digital payment (eSewa / Khalti)
GET    /api/payments/verify                  - Verify eSewa HMAC signature & payment callback
GET    /api/payments/booking/:bookingId      - Get payment record for booking
POST   /api/payments/manual/:bookingId       - Submit manual payment details
POST   /api/payments/cash/:bookingId         - Record cash payment
POST   /api/payments/release/:paymentId      - Release escrow payment to provider (Admin)
GET    /api/payments/all                     - View all platform transactions (Admin)
```

### Provider Portal & Earnings
```
POST   /api/providers/profile                - Create provider profile
GET    /api/providers/profile/:providerId    - Get provider profile details
PATCH  /api/providers/profile                - Update provider profile & KYC info
PATCH  /api/providers/availability           - Toggle online/offline status
GET    /api/providers/earnings               - View provider earnings summary
POST   /api/providers/payouts                - Submit payout request
GET    /api/providers/payouts                - Get provider payout history
```

### Reviews & Ratings
```
POST   /api/reviews                          - Submit service review
GET    /api/reviews/provider/:id             - Get provider reviews
GET    /api/reviews/booking/:id              - Get review for specific booking
GET    /api/reviews/stats/:id                - Get provider rating stats
DELETE /api/reviews/:reviewId                - Delete review (Admin)
```

### Messaging & Notifications
```
POST   /api/messages                         - Send in-booking message
GET    /api/messages/booking/:id             - Get booking chat messages
GET    /api/messages/booking/:id/count       - Unread message count
GET    /api/notifications                    - User notifications
PATCH  /api/notifications/:id/read           - Mark notification as read
PATCH  /api/notifications/read-all           - Mark all notifications as read
```

### Admin Operations
```
GET    /api/admin/stats                      - Overview platform statistics
GET    /api/admin/users                      - List all platform users
PATCH  /api/admin/users/:userId/deactivate   - Deactivate user account
PATCH  /api/admin/users/:userId/activate     - Reactivate user account
GET    /api/admin/providers/pending         - Get pending KYC verification requests
GET    /api/admin/providers/all             - Get all service providers
PATCH  /api/admin/providers/:userId/verify   - Approve provider KYC verification
PATCH  /api/admin/providers/:userId/reject   - Reject provider KYC verification
PATCH  /api/admin/providers/:userId/clear-dues - Clear provider dues
GET    /api/admin/bookings                   - View all bookings
GET    /api/admin/bookings/export            - Export bookings as CSV report
GET    /api/admin/payouts                    - View provider payout requests
PATCH  /api/admin/payouts/:id/status         - Approve/reject payout request
GET    /api/admin/analytics                  - Get platform analytics data
```

## 🔐 Security Features

- ✅ **JWT Authentication** - Token-based secure authentication
- ✅ **Password Hashing** - bcrypt with salt rounds for security
- ✅ **Role-Based Access Control** - Customer, Provider, Admin roles
- ✅ **HMAC Signature Verification** - Secure eSewa payment callback validation
- ✅ **CORS Protection** - Configured cross-origin resource sharing
- ✅ **Input Validation** - Client and server-side request validation
- ✅ **Error Handling** - Comprehensive error management and logs
- ✅ **Database Constraints** - Foreign keys, enums, and data integrity

## 🚀 Features Implemented

### For Customers
- ✅ User registration & authentication with live input validation
- ✅ Browse service providers by category, rating, and city/ward
- ✅ Nearest provider prioritization based on service category & location proximity
- ✅ Interactive Multi-step Booking Wizard with detailed location fields (landmark, street address, ward)
- ✅ Emergency booking requests for urgent household needs
- ✅ Direct online payment integration (eSewa with HMAC signature verification, Khalti, Manual, Cash)
- ✅ Escrow payment protection (funds held safely until service completion)
- ✅ Live Map Tracking for ongoing active bookings
- ✅ In-booking real-time chat with assigned service provider
- ✅ Rate and review completed services with synchronized ratings
- ✅ Booking history with detailed invoice generation and download

### For Service Providers
- ✅ Provider registration & profile management
- ✅ KYC identity verification upload (Citizenship No. & Document photos)
- ✅ Verification status tracking (Approved, Pending, Rejected) with re-verification request
- ✅ Toggle availability (Online / Offline mode)
- ✅ View incoming booking requests with customer location details
- ✅ Accept or decline booking requests
- ✅ Real-time in-booking chat with customer
- ✅ Comprehensive Earnings Dashboard & financial stats
- ✅ Submit payout requests and track payout history
- ✅ Track rating averages and customer review feedback

### For Administrators
- ✅ Comprehensive Admin Dashboard with real-time platform metrics & analytics
- ✅ Complete User Management Table (view users, activate/deactivate accounts, inspect user details)
- ✅ Dedicated Provider KYC Verification UI (review identity documents, verify or reject profiles)
- ✅ Escrow & Payment Management (inspect payments, release escrow funds upon completion)
- ✅ Payout Request Processing (approve or reject provider payout requests)
- ✅ Export platform bookings report as CSV
- ✅ Service category management (create, update, delete categories)

### Real-Time & Infrastructure Features
- ✅ **Socket.IO Integration** - Instant notifications, status change alerts, and live messaging
- ✅ **Live Map Tracking** - Visual tracking of provider status and location
- ✅ **PostgreSQL Auto-Initialization** - Self-healing schema setup with comprehensive multi-ward seeded providers
- ✅ **Vercel SPA Deployment** - Optimized routing rewrite configuration for frontend hosting

## 📦 Database Schema

### Tables
- **users** - Accounts for customers, providers, and admins with ward & verification fields
- **service_categories** - Household service categories (Electrician, Plumber, Cleaner, etc.)
- **provider_profiles** - Extended provider data (hourly rates, KYC docs, badges, rating metrics)
- **bookings** - Booking details (location, landmarks, emergency flag, total price, status)
- **reviews** - Customer ratings, photo attachments, and service feedback
- **messages** - In-booking real-time chat messages
- **notifications** - System and user notification log
- **payments** - Payment records (eSewa OID/RefID, escrow status, amounts, commissions)
- **payout_requests** - Provider withdrawal requests and administrative review statuses

## 🔄 Development Workflow

### Backend Development
```bash
cd backend
npm run dev         # Start with nodemon
npm start          # Production start
```

### Frontend Development
```bash
cd frontend
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 📱 Responsive Design

- ✅ Mobile-first design
- ✅ Tablet optimized
- ✅ Desktop enhanced
- ✅ Touch-friendly UI
- ✅ Accessible navigation

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Push to GitHub and connect to Vercel
```

### Backend (Render)
```bash
# Create Render account and connect GitHub repo
# Set environment variables in Render dashboard
# Deploy!
```

### Database (Supabase/Render)
```bash
# Use managed PostgreSQL from Supabase or Render
# Update DB_HOST, DB_USER, DB_PASSWORD in .env
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Linux/Mac
lsof -i :5000           # Backend
lsof -i :5173           # Frontend

# Windows
netstat -ano | findstr :5000
```

### Database Connection Error
- Check PostgreSQL is running
- Verify credentials in .env
- Ensure database exists: `createdb gharelu_sewa`

### CORS Errors
- Verify FRONTEND_URL in backend .env
- Check Socket.IO CORS configuration

### Hot Reload Not Working
- Restart dev server
- Check file watcher limits (Linux)

## 📖 Documentation

- [Database Architecture](./docs/DATABASE.md) - ER diagrams, columns, constraints and indexes
- [Backend Systems](./docs/BACKEND.md) - Server setup, auth tokens, sockets, and eSewa signatures
- [Frontend Portal](./docs/FRONTEND.md) - React routing, Auth contexts, wizards, and premium dashboard
- [System Interaction Flow](./docs/SYSTEM_FLOW.md) - Mermaids mapping booking lifecycles & transactions
- [Viva/Defense Preparation](./docs/VIVA_QUESTIONS.md) - Examiner/viva questions & detailed answers
- [API Documentation](./API_DOCS.md) - Detailed endpoint docs
- [Database Schema](./SCHEMA.md) - ER diagram and tables
- [Deployment Guide](./DEPLOYMENT.md) - Production setup

## 🤝 Contributing

1. Create a feature branch
2. Commit changes
3. Push to branch
4. Create Pull Request

## 📝 License

MIT License - feel free to use this project

## 💬 Support

For issues or questions:
1. Check troubleshooting section
2. Open an issue on GitHub
3. Contact development team

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [x] Payment gateway integration (eSewa HMAC, Khalti)
- [x] GPS-based provider mapping & live tracking
- [x] Provider background & KYC identity verification
- [x] Ward & location-based provider matching & proximity prioritization
- [x] Comprehensive Admin Portal (Users, Bookings, KYC, Payouts)
- [ ] AI-powered recommendations
- [ ] Multi-language support (Nepali)
- [ ] Premium subscription plans

---

**Made with ❤️ by Gharelu Sewa Team**

Tribhuvan University | Institute of Engineering | Paschimanchal Campus

**2026 - All Rights Reserved**