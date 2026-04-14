import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Scale, Loader2, Eye, EyeOff, User, Mail, Phone } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'client',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden flex items-center justify-center relative">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(at_top_right,#3b82f6_0%,transparent_50%)] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(at_bottom_left,#a855f7_0%,transparent_60%)] opacity-20" />

      {/* Floating Decorative Elements */}
      <div className="absolute top-32 left-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className={`relative z-10 w-full max-w-lg px-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-3xl shadow-2xl shadow-blue-500/40 animate-float">
              <Scale className="w-14 h-14 text-white" />
            </div>
            <div className="absolute inset-0 bg-blue-400/20 rounded-3xl blur-2xl -z-10 scale-125" />
          </div>

          <h1 className="text-5xl font-bold tracking-tighter text-white">Join LFCAS</h1>
          <p className="text-zinc-400 mt-2 text-center max-w-sm">
            Create your account and get AI-powered legal support
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/60 rounded-3xl p-10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-3.5 rounded-2xl text-sm" data-testid="register-error">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl text-sm" data-testid="register-success">
                Account created successfully! Redirecting to login...
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-zinc-300 flex items-center gap-2">
                <User className="w-4 h-4" /> Full Name
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                required
                className="bg-zinc-950 border-zinc-700 h-14 text-lg focus:border-blue-500 transition-all"
                data-testid="register-name-input"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                className="bg-zinc-950 border-zinc-700 h-14 text-lg focus:border-blue-500 transition-all"
                data-testid="register-email-input"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-300 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="bg-zinc-950 border-zinc-700 h-14 text-lg focus:border-blue-500 transition-all"
                data-testid="register-phone-input"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-950 border-zinc-700 h-14 text-lg pr-12 focus:border-blue-500 transition-all"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-zinc-500">Minimum 6 characters</p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-zinc-300">I am registering as a</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-700 h-14 text-lg focus:ring-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="client" className="text-lg py-3">
                    Client – Seeking Legal Help
                  </SelectItem>
                  <SelectItem value="advocate" className="text-lg py-3">
                    Advocate – Legal Professional
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 rounded-2xl shadow-lg shadow-blue-500/30 mt-4"
              data-testid="register-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <span className="text-zinc-400">Already have an account? </span>
            <Link 
              to="/login" 
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              data-testid="login-link"
            >
              Sign in here
            </Link>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-xs mt-8">
          Your data is secure • End-to-end encrypted platform
        </p>
      </div>

      {/* Floating Animation Keyframes */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Register;