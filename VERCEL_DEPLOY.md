# Quick Vercel Deployment Guide

## 🚀 Deploy Frontend to Vercel (2 minutes)

### Option 1: Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

3. **Click "Add New Project"**

4. **Import your repository** (`Signal-Scope`)

5. **Configure project**:
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `.` (root)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `dist` (auto-filled)
   - Install Command: `npm install`

6. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app` (or your backend URL)
   - Click "Add"

7. **Click "Deploy"**

8. **Wait for deployment** (~2-3 minutes)

9. **Done!** Your frontend is live at `https://your-project.vercel.app`

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: signalscope
# - Directory: ./
# - Override settings: No

# For production
vercel --prod
```

### Set Environment Variables (CLI)

```bash
vercel env add VITE_API_URL
# Enter your backend URL when prompted
```

---

## 🔧 Deploy Backend (Choose One)

### Railway (Easiest - Recommended)

1. **Sign up** at [railway.app](https://railway.app)

2. **New Project** → **Deploy from GitHub repo**

3. **Select your repo** → **Add Service** → **Select `backend` folder**

4. **Set Environment Variables** in Railway dashboard:
   ```
   DATABASE_URL=your_mongodb_atlas_connection_string
   DATABASE_NAME=signalscope
   SECRET_KEY=generate_a_random_string_here
   ENVIRONMENT=production
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

5. **Railway auto-detects Python** and deploys

6. **Copy your Railway URL** (e.g., `https://signalscope-production.up.railway.app`)

7. **Update frontend** environment variable in Vercel:
   - `VITE_API_URL` = Your Railway URL
   - Redeploy frontend

### Render (Alternative)

1. **Sign up** at [render.com](https://render.com)

2. **New** → **Web Service**

3. **Connect GitHub** → Select repo

4. **Configure**:
   - Name: `signalscope-backend`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. **Set Environment Variables**:
   ```
   DATABASE_URL=your_mongodb_atlas_connection_string
   DATABASE_NAME=signalscope
   SECRET_KEY=generate_a_random_string_here
   ENVIRONMENT=production
   ```

6. **Deploy** and copy your Render URL

---

## 📝 Environment Variables Checklist

### Frontend (Vercel Dashboard)
- ✅ `VITE_API_URL` = Your backend URL (e.g., `https://signalscope.railway.app`)

### Backend (Railway/Render Dashboard)
- ✅ `DATABASE_URL` = MongoDB Atlas connection string
- ✅ `DATABASE_NAME` = `signalscope`
- ✅ `SECRET_KEY` = Random secure string (generate one)
- ✅ `ENVIRONMENT` = `production`
- ✅ `CORS_ORIGINS` = Your Vercel frontend URL (optional, already handles Vercel pattern)

---

## ✅ Post-Deployment Checklist

1. **Test Frontend**: Visit your Vercel URL
2. **Test Backend**: Visit `https://your-backend-url.com/docs` (FastAPI docs)
3. **Test Registration**: Try creating an account
4. **Test Login**: Log in with your account
5. **Check CORS**: Make sure API calls work from frontend

---

## 🔄 Updating Deployment

### Frontend Updates
Just push to GitHub - Vercel auto-deploys:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

### Backend Updates
Railway/Render auto-deploys when you push to GitHub:
```bash
git add backend/
git commit -m "Update backend"
git push origin main
```

---

## 🐛 Troubleshooting

### CORS Errors
- Make sure backend has `ENVIRONMENT=production` set
- Check backend logs for CORS errors
- Verify frontend `VITE_API_URL` is correct

### API Connection Failed
- Verify `VITE_API_URL` is set in Vercel
- Check backend is running (visit backend URL)
- Check backend logs for errors

### Build Fails
- Check Node.js version (Vercel uses 18+ by default)
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

## 🎉 You're Live!

Your SignalScope app is now deployed and accessible worldwide!

Frontend: `https://your-project.vercel.app`
Backend: `https://your-backend.railway.app` (or Render URL)

