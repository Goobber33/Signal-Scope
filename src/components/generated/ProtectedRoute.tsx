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
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-950" data-magicpath-id="0" data-magicpath-path="ProtectedRoute.tsx">
        <div className="text-center" data-magicpath-id="1" data-magicpath-path="ProtectedRoute.tsx">
          <Loader2 size={48} className="animate-spin text-pink-600 mx-auto mb-4" data-magicpath-id="2" data-magicpath-path="ProtectedRoute.tsx" />
          <p className="text-gray-400" data-magicpath-id="3" data-magicpath-path="ProtectedRoute.tsx">Loading...</p>
        </div>
      </div>;
  }
  if (!user) {
    return null; // Will be handled by App.tsx to show login
  }
  return <>{children}</>;
};