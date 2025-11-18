# SignalScope Backend Setup Guide

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt.py
│   │   └── utils.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── towers.py
│   │   ├── reports.py
│   │   ├── coverage.py
│   │   └── analytics.py
│   └── utils/
│       ├── __init__.py
│       ├── haversine.py
│       └── coverage.py
├── seed_data/
│   └── towers.json
├── requirements.txt
├── .env
└── README.md
```

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup PostgreSQL Database

```bash
# Create database
psql -U postgres
CREATE DATABASE signalscope;
\q
```

### 3. Configure Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/signalscope
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### 4. Run Database Migrations

```bash
# Initialize tables
python -m app.database
```

### 5. Seed Database with Tower Data

```bash
python seed_towers.py
```

### 6. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Towers
- `GET /api/towers` - Get all towers (with optional filters)
- `GET /api/towers/{tower_id}` - Get specific tower

### Coverage
- `GET /api/coverage` - Get coverage heatmap data
- `GET /api/coverage/estimate` - Estimate signal at coordinates

### Reports
- `POST /api/reports` - Submit signal report (Protected)
- `GET /api/reports` - Get all reports (Protected)
- `GET /api/reports/user` - Get user's reports (Protected)

### Analytics
- `GET /api/analytics` - Get dashboard analytics (Protected)
- `GET /api/analytics/by-zip` - Get signal data by ZIP code
- `GET /api/analytics/by-carrier` - Get data by carrier

## Testing the API

### Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123","name":"John Doe"}'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

### Get Towers
```bash
curl http://localhost:8000/api/towers
```

### Submit Report (Authenticated)
```bash
curl -X POST http://localhost:8000/api/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "lat": 40.7128,
    "lng": -74.0060,
    "carrier": "T-Mobile",
    "signal_strength": -65,
    "device": "iPhone 14 Pro"
  }'
```

## Frontend Integration

Update your frontend `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## Production Deployment

### Security Checklist
- [ ] Change SECRET_KEY to a strong random value
- [ ] Use HTTPS only
- [ ] Enable CORS with specific origins
- [ ] Set up proper database credentials
- [ ] Use environment variables for all sensitive data
- [ ] Enable rate limiting
- [ ] Set up logging and monitoring
- [ ] Use a production-grade database (not SQLite)

### Deploy to Heroku

```bash
# Install Heroku CLI
heroku create signalscope-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key

# Deploy
git push heroku main
```

### Deploy to Railway/Render

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

## Database Schema

### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### towers
```sql
CREATE TABLE towers (
    id VARCHAR(50) PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    operator VARCHAR(100) NOT NULL,
    height INTEGER NOT NULL,
    tech JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### reports
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    carrier VARCHAR(100) NOT NULL,
    signal_strength INTEGER NOT NULL,
    device VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Next Steps

1. Implement real map integration (Mapbox/Leaflet)
2. Add email verification
3. Implement password reset
4. Add more analytics endpoints
5. Set up Redis for caching
6. Implement rate limiting
7. Add API documentation with Swagger
8. Set up CI/CD pipeline
