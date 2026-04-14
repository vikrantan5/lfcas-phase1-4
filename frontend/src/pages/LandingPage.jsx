import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Scale, Shield, Users, MessageSquare, FileText, TrendingUp, 
  CheckCircle, ArrowRight, Briefcase, Calendar, UserCheck, Award 
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate stats on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShowStats(true);
      },
      { threshold: 0.5 }
    );

    const statsSection = document.getElementById('stats-section');
    if (statsSection) observer.observe(statsSection);

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Scale className="w-10 h-10 text-blue-600" />,
      title: "AI-Powered Legal Analysis",
      description: "Instant insights with relevant legal sections, precedents, and document checklists tailored to your case."
    },
    {
      icon: <Users className="w-10 h-10 text-blue-600" />,
      title: "Smart Advocate Matching",
      description: "Get matched with top-rated family law advocates based on your case type, location & budget."
    },
    {
      icon: <Calendar className="w-10 h-10 text-blue-600" />,
      title: "Seamless Meeting System",
      description: "Request & schedule confidential consultations before committing to any advocate."
    },
    {
      icon: <MessageSquare className="w-10 h-10 text-blue-600" />,
      title: "Secure Real-time Chat",
      description: "Communicate directly with your advocate through encrypted messaging."
    },
    {
      icon: <FileText className="w-10 h-10 text-blue-600" />,
      title: "Smart Document Vault",
      description: "Upload, organize, and securely share all your legal documents in one place."
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-blue-600" />,
      title: "Live Case Tracking",
      description: "Track every stage of your case with real-time updates and milestone notifications."
    }
  ];

  const howItWorks = [
    { step: "01", icon: <Scale className="w-8 h-8" />, title: "Describe Your Case", desc: "Tell us about your situation. Our AI analyzes it instantly." },
    { step: "02", icon: <UserCheck className="w-8 h-8" />, title: "Get Matched", desc: "Receive personalized advocate recommendations." },
    { step: "03", icon: <Calendar className="w-8 h-8" />, title: "Book a Meeting", desc: "Schedule a confidential consultation at your convenience." },
    { step: "04", icon: <Briefcase className="w-8 h-8" />, title: "Begin Your Journey", desc: "Start your case with full professional support." }
  ];

  const stats = [
    { number: "15k+", label: "Happy Clients" },
    { number: "450+", label: "Verified Advocates" },
    { number: "98%", label: "Success Rate" },
    { number: "24/7", label: "AI Support" }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden font-sans bg-zinc-950 text-white">
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/90 backdrop-blur-lg shadow-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tighter">LFCAS</h1>
              <p className="text-[10px] text-zinc-500 -mt-1">LEGAL FAMILY CASE ADVISOR</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              className="bg-white text-zinc-900 hover:bg-white/90 font-semibold"
              onClick={() => navigate('/register')}
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Modern & Interactive */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 bg-[radial-gradient(at_top_right,#3b82f6_0%,#1e2937_50%,#0a0a0a_100%)] overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full mb-8 border border-white/20">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">India's Most Trusted Family Law Platform</span>
          </div>

          <h1 className="text-7xl md:text-[5.5rem] leading-none font-bold tracking-tighter mb-6 bg-gradient-to-br from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            Family Law,<br />
            <span className="text-blue-400">Reimagined</span>
          </h1>

          <p className="text-2xl text-zinc-400 max-w-3xl mx-auto mb-12">
            AI-powered legal intelligence that connects you with the best family law advocates in India — securely, transparently, and confidently.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-2xl shadow-blue-500/30"
              onClick={() => navigate('/register')}
            >
              Start Your Case Now
              <ArrowRight className="ml-3 w-6 h-6" />
            </Button>

            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-7 rounded-2xl border-white/30 hover:bg-white/10"
              onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>

          {/* Trust Bar */}
          <div className="mt-20 flex flex-wrap justify-center gap-10 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> AI Legal Analysis
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Verified Advocates
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> 100% Confidential
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/70 rounded-full animate-scroll" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="py-20 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-5xl font-bold text-blue-400 mb-2">
                {showStats ? stat.number : '0'}
              </div>
              <p className="text-zinc-400 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold tracking-tighter mb-4">How LFCAS Works</h2>
            <p className="text-xl text-zinc-400">Four simple steps to justice and peace of mind</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="group relative">
                <Card className="bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all duration-500 h-full overflow-hidden group-hover:-translate-y-2">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-6xl font-bold text-zinc-800 group-hover:text-blue-900/30 transition-colors">
                        {item.step}
                      </div>
                      <div className="p-4 bg-zinc-800 rounded-2xl group-hover:bg-blue-950/50 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <CardTitle className="text-2xl mb-3">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold tracking-tighter mb-4">Powerful Features</h2>
            <p className="text-xl text-zinc-400">Built specifically for family law matters in India</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group bg-zinc-900 border border-zinc-800 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 p-8"
              >
                <div className="mb-8 transition-transform group-hover:scale-110 duration-500">
                  {feature.icon}
                </div>
                <CardTitle className="text-2xl mb-4 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-zinc-400 text-lg leading-relaxed">
                  {feature.description}
                </CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold tracking-tighter">Built for Both Sides</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Clients */}
            <Card className="bg-gradient-to-br from-blue-950 to-zinc-900 border-blue-800 p-10">
              <div className="flex items-center gap-4 mb-8">
                <Users className="w-12 h-12 text-blue-400" />
                <h3 className="text-4xl font-bold">For Clients</h3>
              </div>
              <ul className="space-y-6">
                {[
                  "Instant AI case evaluation in regional languages",
                  "Access to top family law specialists near you",
                  "Transparent pricing & meeting-first approach",
                  "Secure document vault with e-sign support",
                  "Real-time case status & hearing alerts"
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <span className="text-lg text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* For Advocates */}
            <Card className="bg-gradient-to-br from-purple-950 to-zinc-900 border-purple-800 p-10">
              <div className="flex items-center gap-4 mb-8">
                <Award className="w-12 h-12 text-purple-400" />
                <h3 className="text-4xl font-bold">For Advocates</h3>
              </div>
              <ul className="space-y-6">
                {[
                  "High-quality pre-screened client leads",
                  "Meeting-based case acceptance system",
                  "Automated case & hearing management",
                  "Professional profile with client ratings",
                  "Secure payment & document handling"
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
                    <span className="text-lg text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-6xl font-bold tracking-tighter mb-6">
            Ready to protect what matters most?
          </h2>
          <p className="text-2xl text-blue-100 mb-10">
            Join thousands of families who found clarity and expert help through LFCAS.
          </p>

          <Button 
            size="lg" 
            className="text-2xl px-16 py-8 rounded-3xl bg-white text-zinc-900 hover:bg-zinc-100 font-semibold shadow-2xl"
            onClick={() => navigate('/register')}
          >
            Create Your Free Account
          </Button>
          <p className="mt-6 text-blue-200">Takes less than 60 seconds • No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-16 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl">
                <Scale className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold tracking-tight">LFCAS</span>
            </div>

            <p className="text-zinc-500 text-sm">
              © 2026 LFCAS - Legal Family Case Advisor System. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;