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
  const [currentBg, setCurrentBg] = useState(0);

  // Law & Advocate themed background images
  const bgImages = [
   "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070", // Courtroom
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=2070", // Advocate with client
    "https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2070", // Law books & justice
    "https://images.unsplash.com/photo-1618044733300-9472054094ee?q=80&w=2070", // Professional lawyer
    "https://images.unsplash.com/photo-1706988056350-d112eabb6835?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGNvdXJ0cm9vbXxlbnwwfHwwfHx8MA%3D%3D", // Legal meeting
  ];

  useEffect(() => {
    setIsVisible(true);

    // Background image change every 3 seconds with fade
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 3000);

    return () => clearInterval(interval);
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
    <div className="min-h-screen overflow-hidden flex items-center justify-center relative">
      {/* Sliding Background Images */}
      <div className="absolute inset-0 z-0">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              index === currentBg ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        {/* Dark Overlay for better text visibility */}
        <div className="absolute inset-0 bg-black/70 z-10" />
        
        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60 z-10" />
      </div>

      {/* Content Container */}
      <div className={`relative z-20 w-full max-w-md px-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Logo & Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 rounded-3xl shadow-2xl shadow-blue-500/30 animate-float">
              <Scale className="w-12 h-12 text-white" />
            </div>
            <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl -z-10 scale-110" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="text-5xl font-bold tracking-tighter text-white drop-shadow-md">LFCAS</h1>
            <p className="text-white/80 text-sm mt-1 tracking-widest">LEGAL FAMILY CASE ADVISOR</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-white">Welcome Back</h2>
            <p className="text-zinc-300 mt-2">Sign in to continue your legal journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">Email Address</Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                     className="bg-zinc-950/80 border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 h-14 text-lg text-white placeholder:text-zinc-400 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-200">Password</Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-950/80 border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 h-14 text-lg text-white placeholder:text-zinc-400 pr-12 transition-all"
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
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-xl shadow-blue-500/40 rounded-2xl"
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
            >
              Create one now →
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-white/60 text-xs mt-8 tracking-wide">
          Secure login • End-to-end encrypted
        </p>
      </div>

      {/* Floating Animation Style */}
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