# 🎬 CineBook — Online Movie Ticket Booking Platform
CineBook is a premium, full-stack online movie ticket engine and booking platform. It features a complete administrative control panel, atomic seat locking, a digital wallet with transaction history, automated show scheduling, and printable tickets with validation QR codes.
---
## 🛠 Tech Stack
### Frontend (Client)
* **Framework**: Next.js 16 (App Router)
* **Library**: React 19, TypeScript
* **Styling**: Vanilla CSS Modules (harmonious dark color schemes, glassmorphism, responsive grids)
* **Icons**: Lucide React
* **Libraries**: 
  * `jspdf` & `html2canvas` (Dynamic PDF ticket generation)
  * `qrcode` (Unique ticket validation code rendering)
  * `react-hot-toast` (Micro-interactions and notices)
### Backend (Server)
* **Runtime**: Node.js, Express
* **Database**: MongoDB Atlas, Mongoose ODM
* **Authentication**: JSON Web Tokens (JWT) & BcryptJS password hashing
* **Scheduler**: `node-cron` (Automated nightly and hourly showtime generation)
* **Services**:
  * **Email**: Brevo API / SMTP (OTP generation and ticket confirmation)
  * **SMS**: Twilio (OTP verification, falls back to Demo Mode locally)
  * **Images**: Cloudinary (Avatar uploads)
---
## 🚀 Key Features
* **🔐 Dual Authentication Flow**: Secure sign-up/login using email and password, or phone numbers with OTP verification. Supports OAuth registration hooks.
* **🛰 Location-Based Showtimes**: Automatically detects user location (via browser Geolocation API) or allows manual city selection, filtering theaters and shows by proximity.
* **💺 Real-time Atomic Seat Map**: Interactive theater seating grid with distinct tiers (Silver, Gold, Platinum). Uses temporary seat locking (10-minute hold) to avoid conflicts and race conditions.
* **💳 Wallet & Payment Engine**: Seamless payment flow supporting digital cards, UPI mocks, and a local CineBook digital wallet. Automatic refund processing upon booking cancellation.
* **📅 Dynamic Show Scheduler**: Background cron scheduler that automates showtime generation for the next 7 days across 117 theaters in 39 cities.
* **🎟 PDF Ticket Generator**: Dynamic booking confirmations with downloadable PDF tickets and unique, scannable QR codes for verification.
* **🛡 Administrative Control Center**: Unified dashboard to manage movies, view database metrics, track theater revenue, delete shows, monitor active bookings, and verify tickets.
---
## 📁 File Structure
```
Cinebook/
├── client/                      # Next.js App Router Frontend
│   ├── public/                  # Static assets and icons
│   ├── src/
│   │   ├── app/                 # Routing pages (App directory)
│   │   │   ├── admin/           # Admin pages (dashboard, users, bookings)
│   │   │   ├── auth/            # Auth pages (login, register, forgot-password)
│   │   │   ├── booking/         # Movie seat map and payment flows
│   │   │   ├── movies/          # Movie detail and showtimes listings
│   │   │   ├── profile/         # User dashboard (wallet, transactions, bookings)
│   │   │   └── page.tsx         # Customer home page (Movie lists)
│   │   ├── components/          # Reusable layouts and components (Navbar, cards)
│   │   ├── context/             # React Context providers (Auth, Location)
│   │   └── lib/                 # Core API Client endpoints
│   ├── tsconfig.json
│   └── package.json
│
└── server/                      # Express Backend REST API
    ├── src/
    │   ├── config/              # MongoDB connection configurations
    │   ├── controllers/         # Business logic handlers
    │   ├── middleware/          # Security, authorization, and validation rules
    │   ├── models/              # Mongoose DB Schemas (User, Movie, Theater, Show, Booking)
    │   ├── routes/              # Express endpoint routers
    │   └── services/            # City seeder, Places APIs, and Scheduler
    ├── test_suite.js            # Automated test suite (120 test cases)
    ├── make_admin.js            # User role promotion helper
    └── package.json
```
---
## 🔗 Key API Endpoints
### 🔐 Authentication & Profile (`/api/auth`)
* `POST /auth/register` — Register a new account
* `POST /auth/verify-register-otp` — Verify registration OTP
* `POST /auth/login` — Login with username/email or phone number
* `POST /auth/send-otp` — Request phone login OTP
* `POST /auth/verify-otp` — Verify phone login OTP
* `GET /auth/me` — Fetch currently authenticated user session
* `PUT /auth/update-password` — Change account password
### 🎬 Movies (`/api/movies`)
* `GET /movies` — Retrieve all movies (filters: status, genre, search, sortBy)
* `GET /movies/:id` — Get specific movie details
* `POST /movies` — Create a movie *(Admin only)*
* `PUT /movies/:id` — Update movie details *(Admin only)*
* `DELETE /movies/:id` — Delete movie *(Admin only)*
### 🕒 Shows & Theaters (`/api/shows` & `/api/theaters`)
* `GET /movies/:movieId/shows?date=...` — Get showtimes for a movie by date/city
* `GET /shows/:id` — Get show details and active seat layouts
* `GET /shows/theater/:theaterId` — Get all shows scheduled at a specific theater
* `POST /theaters/ensure-city` — Instantly provision fallback theaters for a city
### 🎟 Bookings (`/api/bookings`)
* `POST /bookings/lock` — Acquire temporary 10-minute lock on selected seats
* `POST /bookings/unlock` — Release held locks on seats
* `POST /bookings` — Create a new confirmed booking & issue payment receipt
* `GET /bookings/my` — List booking history for logged-in user
* `PUT /bookings/:id/cancel` — Cancel booking (eligible within a 10-minute window)
* `GET /bookings/verify/:bookingId` — Scan and validate booking ticket details
### 💳 Wallet (`/api/wallet`)
* `GET /wallet` — Retrieve wallet balance and credit/debit transaction log
* `POST /wallet/topup` — Top-up wallet balance (UPI/Card mock validation)
---
## 🚀 Running Locally
### Prerequisites
* **Node.js** (v18+)
* **MongoDB** (Local instance or remote Atlas connection string)
### 1. Configure the Backend
Navigate to `server/`, create a `.env` file, and fill in local values:
```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/cinebook
JWT_SECRET=super_secret_jwt_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3002
ADMIN_PASSWORD=admin123
```
### 2. Seeding & Database setup
Install dependencies, populate database, and create the admin user:
```bash
cd server
npm install
node src/seed.js        # Seed initial movies, theaters, and shows
node make_admin.js      # Register/Promote admin user
node start              # Launches server (re-runs daily scheduler)
```
### 3. Configure the Frontend
Navigate to `client/`, create a `.env.local` file:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3002
```
### 4. Run the Client App
```bash
cd client
npm install
npm run dev
```
Open [http://localhost:3002](http://localhost:3002) in your browser.
---
## 🔒 Default Administrator Access
To log into the administrator dashboard, navigate to **Profile → Admin Panel** or select it from the navigation links and use the credentials below:
* **Admin Login**: `admin@cinebook.com`
* **Admin Password**: `admin123`
# Cinebook
