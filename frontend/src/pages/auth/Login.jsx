import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Scale, Loader2, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Animation trigger
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      if (user.role === 'client') {
        navigate('/client/dashboard');
      } else if (user.role === 'advocate') {
        navigate('/advocate/dashboard');
      } else if (user.role === 'platform_manager') {
        navigate('/manager/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden flex items-center justify-center relative">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(at_top_right,#3b82f6_0%,transparent_50%)] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(at_bottom_left,#6366f1_0%,transparent_60%)] opacity-20" />

      {/* Floating Orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <div className={`relative z-10 w-full max-w-md px-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Logo & Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-3xl shadow-2xl shadow-blue-500/30 animate-float">
              <Scale className="w-12 h-12 text-white" />
            </div>
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl -z-10 scale-110" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-5xl font-bold tracking-tighter text-white">LFCAS</h1>
            <p className="text-zinc-400 text-sm mt-1 tracking-widest">LEGAL FAMILY CASE ADVISOR</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-white">Welcome Back</h2>
            <p className="text-zinc-400 mt-2">Sign in to continue your legal journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm" data-testid="login-error">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-700 focus:border-blue-500 h-14 text-lg placeholder:text-zinc-500 transition-all"
                  data-testid="login-email-input"
                />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-700 focus:border-blue-500 h-14 text-lg placeholder:text-zinc-500 pr-12 transition-all"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-blue-500/30 rounded-2xl"
              data-testid="login-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Signing you in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <span className="text-zinc-400 text-sm">Don't have an account? </span>
            <Link 
              to="/register" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              data-testid="register-link"
            >
              Create one now →
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-zinc-500 text-xs mt-8">
          Secure login • End-to-end encrypted
        </p>
      </div>

      {/* Add this to your global CSS or Tailwind config for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;