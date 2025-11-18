import React from 'react';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';
interface ProtectedRouteProps {
  children: React.ReactNode;
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children
}) => {
  const {
    user,
    isLoading
  } = useAuth();
  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>;
  }
  if (!user) {
    return null; // Will be handled by App.tsx to show login
  }
  return <>{children}</>;
};