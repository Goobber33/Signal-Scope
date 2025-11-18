import React, { useState } from 'react';
import { Signal, Mail, Lock, User, AlertCircle, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from './AuthContext';
interface RegisterPageProps {
  onSwitchToLogin: () => void;
}
export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSwitchToLogin
}) => {
  const {
    register
  } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordRequirements = [{
    text: 'At least 8 characters',
    met: password.length >= 8
  }, {
    text: 'Contains uppercase letter',
    met: /[A-Z]/.test(password)
  }, {
    text: 'Contains lowercase letter',
    met: /[a-z]/.test(password)
  }, {
    text: 'Contains number',
    met: /\d/.test(password)
  }];
  const isPasswordValid = passwordRequirements.every(req => req.met);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isPasswordValid) {
      setError('Please meet all password requirements');
      return;
    }
    setIsLoading(true);
    try {
      await register(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-pink-600/20">
              <Signal size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">Join SignalScope to track network coverage</p>
          </div>

          {/* Error Alert */}
          {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Requirements */}
              {password && <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Password requirements:</p>
                  <div className="space-y-1.5">
                    {passwordRequirements.map((req, index) => <div key={index} className="flex items-center gap-2 text-xs">
                        <div className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors ${req.met ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-600'}`}>
                          <Check size={12} />
                        </div>
                        <span className={req.met ? 'text-green-400' : 'text-gray-500'}>
                          {req.text}
                        </span>
                      </div>)}
                  </div>
                </div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent transition-all" />
              </div>
              {confirmPassword && password !== confirmPassword && <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Passwords do not match
                </p>}
            </div>

            <div className="flex items-start">
              <input type="checkbox" required className="mt-1 mr-2 w-4 h-4 rounded border-gray-700 bg-gray-800 text-pink-600 focus:ring-pink-600 focus:ring-offset-gray-900" />
              <label className="text-sm text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-pink-500 hover:text-pink-400 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-pink-500 hover:text-pink-400 transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button type="submit" disabled={isLoading || !isPasswordValid} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20">
              {isLoading ? <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating account...
                </> : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-500">Or sign up with</span>
            </div>
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button type="button" className="py-2.5 px-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button type="button" className="py-2.5 px-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.91 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.59-2.805 5.61-5.475 5.91.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-pink-500 hover:text-pink-400 font-medium transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>;
};