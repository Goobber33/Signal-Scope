# 📡 SignalScope Frontend

**SignalScope** is a modern, interactive Network Coverage & Signal Quality Dashboard built with React and TypeScript. Visualize cellular tower locations, submit signal strength reports, and analyze network coverage data through an interactive map interface.

![SignalScope Dashboard](https://img.shields.io/badge/Status-Active-success) ![React](https://img.shields.io/badge/React-19.0.0-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Vite](https://img.shields.io/badge/Vite-Latest-646CFF)

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

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Hook Form** for form management
- **Lucide React** for icons
- **dnd-kit** for drag-and-drop functionality

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn

### Frontend Setup

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
   
   Update this with your backend API URL for production.

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Frontend runs on **http://localhost:5173**

## 📁 Project Structure

```
SignalScope/
├── src/
│   ├── components/
│   │   ├── generated/
│   │   │   ├── AuthContext.tsx          # Auth state management
│   │   │   ├── LoginPage.tsx            # Login component
│   │   │   ├── RegisterPage.tsx         # Registration component
│   │   │   ├── ProtectedRoute.tsx       # Route protection
│   │   │   ├── SignalScopeDashboard.tsx # Main dashboard
│   │   │   └── LandingPage.tsx          # Landing page
│   ├── dnd-kit/                         # Drag-and-drop components
│   ├── hooks/                           # Custom React hooks
│   ├── lib/                             # Utility functions
│   ├── settings/                        # Theme and type definitions
│   ├── App.tsx                          # Main app component
│   └── main.tsx                         # Entry point
├── public/                              # Static assets
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:8000`)

The frontend automatically connects to the backend API specified in `VITE_API_URL` for all API calls.

## 🎯 Usage

1. **Start the frontend server**
   ```bash
   npm run dev
   ```

2. **Open** http://localhost:5173 in your browser

3. **Register** a new account or **login** with existing credentials

4. **Explore** the interactive map with tower locations

5. **Submit** signal reports from your location

6. **View** analytics and coverage data

## 🚀 Deployment

SignalScope Frontend is ready for production deployment!

### Frontend Deployment (Vercel)

1. **Push to GitHub** (if not already done)
2. **Go to [vercel.com](https://vercel.com)** → Import Project
3. **Select your repository**
4. **Set Environment Variable**: `VITE_API_URL` = Your backend URL
5. **Deploy!**

The frontend will automatically use the `VITE_API_URL` environment variable for API calls.

### Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist/` directory.

## 🐛 Troubleshooting

### Frontend Issues

**API Connection Failed**
- Ensure backend is running and accessible
- Check `VITE_API_URL` environment variable
- Verify CORS is configured correctly on the backend
- Check browser console for detailed error messages

**Build Errors**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (requires 18+)
- Verify all environment variables are set correctly

## 📝 Development

### Frontend Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. Contributions are welcome through internal channels.

---

**Built with ❤️ using React, TypeScript, and Vite**
