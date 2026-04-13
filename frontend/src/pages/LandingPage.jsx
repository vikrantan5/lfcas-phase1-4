import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Scale, Shield, Users, MessageSquare, FileText, TrendingUp, CheckCircle, Clock, Award, ArrowRight, Briefcase, Calendar, UserCheck } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Scale className="w-8 h-8 text-blue-600" />,
      title: "AI-Powered Legal Analysis",
      description: "Get instant AI-powered insights on your family law case with relevant legal sections and document requirements."
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Expert Advocate Matching",
      description: "Connect with verified advocates specialized in family law based on your case type and location."
    },
    {
      icon: <Calendar className="w-8 h-8 text-blue-600" />,
      title: "Meeting Request System",
      description: "Request consultations with advocates before committing to a case. Schedule meetings at your convenience."
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-blue-600" />,
      title: "Real-time Communication",
      description: "Stay connected with your advocate through secure, real-time messaging throughout your case."
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      title: "Document Management",
      description: "Securely upload and manage all case-related documents in one centralized location."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      title: "Case Progress Tracking",
      description: "Monitor your case progress through every stage from initiation to judgment."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      icon: <Scale className="w-6 h-6" />,
      title: "Describe Your Issue",
      description: "Share details about your family law matter and get AI-powered legal analysis."
    },
    {
      step: "2",
      icon: <UserCheck className="w-6 h-6" />,
      title: "Choose an Advocate",
      description: "Review recommended advocates and request a consultation meeting."
    },
    {
      step: "3",
      icon: <Calendar className="w-6 h-6" />,
      title: "Meet & Discuss",
      description: "Schedule and attend a meeting to discuss your case in detail."
    },
    {
      step: "4",
      icon: <Briefcase className="w-6 h-6" />,
      title: "Start Your Case",
      description: "Once the advocate accepts, your case officially begins with full support."
    }
  ];

  const benefits = {
    clients: [
      "AI-powered case analysis and guidance",
      "Access to verified family law advocates",
      "Transparent meeting request process",
      "Secure document storage and sharing",
      "Real-time case progress updates",
      "Direct communication with your advocate"
    ],
    advocates: [
      "Qualified client leads with AI pre-screening",
      "Meeting-first approach to case acceptance",
      "Streamlined case management tools",
      "Secure client communication platform",
      "Professional profile and rating system",
      "Automated hearing and deadline tracking"
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white" data-testid="landing-page">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">LFCAS</h1>
                <p className="text-xs text-gray-500">Legal Family Case Advisor</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                data-testid="header-login-button"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/register')}
                data-testid="header-register-button"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-2 bg-blue-100 rounded-full mb-6">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-600">Trusted Legal Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" data-testid="hero-title">
            Navigate Family Law
            <br />
            <span className="text-blue-600">With Confidence</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto" data-testid="hero-description">
            AI-powered legal guidance connecting you with expert family law advocates. 
            From divorce to child custody, get the support you need through every step.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/register')}
              data-testid="hero-cta-button"
            >
              Start Your Case
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate('/login')}
            >
              Login to Dashboard
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span>Verified Advocates</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span>Secure & Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple steps to get the legal help you need</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <Card className="border-2 hover:border-blue-500 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
                      <div className="text-blue-600">
                        {item.icon}
                      </div>
                    </div>
                    <div className="absolute top-4 left-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{item.step}</span>
                    </div>
                    <CardTitle className="text-center text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Comprehensive Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage your family law case</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`feature-card-${index}`}>
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Benefits for Everyone</h2>
            <p className="text-xl text-gray-600">Designed to serve both clients and advocates</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Clients */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <CardTitle className="text-2xl">For Clients</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {benefits.clients.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* For Advocates */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <div className="flex items-center space-x-3">
                  <Award className="w-8 h-8 text-purple-600" />
                  <CardTitle className="text-2xl">For Advocates</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {benefits.advocates.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands who trust LFCAS for their family law needs
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/register')}
              data-testid="cta-register-button"
            >
              Create Free Account
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 text-white border-white hover:bg-blue-500"
              onClick={() => navigate('/login')}
            >
              Login Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">LFCAS</span>
              </div>
              <p className="text-sm text-gray-400">
                Empowering families with AI-driven legal guidance and expert advocate connections.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">How It Works</a></li>
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Disclaimer</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 LFCAS - Legal Family Case Advisor System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
