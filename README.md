# 📡 SignalScope

**SignalScope** is a secure, full-stack Network Coverage & Signal Quality Dashboard that enables users to visualize cellular tower locations, submit signal strength reports, and analyze network coverage data through an interactive map interface.

![SignalScope Dashboard](https://img.shields.io/badge/Status-Active-success) ![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688) ![React](https://img.shields.io/badge/React-19.0.0-61DAFB) ![MongoDB](https://img.shields.io/badge/MongoDB-Latest-47A248)

## ✨ Features

### 🔐 Authentication
- **JWT-based authentication** with secure token management
- User registration and login
- Protected routes for authenticated users
- Automatic token refresh and session management

### 🗺️ Interactive Dashboard
- **Interactive map** displaying cellular towers and signal reports
- Real-time signal strength visualization
- Coverage heatmap with color-coded signal quality zones
- Tower location markers with detailed information
- User-submitted signal reports with location data

### 📊 Analytics & Reporting
- Signal strength analytics with charts and graphs
- Coverage analysis by carrier (T-Mobile, Verizon, AT&T)
- Historical signal report tracking
- Statistical insights and trends

### 🛡️ Security
- Bcrypt password hashing with 72-byte limit handling
- Secure JWT token generation and validation
- CORS protection and middleware
- Input validation with Pydantic schemas

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Hook Form** for form management
- **Lucide React** for icons

### Backend
- **FastAPI** - Modern, fast Python web framework
- **MongoDB** with **Motor** - Async MongoDB driver
- **Pydantic** - Data validation and settings
- **JWT** (python-jose) - Authentication tokens
- **Passlib** with **bcrypt** - Password hashing
- **Uvicorn** - ASGI server

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn
- **Python** 3.11+
- **MongoDB** (local or Atlas connection string)

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Frontend runs on **http://localhost:5173**

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/signalscope?retryWrites=true&w=majority
   DATABASE_NAME=signalscope
   SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   ```

   **For local MongoDB:**
   ```env
   DATABASE_URL=mongodb://localhost:27017
   DATABASE_NAME=signalscope
   SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   ```

5. **Seed database (optional)**
   ```bash
   python seed_towers.py
   ```

6. **Start backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. Backend API runs on **http://localhost:8000**

8. **API Documentation**: http://localhost:8000/docs

## 📁 Project Structure

```
SignalScope/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application & routes
│   │   ├── config.py            # Configuration & settings
│   │   ├── database.py          # MongoDB connection
│   │   ├── models.py            # Data models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   └── utils.py         # JWT & password utilities
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── haversine.py     # Distance calculations
│   ├── requirements.txt
│   ├── seed_towers.py           # Database seeding script
│   └── .env                     # Environment variables
├── src/
│   ├── components/
│   │   └── generated/
│   │       ├── AuthContext.tsx      # Auth state management
│   │       ├── LoginPage.tsx        # Login component
│   │       ├── RegisterPage.tsx     # Registration component
│   │       ├── ProtectedRoute.tsx   # Route protection
│   │       └── SignalScopeDashboard.tsx  # Main dashboard
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }
  ```

- `POST /auth/login` - Login and get JWT token
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePass123!"
  }
  ```

### Towers
- `GET /api/towers` - Get all towers (with optional query params)
  - Query params: `operator`, `tech`, `lat`, `lng`, `radius`
- `GET /api/towers/{tower_id}` - Get specific tower by ID

### Reports
- `POST /api/reports` - Submit signal report (Protected)
  ```json
  {
    "lat": 40.7128,
    "lng": -74.0060,
    "carrier": "T-Mobile",
    "signalStrength": -85,
    "device": "iPhone 14 Pro"
  }
  ```
- `GET /api/reports` - Get all user reports (Protected)

### Coverage
- `GET /api/coverage` - Get coverage heatmap data
- `GET /api/coverage/estimate?lat={lat}&lng={lng}` - Estimate signal at coordinates

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- `DATABASE_URL` - MongoDB connection string
- `DATABASE_NAME` - MongoDB database name (default: `signalscope`)
- `SECRET_KEY` - JWT secret key (use a strong random string)
- `ALGORITHM` - JWT algorithm (default: `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time (default: `10080` = 7 days)

#### Frontend
- The frontend automatically connects to `http://localhost:8000` for API calls
- Update `API_BASE` in `src/components/generated/AuthContext.tsx` if backend runs on different port

## 🎯 Usage

1. **Start both frontend and backend servers**
2. **Open** http://localhost:5173 in your browser
3. **Register** a new account or **login** with existing credentials
4. **Explore** the interactive map with tower locations
5. **Submit** signal reports from your location
6. **View** analytics and coverage data

## 🔒 Security Features

- ✅ Password hashing with bcrypt (72-byte limit handled)
- ✅ JWT token-based authentication
- ✅ Protected API endpoints with token validation
- ✅ CORS middleware configured
- ✅ Input validation with Pydantic
- ✅ Secure password requirements (min 8 characters)

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Error**
- Verify your `DATABASE_URL` in `.env` is correct
- Ensure MongoDB is running (local) or connection string is valid (Atlas)

**bcrypt Password Error**
- The project uses bcrypt <4.0.0 for compatibility with passlib 1.7.4
- Passwords are automatically truncated to 72 bytes if needed

**CORS Errors**
- Verify backend CORS origins include your frontend URL
- Check that `http://localhost:5173` is in allowed origins

### Frontend Issues

**API Connection Failed**
- Ensure backend is running on port 8000
- Check `API_BASE` in `AuthContext.tsx`
- Verify CORS is configured correctly

## 📝 Development

### Frontend Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Backend Development
```bash
uvicorn app.main:app --reload    # Start with auto-reload
python seed_towers.py            # Seed database
```

## 🚀 Deployment

SignalScope is ready for production deployment!

### Frontend Deployment (Vercel)

1. **Push to GitHub** (if not already done)
2. **Go to [vercel.com](https://vercel.com)** → Import Project
3. **Select your repository**
4. **Set Environment Variable**: `VITE_API_URL` = Your backend URL
5. **Deploy!**

See **[VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)** for detailed instructions.

### Backend Deployment

Deploy your FastAPI backend to:
- **Railway** (Recommended - Easiest)
- **Render** (Free tier available)
- **Fly.io** (Great for Python apps)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment guide.

### Quick Deploy Checklist

- [ ] Backend deployed (Railway/Render)
- [ ] Frontend deployed (Vercel)
- [ ] Environment variables set
- [ ] CORS configured for production
- [ ] MongoDB Atlas connection string updated
- [ ] Test registration/login flow

### Environment Variables

**Frontend (Vercel):**
- `VITE_API_URL` - Your backend API URL

**Backend (Railway/Render):**
- `DATABASE_URL` - MongoDB Atlas connection string
- `DATABASE_NAME` - Database name (signalscope)
- `SECRET_KEY` - JWT secret key
- `ENVIRONMENT` - Set to `production`
- `CORS_ORIGINS` - Frontend URL (optional, auto-handles Vercel)

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. Contributions are welcome through internal channels.

---

**Built with ❤️ using FastAPI, React, and MongoDB**
