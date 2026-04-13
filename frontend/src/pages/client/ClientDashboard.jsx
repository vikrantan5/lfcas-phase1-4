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
import { Scale, Plus, FileText, Users, Bell, MessageSquare, Loader2, Briefcase, Clock, CheckCircle, Calendar, AlertCircle, UserCheck, X } from 'lucide-react';
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
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      accepted: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-purple-100 text-purple-800 border-purple-300',
      initiated: 'bg-blue-100 text-blue-800 border-blue-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="min-h-screen bg-gray-50" data-testid="client-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LFCAS</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={logout} data-testid="logout-button">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Meeting Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{meetingRequests.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Meetings</p>
                  <p className="text-2xl font-bold text-gray-900">{meetings.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Actions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {meetingRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New Case Button */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Need Legal Assistance?</h3>
                  <p className="text-blue-100">Get AI-powered analysis and connect with expert advocates</p>
                </div>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => setShowAIQuery(true)}
                  data-testid="start-query-button"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Start New Query
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="meeting-requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meeting-requests" data-testid="tab-meeting-requests">
              <Users className="w-4 h-4 mr-2" />
              Meeting Requests ({meetingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="meetings" data-testid="tab-meetings">
              <Calendar className="w-4 h-4 mr-2" />
              Meetings ({meetings.length})
            </TabsTrigger>
            <TabsTrigger value="cases" data-testid="tab-cases">
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meeting Requests Yet</h3>
                  <p className="text-gray-600 mb-4">Start by analyzing your legal query and requesting a meeting with an advocate</p>
                  <Button onClick={() => setShowAIQuery(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Query
                  </Button>
                </CardContent>
              </Card>
            ) : (
              meetingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {formatCaseType(request.case_type)} Case
                        </CardTitle>
                        <CardDescription>
                          Advocate: {request.advocate?.user?.full_name || 'N/A'} • {request.advocate?.location || 'N/A'}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{request.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(request.created_at)}
                        </div>
                        {request.preferred_date && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Preferred: {formatDate(request.preferred_date)}
                          </div>
                        )}
                      </div>

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Rejected</p>
                            <p className="text-sm text-red-700">{request.rejection_reason}</p>
                          </div>
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm text-green-700">Advocate accepted your request. Awaiting meeting schedule.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meetings Scheduled</h3>
                  <p className="text-gray-600">Meetings will appear here once an advocate schedules them</p>
                </CardContent>
              </Card>
            ) : (
              meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          Meeting with {meeting.advocate?.user?.full_name || 'N/A'}
                        </CardTitle>
                        <CardDescription>
                          {meeting.meeting_mode === 'online' ? 'Online Meeting' : 'In-Person Meeting'}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{formatDate(meeting.scheduled_date)}</span>
                      </div>

                      {meeting.meeting_link && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <a 
                            href={meeting.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}

                      {meeting.meeting_location && (
                        <p className="text-sm text-gray-600">Location: {meeting.meeting_location}</p>
                      )}

                      {meeting.notes && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{meeting.notes}</p>
                      )}

                      {meeting.status === 'completed' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm font-medium text-blue-900">
                            Status: {meeting.advocate_decision === 'accepted' ? '✓ Case Accepted' : 
                                    meeting.advocate_decision === 'rejected' ? '✗ Case Declined' : 
                                    'Awaiting Advocate Decision'}
                          </p>
                          {meeting.decision_notes && (
                            <p className="text-sm text-blue-700 mt-1">{meeting.decision_notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Cases</h3>
                  <p className="text-gray-600 mb-4">Cases will appear here after an advocate accepts your case following a meeting</p>
                </CardContent>
              </Card>
            ) : (
              cases.map((caseItem) => (
                <Card 
                  key={caseItem.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/client/cases/${caseItem.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{caseItem.title}</CardTitle>
                        <CardDescription>
                          Advocate: {caseItem.advocate?.user?.full_name || 'Not assigned'} • {formatCaseType(caseItem.case_type)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {caseItem.current_stage || caseItem.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">{caseItem.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {caseItem.case_type}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(caseItem.created_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Query Dialog */}
      <Dialog open={showAIQuery} onOpenChange={setShowAIQuery}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Legal Query Analysis</DialogTitle>
            <DialogDescription>
              Describe your legal issue and get AI-powered guidance with advocate recommendations
            </DialogDescription>
          </DialogHeader>

          {!aiResult ? (
            <form onSubmit={handleAIAnalyze} className="space-y-4">
              <div>
                <Label>Case Type</Label>
                <Select 
                  value={aiQueryData.case_type} 
                  onValueChange={(value) => setAIQueryData({...aiQueryData, case_type: value})}
                  required
                >
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

              <div>
                <Label>Location</Label>
                <Input
                  value={aiQueryData.location}
                  onChange={(e) => setAIQueryData({...aiQueryData, location: e.target.value})}
                  placeholder="Enter your city or location"
                  required
                />
              </div>

              <div>
                <Label>Describe Your Situation</Label>
                <Textarea
                  value={aiQueryData.description}
                  onChange={(e) => setAIQueryData({...aiQueryData, description: e.target.value})}
                  placeholder="Provide details about your legal issue..."
                  rows={6}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAIQuery(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={aiAnalyzing}>
                  {aiAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze with AI'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* AI Analysis Results */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">AI Analysis Complete</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  {aiResult.data?.legal_sections && (
                    <div>
                      <strong>Legal Sections:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {aiResult.data.legal_sections.map((section, i) => (
                          <li key={i}>{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiResult.data?.required_documents && (
                    <div>
                      <strong>Required Documents:</strong>
                      <ul className="list-disc list-inside ml-2">
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
                <h3 className="font-semibold text-gray-900 mb-4">Recommended Advocates</h3>
                {recommendedAdvocates.length === 0 ? (
                  <p className="text-gray-600">No advocates found for your criteria. Try adjusting your location.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendedAdvocates.map((advocate) => (
                      <Card key={advocate.id} className="hover:border-blue-500 transition-colors">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{advocate.user?.full_name}</h4>
                              <p className="text-sm text-gray-600 mb-2">{advocate.location}</p>
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">{advocate.experience_years} years exp.</Badge>
                                <Badge variant="outline">Rating: {advocate.rating.toFixed(1)}</Badge>
                              </div>
                              {advocate.bio && (
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{advocate.bio}</p>
                              )}
                            </div>
                            <Button onClick={() => handleRequestMeeting(advocate)}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Request Meeting
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Meeting Request</DialogTitle>
            <DialogDescription>
              Send a meeting request to {selectedAdvocate?.user?.full_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p><strong>Advocate:</strong> {selectedAdvocate?.user?.full_name}</p>
              <p><strong>Location:</strong> {selectedAdvocate?.location}</p>
              <p><strong>Experience:</strong> {selectedAdvocate?.experience_years} years</p>
              <p><strong>Case Type:</strong> {formatCaseType(aiQueryData.case_type)}</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMeetingRequest(false)}>
                Cancel
              </Button>
              <Button onClick={submitMeetingRequest} disabled={requestingMeeting}>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;
