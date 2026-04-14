import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI, aiAPI, advocateAPI, meetingRequestAPI, meetingAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Scale, Plus, FileText, Users, Bell, MessageSquare, Loader2, Briefcase, Clock, CheckCircle, Calendar, AlertCircle, UserCheck, X, Star, TrendingUp, Activity, ArrowRight, Menu, ChevronRight, Zap, Shield, Award, Sparkles, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cases, setCases] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  
  // AI Query State
  const [showAIQuery, setShowAIQuery] = useState(false);
  const [aiQueryData, setAIQueryData] = useState({
    case_type: '',
    description: '',
    location: ''
  });
  const [aiAnalyzing, setAIAnalyzing] = useState(false);
  const [aiResult, setAIResult] = useState(null);
  const [recommendedAdvocates, setRecommendedAdvocates] = useState([]);

  // Meeting Request State
  const [showMeetingRequest, setShowMeetingRequest] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [requestingMeeting, setRequestingMeeting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCases(),
        loadMeetingRequests(),
        loadMeetings()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async () => {
    try {
      const response = await caseAPI.list();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to load cases:', error);
    }
  };

  const loadMeetingRequests = async () => {
    try {
      const response = await meetingRequestAPI.list();
      setMeetingRequests(response.data);
    } catch (error) {
      console.error('Failed to load meeting requests:', error);
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await meetingAPI.list();
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
  };

  const handleAIAnalyze = async (e) => {
    e.preventDefault();
    setAIAnalyzing(true);
    
    try {
      const response = await aiAPI.analyze(aiQueryData);
      setAIResult(response.data.ai_analysis);
      setRecommendedAdvocates(response.data.recommended_advocates || []);
      
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your case. Review the results and select an advocate.",
      });
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.response?.data?.detail || "Failed to analyze your query. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAIAnalyzing(false);
    }
  };

  const handleRequestMeeting = async (advocate) => {
    setSelectedAdvocate(advocate);
    setShowMeetingRequest(true);
  };

  const submitMeetingRequest = async () => {
    if (!selectedAdvocate || !aiResult) return;
    
    setRequestingMeeting(true);
    
    try {
      await meetingRequestAPI.create({
        advocate_id: selectedAdvocate.id,
        case_type: aiQueryData.case_type,
        description: aiQueryData.description,
        location: aiQueryData.location,
        ai_analysis: aiResult
      });
      
      toast({
        title: "Meeting Request Sent",
        description: `Your meeting request has been sent to ${selectedAdvocate.user?.full_name}. You'll be notified when they respond.`,
      });
      
      setShowMeetingRequest(false);
      setShowAIQuery(false);
      setAIResult(null);
      setRecommendedAdvocates([]);
      loadMeetingRequests();
    } catch (error) {
      console.error('Meeting request failed:', error);
      toast({
        title: "Request Failed",
        description: error.response?.data?.detail || "Failed to send meeting request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequestingMeeting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      accepted: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      initiated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = [
    { label: 'Active Cases', value: cases.length, icon: Briefcase, color: 'from-blue-500 to-cyan-500', gradient: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20' },
    { label: 'Meeting Requests', value: meetingRequests.length, icon: Users, color: 'from-purple-500 to-pink-500', gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' },
    { label: 'Meetings', value: meetings.length, icon: Calendar, color: 'from-green-500 to-emerald-500', gradient: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' },
    { label: 'Pending Actions', value: meetingRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'from-orange-500 to-red-500', gradient: 'bg-gradient-to-br from-orange-500/20 to-red-500/20' },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-black' : 'bg-gradient-to-br from-gray-50 to-gray-100'} transition-all duration-300`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-gray-900/80 backdrop-blur-xl border-gray-800' : 'bg-white/80 backdrop-blur-xl border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl">
                  <Scale className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>LexConnect</h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Client Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
                className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              
              <Button variant="ghost" size="sm" className={`relative ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className={`text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{user?.email}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout} 
                  data-testid="logout-button"
                  className={`${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-100'}`}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Welcome back, {user?.full_name?.split(' ')[0]}!
              </h2>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Your legal journey matters. We're here to help you every step of the way.
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Assistance
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`relative group overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
              <div className={`absolute inset-0 ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{stat.label}</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                  </div>
                  <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-xl`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI-Powered Case Analysis Banner */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Need Legal Assistance?</h3>
                  <p className="text-white/90">Get AI-powered analysis and connect with top-rated advocates instantly</p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => setShowAIQuery(true)}
                data-testid="start-query-button"
                className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg group"
              >
                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Start New Query
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs with Premium Design */}
        <Tabs defaultValue="meeting-requests" className="space-y-6">
          <TabsList className={`inline-flex h-auto p-1 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-xl backdrop-blur-sm`}>
            <TabsTrigger 
              value="meeting-requests" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all duration-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Meeting Requests ({meetingRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="meetings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all duration-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Meetings ({meetings.length})
            </TabsTrigger>
            <TabsTrigger 
              value="cases"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all duration-300"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              My Cases ({cases.length})
            </TabsTrigger>
          </TabsList>

          {/* Meeting Requests Tab */}
          <TabsContent value="meeting-requests" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : meetingRequests.length === 0 ? (
              <div className={`rounded-2xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-12 text-center`}>
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No Meeting Requests Yet</h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Start by analyzing your legal query and requesting a meeting with an advocate</p>
                <Button onClick={() => setShowAIQuery(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Query
                </Button>
              </div>
            ) : (
              meetingRequests.map((request, index) => (
                <div 
                  key={request.id} 
                  className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800/50 hover:bg-gray-800/70' : 'bg-white hover:shadow-xl'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                            {formatCaseType(request.case_type)}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                          Meeting Request with {request.advocate?.user?.full_name || 'N/A'}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3 line-clamp-2`}>
                          {request.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className={`flex items-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(request.created_at)}
                          </div>
                          {request.preferred_date && (
                            <div className={`flex items-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              <Calendar className="w-4 h-4 mr-1" />
                              Preferred: {formatDate(request.preferred_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-400">Request Declined</p>
                          <p className="text-sm text-red-300/80">{request.rejection_reason}</p>
                        </div>
                      </div>
                    )}

                    {request.status === 'accepted' && (
                      <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-sm text-green-400">Advocate accepted your request. Awaiting meeting schedule.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : meetings.length === 0 ? (
              <div className={`rounded-2xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-12 text-center`}>
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No Meetings Scheduled</h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Meetings will appear here once an advocate schedules them</p>
              </div>
            ) : (
              meetings.map((meeting, index) => (
                <div 
                  key={meeting.id} 
                  className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800/50 hover:bg-gray-800/70' : 'bg-white hover:shadow-xl'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 hover:scale-[1.02]`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-600/10 to-emerald-600/10 rounded-full blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                          Meeting with {meeting.advocate?.user?.full_name || 'N/A'}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatDate(meeting.scheduled_date)}
                            </span>
                          </div>
                          {meeting.meeting_link && (
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-5 h-5 text-blue-500" />
                              <a 
                                href={meeting.meeting_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                Join Meeting →
                              </a>
                            </div>
                          )}
                          {meeting.meeting_location && (
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Location: {meeting.meeting_location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {meeting.notes && (
                      <div className={`mt-4 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'} rounded-xl p-3`}>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{meeting.notes}</p>
                      </div>
                    )}

                    {meeting.status === 'completed' && (
                      <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <p className="text-sm font-medium text-blue-400">
                          {meeting.advocate_decision === 'accepted' ? '✓ Case Accepted' : 
                           meeting.advocate_decision === 'rejected' ? '✗ Case Declined' : 
                           'Awaiting Advocate Decision'}
                        </p>
                        {meeting.decision_notes && (
                          <p className="text-sm text-blue-300/80 mt-1">{meeting.decision_notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : cases.length === 0 ? (
              <div className={`rounded-2xl ${darkMode ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-12 text-center`}>
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No Active Cases</h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cases will appear here after an advocate accepts your case following a meeting</p>
              </div>
            ) : (
              cases.map((caseItem, index) => (
                <div 
                  key={caseItem.id} 
                  onClick={() => navigate(`/client/cases/${caseItem.id}`)}
                  className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800/50 hover:bg-gray-800/70' : 'bg-white hover:shadow-xl'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-full blur-2xl"></div>
                  <div className="relative p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                            {formatCaseType(caseItem.case_type)}
                          </Badge>
                          <Badge className={getStatusColor(caseItem.status)}>
                            {caseItem.current_stage || caseItem.status}
                          </Badge>
                        </div>
                        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                          {caseItem.title}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3 line-clamp-2`}>
                          {caseItem.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className={`flex items-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <FileText className="w-4 h-4 mr-1" />
                            Advocate: {caseItem.advocate?.user?.full_name || 'Not assigned'}
                          </div>
                          <div className={`flex items-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(caseItem.created_at)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Query Dialog with Premium Design */}
      <Dialog open={showAIQuery} onOpenChange={setShowAIQuery}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'} rounded-2xl`}>
          <DialogHeader>
            <DialogTitle className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              <Sparkles className="w-6 h-6 text-purple-500" />
              AI Legal Analysis
            </DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Describe your legal issue and get AI-powered guidance with advocate recommendations
            </DialogDescription>
          </DialogHeader>

          {!aiResult ? (
            <form onSubmit={handleAIAnalyze} className="space-y-6">
              <div className="space-y-2">
                <Label className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Case Type</Label>
                <Select 
                  value={aiQueryData.case_type} 
                  onValueChange={(value) => setAIQueryData({...aiQueryData, case_type: value})}
                  required
                >
                  <SelectTrigger className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="alimony">Alimony</SelectItem>
                    <SelectItem value="child_custody">Child Custody</SelectItem>
                    <SelectItem value="dowry">Dowry</SelectItem>
                    <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Location</Label>
                <Input
                  value={aiQueryData.location}
                  onChange={(e) => setAIQueryData({...aiQueryData, location: e.target.value})}
                  placeholder="Enter your city or location"
                  required
                  className={darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Describe Your Situation</Label>
                <Textarea
                  value={aiQueryData.description}
                  onChange={(e) => setAIQueryData({...aiQueryData, description: e.target.value})}
                  placeholder="Provide details about your legal issue..."
                  rows={6}
                  required
                  className={darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500' : ''}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAIQuery(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={aiAnalyzing} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  {aiAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* AI Analysis Results */}
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Analysis Complete
                </h3>
                <div className="space-y-3 text-sm">
                  {aiResult.data?.legal_sections && (
                    <div>
                      <strong className="text-blue-300">Legal Sections:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1 text-gray-300">
                        {aiResult.data.legal_sections.map((section, i) => (
                          <li key={i}>{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResult.data?.required_documents && (
                    <div className="mt-3">
                      <strong className="text-blue-300">Required Documents:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1 text-gray-300">
                        {aiResult.data.required_documents.map((doc, i) => (
                          <li key={i}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Advocates */}
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <Award className="w-5 h-5 text-yellow-500" />
                  Recommended Advocates
                </h3>
                {recommendedAdvocates.length === 0 ? (
                  <div className={`text-center p-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl`}>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No advocates found for your criteria. Try adjusting your location.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendedAdvocates.map((advocate) => (
                      <div key={advocate.id} className={`rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-50 hover:bg-gray-100'} transition-all duration-300 p-6`}>
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {advocate.user?.full_name}
                              </h4>
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                                {advocate.rating.toFixed(1)}
                              </Badge>
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{advocate.location}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={darkMode ? 'border-gray-600 text-gray-300' : ''}>
                                {advocate.experience_years} years exp.
                              </Badge>
                              {advocate.specialization?.slice(0, 2).map((spec, i) => (
                                <Badge key={i} variant="outline" className={darkMode ? 'border-gray-600 text-gray-300' : ''}>
                                  {formatCaseType(spec)}
                                </Badge>
                              ))}
                            </div>
                            {advocate.bio && (
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>{advocate.bio}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleRequestMeeting(advocate)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Request Meeting
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => {
                  setAIResult(null);
                  setRecommendedAdvocates([]);
                  setShowAIQuery(false);
                }}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Request Confirmation Dialog */}
      <Dialog open={showMeetingRequest} onOpenChange={setShowMeetingRequest}>
        <DialogContent className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'} rounded-2xl`}>
          <DialogHeader>
            <DialogTitle className={darkMode ? 'text-white' : 'text-gray-900'}>Confirm Meeting Request</DialogTitle>
            <DialogDescription className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Send a meeting request to {selectedAdvocate?.user?.full_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className={`space-y-4 p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="space-y-2">
              <p><strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Advocate:</strong> <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedAdvocate?.user?.full_name}</span></p>
              <p><strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Location:</strong> <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedAdvocate?.location}</span></p>
              <p><strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Experience:</strong> <span className={darkMode ? 'text-white' : 'text-gray-900'}>{selectedAdvocate?.experience_years} years</span></p>
              <p><strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Case Type:</strong> <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatCaseType(aiQueryData.case_type)}</span></p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowMeetingRequest(false)}>
              Cancel
            </Button>
            <Button onClick={submitMeetingRequest} disabled={requestingMeeting} className="bg-gradient-to-r from-blue-600 to-purple-600">
              {requestingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Confirm Request'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default ClientDashboard;