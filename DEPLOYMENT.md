# SignalScope Deployment Guide

This guide will help you deploy SignalScope to production.

## Overview

SignalScope consists of two parts:
1. **Frontend** (React + Vite) - Deploy to Vercel ✅
2. **Backend** (FastAPI + Python) - Deploy to Railway/Render/Fly.io ⚠️
3. **Database** (MongoDB) - Already using MongoDB Atlas ✅

## Option 1: Full Vercel Deployment (Recommended for Quick Start)

### Frontend on Vercel

1. **Install Vercel CLI** (optional, but recommended):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from project root**:
   ```bash
   vercel
   ```

3. **Or connect to Vercel Dashboard**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite and configure it

4. **Set Environment Variables in Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.com`
   - Redeploy after adding environment variables

### Backend Deployment Options

#### Option A: Railway (Recommended)
Railway is excellent for Python/FastAPI apps:

1. **Sign up** at [railway.app](https://railway.app)
2. **Create a new project** from GitHub
3. **Select the `backend` folder** as the root
4. **Set Environment Variables**:
   ```
   DATABASE_URL=your_mongodb_atlas_connection_string
   DATABASE_NAME=signalscope
   SECRET_KEY=your_secret_key_here
   ```
5. **Railway will auto-detect Python** and install dependencies
6. **Set Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### Option B: Render
1. **Sign up** at [render.com](https://render.com)
2. **Create a new Web Service**
3. **Connect your GitHub repo**
4. **Configure**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Set Environment Variables** (same as Railway)

#### Option C: Fly.io
1. **Install Fly CLI**: `curl -L https://fly.io/install.sh | sh`
2. **In the `backend` directory**:
   ```bash
   fly launch
   ```
3. **Follow the prompts** and set environment variables

### After Backend Deployment

1. **Update Frontend Environment Variable**:
   - Go to Vercel Dashboard → Environment Variables
   - Update `VITE_API_URL` to your deployed backend URL
   - Redeploy the frontend

2. **Test the Deployment**:
   - Visit your Vercel frontend URL
   - Try registering/logging in
   - Check that API calls work

## Option 2: Manual Vercel Deployment

### Step 1: Build the Frontend

```bash
npm run build
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel

# For production deployment
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard:
- Go to your project
- Settings → Environment Variables
- Add:
  - `VITE_API_URL` = Your backend API URL

## Environment Variables

### Frontend (Vercel)
- `VITE_API_URL` - Your backend API URL (e.g., `https://api.signalscope.com`)

### Backend (Railway/Render/Fly.io)
- `DATABASE_URL` - MongoDB Atlas connection string
- `DATABASE_NAME` - Database name (usually `signalscope`)
- `SECRET_KEY` - JWT secret key (generate a secure random string)

## CORS Configuration

Make sure your backend `CORS` settings allow your Vercel frontend URL:

In `backend/app/main.py`, ensure:
```python
allow_origins=[
    "http://localhost:5173",
    "https://your-frontend.vercel.app",  # Add your Vercel URL
    "https://*.vercel.app"  # Or allow all Vercel deployments
]
```

## Testing Production Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend**: Test API endpoints:
   ```bash
   curl https://your-backend-url.com/health
   ```
3. **Full Flow**: Try registering a new user and logging in

## Troubleshooting

### Frontend Issues
- **API calls failing**: Check `VITE_API_URL` environment variable
- **Build errors**: Check Vercel build logs
- **404 errors**: Ensure `vercel.json` rewrites are configured

### Backend Issues
- **Connection errors**: Verify MongoDB Atlas connection string
- **CORS errors**: Update `allow_origins` in `backend/app/main.py`
- **Port issues**: Use `$PORT` environment variable (Railway/Render provide this)

### Common Fixes

1. **CORS errors**: Add your Vercel URL to backend CORS origins
2. **Environment variables not working**: Make sure variables start with `VITE_` for frontend
3. **Build fails**: Check Node.js version in Vercel (should be 18+)

## Quick Deploy Commands

```bash
# Frontend (from project root)
vercel --prod

# Backend (if using Railway, connected via GitHub)
# Just push to GitHub and Railway auto-deploys

# Update environment variables
# Use Vercel/Railway dashboards
```

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in both frontend and backend
- [ ] CORS configured to allow frontend URL
- [ ] MongoDB Atlas connection string updated
- [ ] Test registration/login flow
- [ ] Test API endpoints
- [ ] Verify HTTPS is working

## Support

For issues:
1. Check Vercel deployment logs
2. Check backend deployment logs
3. Verify environment variables are set correctly
4. Test API endpoints independently

