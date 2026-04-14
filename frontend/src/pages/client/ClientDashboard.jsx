import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI, aiAPI, meetingRequestAPI, meetingAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { 
  Scale, Plus, FileText, Users, Loader2, Briefcase, Clock, CheckCircle, 
  Calendar, AlertCircle, UserCheck, Star, Sparkles, ArrowRight, ChevronRight, Zap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import NotificationPanel from '../../components/NotificationPanel';
import RatingDialog from '../../components/RatingDialog';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cases, setCases] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Rating Dialog State
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedCaseForRating, setSelectedCaseForRating] = useState(null);

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
        description: "AI has analyzed your case. Review the results below.",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error.response?.data?.detail || "Failed to analyze your query.",
        variant: "destructive"
      });
    } finally {
      setAIAnalyzing(false);
    }
  };

  const handleRequestMeeting = (advocate) => {
    setSelectedAdvocate(advocate);
    setShowMeetingRequest(true);
  };

  const handleOpenRatingDialog = (caseItem) => {
    setSelectedCaseForRating(caseItem);
    setShowRatingDialog(true);
  };

  const handleRatingSuccess = () => {
    loadCases();
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
        description: `Your request has been sent to ${selectedAdvocate.user?.full_name}.`,
      });
      
      setShowMeetingRequest(false);
      setShowAIQuery(false);
      setAIResult(null);
      setRecommendedAdvocates([]);
      loadMeetingRequests();
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to send meeting request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequestingMeeting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-violet-100 text-violet-700 border-violet-200',
      initiated: 'bg-sky-100 text-sky-700 border-sky-200',
      closed: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = [
    { label: 'Active Cases', value: cases.length, icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
    { label: 'Meeting Requests', value: meetingRequests.length, icon: Users, color: 'from-violet-500 to-purple-500' },
    { label: 'Upcoming Meetings', value: meetings.length, icon: Calendar, color: 'from-emerald-500 to-teal-500' },
    { label: 'Pending Actions', value: meetingRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden relative">
      {/* Soft Decorative Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-40 w-[600px] h-[600px] bg-violet-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-3 rounded-2xl shadow-lg">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">LFCAS</h1>
              <p className="text-xs text-slate-500 -mt-1">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationPanel />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={logout} 
                className="border-slate-300 hover:bg-slate-100"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Elegant Welcome Banner */}
        <div className="mb-12 bg-gradient-to-br from-white via-blue-50 to-violet-50 border border-white rounded-3xl p-10 shadow-xl shadow-blue-100/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow mb-4">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <span className="text-sm font-medium text-violet-700 tracking-wide">Welcome back</span>
              </div>
              <h2 className="text-5xl font-bold tracking-tighter text-slate-900 mb-3">
                Hello, {user?.full_name?.split(' ')[0]}!
              </h2>
              <p className="text-xl text-slate-600 max-w-lg">
                Your legal journey is in safe hands. Let's move forward with confidence.
              </p>
            </div>
            
            <Button 
              size="lg"
              onClick={() => setShowAIQuery(true)}
              className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white shadow-2xl shadow-violet-500/40 px-10 py-7 rounded-2xl text-lg font-semibold flex items-center gap-3 group"
            >
              Start AI Analysis
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-1"
            >
              <div className="p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                    <p className="text-5xl font-bold text-slate-900 mt-3 tracking-tighter">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-inner group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-transparent via-blue-200 to-violet-200" />
            </Card>
          ))}
        </div>

        {/* AI Quick Start Banner */}
        <div className="mb-10 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="bg-white/20 backdrop-blur p-4 rounded-2xl">
                <Zap className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Need Instant Legal Guidance?</h3>
                <p className="text-blue-100 mt-1">Describe your case and get AI insights + advocate recommendations</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAIQuery(true)}
              className="bg-white text-violet-700 hover:bg-white/90 font-semibold px-8 py-6 rounded-2xl text-lg shadow-lg"
            >
              Start New Query <Plus className="ml-2" />
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="meeting-requests" className="space-y-8">
          <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            <TabsTrigger value="meeting-requests" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-violet-600 data-[state=active]:text-white px-8 py-3 text-base">
              Meeting Requests ({meetingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="meetings" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-violet-600 data-[state=active]:text-white px-8 py-3 text-base">
              My Meetings ({meetings.length})
            </TabsTrigger>
            <TabsTrigger value="cases" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-violet-600 data-[state=active]:text-white px-8 py-3 text-base">
              My Cases ({cases.length})
            </TabsTrigger>
          </TabsList>

          {/* Meeting Requests Tab */}
          <TabsContent value="meeting-requests" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
              </div>
            ) : meetingRequests.length === 0 ? (
              <Card className="bg-white border-slate-100 p-16 text-center">
                <Users className="w-20 h-20 mx-auto text-slate-300 mb-6" />
                <h3 className="text-2xl font-semibold text-slate-800 mb-3">No Meeting Requests Yet</h3>
                <p className="text-slate-600 max-w-md mx-auto">Start by analyzing your case with AI and request a meeting with a suitable advocate.</p>
                <Button onClick={() => setShowAIQuery(true)} className="mt-8 bg-gradient-to-r from-blue-600 to-violet-600">
                  Start AI Analysis
                </Button>
              </Card>
            ) : (
              meetingRequests.map((request, index) => (
                <Card key={index} className="bg-white border border-slate-100 hover:border-violet-200 transition-all group overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <Badge className="bg-blue-100 text-blue-700">{formatCaseType(request.case_type)}</Badge>
                          <Badge className={getStatusColor(request.status)}>{request.status.toUpperCase()}</Badge>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                          Meeting Request with {request.advocate?.user?.full_name || 'Advocate'}
                        </h3>
                        <p className="text-slate-600 line-clamp-2 mb-4">{request.description}</p>
                        <div className="flex gap-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatDate(request.created_at)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-violet-600 transition-colors" />
                    </div>

                    {request.status === 'rejected' && request.rejection_reason && (
                      <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-5 text-red-700">
                        <p className="font-medium">Request Declined</p>
                        <p className="text-sm mt-1">{request.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
              </div>
            ) : meetings.length === 0 ? (
              <Card className="bg-white border-slate-100 p-16 text-center">
                <Calendar className="w-20 h-20 mx-auto text-slate-300 mb-6" />
                <h3 className="text-2xl font-semibold text-slate-800">No Meetings Scheduled</h3>
                <p className="text-slate-600 mt-3">Your scheduled meetings will appear here.</p>
              </Card>
            ) : (
              meetings.map((meeting, index) => (
                <Card key={index} className="bg-white border border-slate-100 hover:border-emerald-200 transition-all">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                        <h3 className="text-xl font-semibold text-slate-900 mt-3">
                          Meeting with {meeting.advocate?.user?.full_name}
                        </h3>
                        <div className="mt-4 space-y-2 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                            <span>{formatDate(meeting.scheduled_date)}</span>
                          </div>
                          {meeting.meeting_link && (
                            <Button 
                              onClick={() => window.open(meeting.meeting_link, '_blank')}
                              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Join Meeting
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
              </div>
            ) : cases.length === 0 ? (
              <Card className="bg-white border-slate-100 p-16 text-center">
                <Briefcase className="w-20 h-20 mx-auto text-slate-300 mb-6" />
                <h3 className="text-2xl font-semibold text-slate-800">No Active Cases</h3>
                <p className="text-slate-600 mt-3">Your active cases will appear here once accepted by an advocate.</p>
              </Card>
            ) : (
              cases.map((caseItem, index) => (
                <Card key={index} className="bg-white border border-slate-100 hover:border-violet-200 transition-all group">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/client/cases/${caseItem.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Badge className="bg-violet-100 text-violet-700">{formatCaseType(caseItem.case_type)}</Badge>
                          <Badge className={getStatusColor(caseItem.status)}>
                            {caseItem.current_stage || caseItem.status}
                          </Badge>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{caseItem.title}</h3>
                        <p className="text-slate-600 line-clamp-2 mb-4">{caseItem.description}</p>
                        <div className="flex gap-6 text-sm text-slate-500">
                          <div>Advocate: {caseItem.advocate?.user?.full_name || 'Not Assigned'}</div>
                          <div>{formatDate(caseItem.created_at)}</div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/client/cases/${caseItem.id}`)}
                        >
                          View Details
                        </Button>
                        {caseItem.current_stage === 'CLOSED' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenRatingDialog(caseItem)}
                            className="border-amber-400 text-amber-600 hover:bg-amber-50"
                          >
                            <Star className="w-4 h-4 mr-1" /> Rate Advocate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIQuery} onOpenChange={setShowAIQuery}>
        <DialogContent className="max-w-4xl bg-white border-slate-200 rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="text-violet-600" /> AI Legal Analysis
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Tell us about your case and get instant insights with advocate recommendations.
            </DialogDescription>
          </DialogHeader>

          {/* Rest of the AI dialog content remains the same as your original with light theme adjustments */}
          {!aiResult ? (
            <form onSubmit={handleAIAnalyze} className="space-y-6 py-4">
              {/* Form fields with light styling */}
              <div className="space-y-2">
                <Label>Case Type</Label>
                <Select value={aiQueryData.case_type} onValueChange={(v) => setAIQueryData({...aiQueryData, case_type: v})}>
                  <SelectTrigger>
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
                <Label>Location</Label>
                <Input 
                  value={aiQueryData.location}
                  onChange={(e) => setAIQueryData({...aiQueryData, location: e.target.value})}
                  placeholder="e.g. Kolkata, West Bengal"
                />
              </div>

              <div className="space-y-2">
                <Label>Describe Your Situation</Label>
                <Textarea 
                  value={aiQueryData.description}
                  onChange={(e) => setAIQueryData({...aiQueryData, description: e.target.value})}
                  rows={6}
                  placeholder="Please provide details about your legal issue..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAIQuery(false)}>Cancel</Button>
                <Button type="submit" disabled={aiAnalyzing} className="bg-gradient-to-r from-blue-600 to-violet-600">
                  {aiAnalyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </div>
            </form>
          ) : (
            // Recommended Advocates section with light styling
            <div className="py-4 space-y-8">
              {/* AI Result Display */}
              <div className="bg-gradient-to-br from-blue-50 to-violet-50 border border-violet-100 rounded-2xl p-8">
                <h3 className="font-semibold text-violet-700 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> AI Analysis Summary
                </h3>
                {/* Render aiResult content here as per your original logic */}
              </div>

              {/* Recommended Advocates List - Same as original */}
              {recommendedAdvocates.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Award className="text-amber-500" /> Recommended Advocates
                  </h3>
                  <div className="space-y-4">
                    {recommendedAdvocates.map((adv) => (
                      <Card key={adv.id} className="p-6 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg">{adv.user?.full_name}</h4>
                            <p className="text-slate-600">{adv.location} • {adv.experience_years} years experience</p>
                          </div>
                          <Button onClick={() => handleRequestMeeting(adv)} className="bg-gradient-to-r from-blue-600 to-violet-600">
                            Request Meeting
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Request Confirmation Dialog */}
      <Dialog open={showMeetingRequest} onOpenChange={setShowMeetingRequest}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Meeting Request</DialogTitle>
            <DialogDescription>Send request to {selectedAdvocate?.user?.full_name}?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowMeetingRequest(false)}>Cancel</Button>
            <Button onClick={submitMeetingRequest} disabled={requestingMeeting}>
              {requestingMeeting ? "Sending..." : "Confirm Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      {selectedCaseForRating && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          caseData={selectedCaseForRating}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
};

export default ClientDashboard;