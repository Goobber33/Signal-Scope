# ⚡ SignalScope - Quick Start Guide

## 🎯 What You Have

A complete, secure full-stack **Network Coverage Dashboard** with:
- ✅ JWT Authentication
- ✅ Login & Registration
- ✅ Protected Routes
- ✅ PostgreSQL Database
- ✅ FastAPI Backend
- ✅ React Frontend

---

## 🚀 30-Second Setup

### 1. Frontend (Already Done!)
```bash
npm install
npm run dev
```
✅ Frontend ready at: **http://localhost:5173**

### 2. Backend (5 Minutes)

#### Step 1: Create Backend Folder
```bash
mkdir backend
cd backend
```

#### Step 2: Install Python Dependencies
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic pydantic-settings python-jose passlib python-multipart email-validator bcrypt cryptography
```

#### Step 3: Setup PostgreSQL
```bash
# Create database
psql -U postgres
CREATE DATABASE signalscope;
\q
```

#### Step 4: Copy Backend Code
**See PROJECT-SETUP.md** for complete backend code structure.

Create these files with the provided code:
- `app/main.py` (Main API file)
- `app/config.py` (Settings)
- `app/database.py` (DB connection)
- `app/models.py` (Database models)
- `app/schemas.py` (Pydantic schemas)
- `app/auth/utils.py` (JWT utilities)
- `app/utils/haversine.py` (Distance calculations)
- `seed_towers.py` (Seed script)
- `.env` (Environment variables)

#### Step 5: Configure Environment
Create `.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/signalscope
SECRET_KEY=your-super-secret-random-key-here
```

#### Step 6: Seed Database & Run
```bash
python seed_towers.py
uvicorn app.main:app --reload --port 8000
```
✅ Backend ready at: **http://localhost:8000**

---

## 🎉 You're Done!

1. **Open**: http://localhost:5173
2. **Register**: Create your account
3. **Login**: Access the dashboard
4. **Explore**: Submit reports, view analytics

---

## 🔍 What's Working

### Authentication ✅
- Secure JWT tokens
- Password hashing (bcrypt)
- Protected routes
- Auto login on register

### Dashboard ✅
- Interactive map placeholder
- Tower list with filters
- Signal reports submission
- Real-time analytics charts
- User profile display
- Logout functionality

### Backend API ✅
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /api/towers` - Get tower data
- `POST /api/reports` - Submit reports (protected)
- `GET /api/reports` - Get all reports
- `GET /api/analytics` - Dashboard stats
- `GET /docs` - Interactive API docs

---

## 📚 Quick Reference

### Test Credentials (After Registration)
```
Email: test@example.com
Password: TestPass123
```

### API Documentation
http://localhost:8000/docs

### Database Tables
- `users` - User accounts
- `towers` - Cell tower locations
- `reports` - User signal reports

### Environment Variables
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/signalscope
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

---

## 🐛 Troubleshooting

### Frontend Won't Start
```bash
npm install
npm run dev
```

### Backend Error: "Module not found"
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
brew services start postgresql  # Mac
sudo service postgresql start   # Linux

# Verify database exists
psql -U postgres -l
```

### CORS Error
- Backend must be on port 8000
- Frontend must be on port 5173 or 3000
- Check CORS settings in `app/main.py`

### "Email already registered"
- User already exists
- Try different email or check database

---

## 🎨 Customization

### Change Colors
Edit magenta accent to your brand:
```typescript
// In components, change:
from-pink-600 to-purple-600
// To:
from-blue-600 to-cyan-600
```

### Add More Carriers
```python
# In backend/app/main.py
CARRIERS = ["T-Mobile", "Verizon", "AT&T", "Sprint", "US Cellular"]
```

### Modify Token Expiry
```env
# In .env
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days
```

---

## 📖 Full Documentation

For complete setup instructions, see:
- **PROJECT-SETUP.md** - Complete backend code & detailed instructions
- **backend-setup.md** - Deployment guide
- **backend-instructions.json** - API reference

---

## 🚀 Next Steps

1. ✅ **Test Login/Register** - Create account and login
2. ✅ **Submit Report** - Add a signal quality report
3. ✅ **View Analytics** - Check dashboard charts
4. 🔄 **Integrate Real Map** - Add Mapbox or Leaflet
5. 🔄 **Deploy** - Push to production (Vercel + Railway)

---

## 💡 Pro Tips

1. **Use API Docs**: http://localhost:8000/docs for testing
2. **Check Console**: Open DevTools for debugging
3. **Test Auth**: Use /auth/login endpoint directly
4. **Seed Data**: Run `seed_towers.py` for mock tower data
5. **JWT Token**: Stored in localStorage as `signalscope_token`

---

## 🎯 What Makes This Special

✅ **Production-Ready Authentication** - Not just a demo  
✅ **Real Database** - PostgreSQL with proper schema  
✅ **Secure** - Password hashing, JWT, protected routes  
✅ **Modern UI** - Beautiful design with Tailwind  
✅ **Type-Safe** - TypeScript + Pydantic validation  
✅ **Scalable** - FastAPI + SQLAlchemy architecture  

---

**🎉 Happy Building with SignalScope!**
