import { useMemo, useState } from 'react';
import { Container, Theme } from './settings/types';
import { AuthProvider, useAuth } from './components/generated/AuthContext';
import { LoginPage } from './components/generated/LoginPage';
import { RegisterPage } from './components/generated/RegisterPage';
import { ProtectedRoute } from './components/generated/ProtectedRoute';
import { SignalScopeDashboard } from './components/generated/SignalScopeDashboard';
import { LandingPage } from './components/generated/LandingPage';

let theme: Theme = 'dark';
// only use 'centered' container for standalone components, never for full page apps or websites.
let container: Container = 'none';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  const generatedComponent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading SignalScope...</p>
          </div>
        </div>
      );
    }

    // Show landing page if user is not logged in and landing page should be shown
    if (!user && showLanding) {
      return (
        <LandingPage onGetStarted={() => setShowLanding(false)} />
      );
    }

    // Show login/register if user is not logged in and landing page is dismissed
    if (!user && !showLanding) {
      return showRegister ? (
        <RegisterPage 
          onSwitchToLogin={() => setShowRegister(false)} 
          onReturnToLanding={() => setShowLanding(true)}
        />
      ) : (
        <LoginPage 
          onSwitchToRegister={() => setShowRegister(true)} 
          onReturnToLanding={() => setShowLanding(true)}
        />
      );
    }

    // Show dashboard if user is logged in
    return (
      <ProtectedRoute>
        <SignalScopeDashboard />
      </ProtectedRoute>
    );
  }, [user, isLoading, showRegister, showLanding]);

  if (container === 'centered') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        {generatedComponent}
      </div>
    );
  } else {
    return generatedComponent;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;