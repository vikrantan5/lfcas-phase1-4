import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI, advocateAPI, meetingRequestAPI, meetingAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Scale, Briefcase, Clock, Star, Bell, Loader2, Calendar, FileText, User, UserCheck, X, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const AdvocateDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [cases, setCases] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Profile Setup State
  const [profileData, setProfileData] = useState({
    bar_council_id: '',
    specialization: [],
    experience_years: 0,
    location: '',
    bio: ''
  });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Meeting Request Response State
  const [respondingToRequest, setRespondingToRequest] = useState(null);
  const [responseAction, setResponseAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Schedule Meeting State
  const [schedulingMeeting, setSchedulingMeeting] = useState(null);
  const [meetingData, setMeetingData] = useState({
    scheduled_date: '',
    meeting_mode: 'online',
    meeting_link: '',
    meeting_location: '',
    notes: ''
  });

  // Advocate Decision State
  const [makingDecision, setMakingDecision] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [caseTitle, setCaseTitle] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load advocate profile
      const advocatesResponse = await advocateAPI.list();
      const myProfile = advocatesResponse.data.find(adv => adv.user_id === user.id);
      
      if (myProfile) {
        setProfile(myProfile);
        await Promise.all([
          loadMeetingRequests(),
          loadMeetings(),
          loadCases()
        ]);
      } else {
        setShowProfileSetup(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingRequests = async () => {
    try {
      const response = await meetingRequestAPI.list();
      setMeetingRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load meeting requests:', error);
      setMeetingRequests([]);
    }
  };

  const loadMeetings = async () => {
    try {
      const response = await meetingAPI.list();
      setMeetings(response.data || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      setMeetings([]);
    }
  };

  const loadCases = async () => {
    try {
      const response = await caseAPI.list();
      setCases(response.data || []);
    } catch (error) {
      console.error('Failed to load cases:', error);
      setCases([]);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setCreatingProfile(true);
    
    try {
      await advocateAPI.createProfile(profileData);
      
      toast({
        title: "Profile Created",
        description: "Your advocate profile has been submitted for approval.",
      });
      
      setShowProfileSetup(false);
      loadData();
    } catch (error) {
      console.error('Profile creation failed:', error);
      toast({
        title: "Profile Creation Failed",
        description: error.response?.data?.detail || "Failed to create profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleRespondToRequest = async () => {
    if (!respondingToRequest || !responseAction) return;
    
    setProcessing(true);
    
    try {
      await meetingRequestAPI.respond(respondingToRequest.id, {
        action: responseAction,
        rejection_reason: responseAction === 'reject' ? rejectionReason : undefined
      });
      
      toast({
        title: `Request ${responseAction === 'accept' ? 'Accepted' : 'Rejected'}`,
        description: `Meeting request has been ${responseAction}ed successfully.`,
      });
      
      setRespondingToRequest(null);
      setResponseAction('');
      setRejectionReason('');
      await loadMeetingRequests();
    } catch (error) {
      console.error('Response failed:', error);
      toast({
        title: "Action Failed",
        description: error.response?.data?.detail || "Failed to process request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!schedulingMeeting) return;
    
    // Validate date
    if (!meetingData.scheduled_date) {
      toast({
        title: "Invalid Date",
        description: "Please select a valid meeting date and time.",
        variant: "destructive"
      });
      return;
    }
    
    setProcessing(true);
    
    try {
      await meetingAPI.schedule({
        meeting_request_id: schedulingMeeting.id,
        scheduled_date: new Date(meetingData.scheduled_date).toISOString(),
        meeting_mode: meetingData.meeting_mode,
        meeting_link: meetingData.meeting_link || undefined,
        meeting_location: meetingData.meeting_location || undefined,
        notes: meetingData.notes || undefined
      });
      
      toast({
        title: "Meeting Scheduled",
        description: "The client has been notified about the meeting schedule.",
      });
      
      setSchedulingMeeting(null);
      setMeetingData({
        scheduled_date: '',
        meeting_mode: 'online',
        meeting_link: '',
        meeting_location: '',
        notes: ''
      });
      await loadMeetings();
      await loadMeetingRequests();
    } catch (error) {
      console.error('Scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: error.response?.data?.detail || "Failed to schedule meeting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteMeeting = async (meetingId) => {
    try {
      await meetingAPI.complete(meetingId);
      
      toast({
        title: "Meeting Completed",
        description: "Meeting marked as completed. You can now make your decision on taking the case.",
      });
      
      await loadMeetings();
    } catch (error) {
      console.error('Complete meeting failed:', error);
      toast({
        title: "Action Failed",
        description: error.response?.data?.detail || "Failed to complete meeting.",
        variant: "destructive"
      });
    }
  };

  const handleMakeDecision = async () => {
    if (!makingDecision || !decision) return;
    
    setProcessing(true);
    
    try {
      await meetingAPI.decision(makingDecision.id, {
        decision: decision,
        decision_notes: decisionNotes || undefined,
        case_title: decision === 'accept' ? caseTitle : undefined
      });
      
      toast({
        title: decision === 'accept' ? "Case Accepted" : "Case Declined",
        description: decision === 'accept' 
          ? "The case has been created and assigned to you."
          : "The client has been notified of your decision.",
      });
      
      setMakingDecision(null);
      setDecision('');
      setDecisionNotes('');
      setCaseTitle('');
      await loadMeetings();
      if (decision === 'accept') {
        await loadCases();
      }
    } catch (error) {
      console.error('Decision failed:', error);
      toast({
        title: "Decision Failed",
        description: error.response?.data?.detail || "Failed to record decision. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCaseType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
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
      pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">LFCAS</h1>
                  <p className="text-xs text-gray-500">Advocate Portal</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Advocate Profile</CardTitle>
              <CardDescription>Complete your profile to start receiving case requests</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <Label>Bar Council ID</Label>
                  <Input
                    value={profileData.bar_council_id}
                    onChange={(e) => setProfileData({...profileData, bar_council_id: e.target.value})}
                    placeholder="Enter your Bar Council ID"
                    required
                  />
                </div>

                <div>
                  <Label>Specialization (Select multiple)</Label>
                  <Select
                    value={profileData.specialization[0] || ''}
                    onValueChange={(value) => {
                      if (!profileData.specialization.includes(value)) {
                        setProfileData({
                          ...profileData,
                          specialization: [...profileData.specialization, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specializations" />
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
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.specialization.map((spec, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {formatCaseType(spec)}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => setProfileData({
                            ...profileData,
                            specialization: profileData.specialization.filter((_, i) => i !== index)
                          })}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Experience Years</Label>
                  <Input
                    type="number"
                    value={profileData.experience_years}
                    onChange={(e) => setProfileData({...profileData, experience_years: parseInt(e.target.value) || 0})}
                    placeholder="Years of experience"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={profileData.location}
                    onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                    placeholder="City, State"
                    required
                  />
                </div>

                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    placeholder="Brief description about your practice..."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={creatingProfile}>
                  {creatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    'Create Profile'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="advocate-dashboard">
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
                <p className="text-xs text-gray-500">Advocate Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {profile && (
                <Badge className={getStatusColor(profile.status)}>
                  {profile.status}
                </Badge>
              )}
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

      {/* Profile Status Alert */}
      {profile?.status !== 'approved' && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                Your profile is {profile?.status === 'pending_approval' ? 'pending approval' : profile?.status}. 
                You'll be able to accept cases once approved by the platform manager.
              </p>
            </div>
          </div>
        </div>
      )}

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
                <UserCheck className="w-8 h-8 text-purple-600" />
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
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.rating?.toFixed(1) || '0.0'}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="meeting-requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meeting-requests" data-testid="tab-meeting-requests">
              <UserCheck className="w-4 h-4 mr-2" />
              Meeting Requests ({meetingRequests.filter(r => r.status === 'pending').length})
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
            {meetingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meeting Requests</h3>
                  <p className="text-gray-600">Meeting requests from clients will appear here</p>
                </CardContent>
              </Card>
            ) : (
              meetingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {formatCaseType(request.case_type)} Case Request
                        </CardTitle>
                        <CardDescription>
                          Client: {request.client?.full_name || 'N/A'} • {request.location}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700">{request.description}</p>
                      
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

                      {request.status === 'pending' && profile?.status === 'approved' && (
                        <div className="flex gap-3 pt-3">
                          <Button
                            variant="default"
                            onClick={() => {
                              setRespondingToRequest(request);
                              setResponseAction('accept');
                            }}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRespondingToRequest(request);
                              setResponseAction('reject');
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <Button onClick={() => setSchedulingMeeting(request)}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Meeting
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            {meetings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Meetings Scheduled</h3>
                  <p className="text-gray-600">Scheduled meetings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          Meeting with {meeting.client?.full_name || 'N/A'}
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
                        <p className="text-sm text-gray-600">Link: {meeting.meeting_link}</p>
                      )}

                      {meeting.meeting_location && (
                        <p className="text-sm text-gray-600">Location: {meeting.meeting_location}</p>
                      )}

                      {meeting.notes && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{meeting.notes}</p>
                      )}

                      {meeting.status === 'scheduled' && (
                        <Button onClick={() => handleCompleteMeeting(meeting.id)}>
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Completed
                        </Button>
                      )}

                      {meeting.status === 'completed' && meeting.advocate_decision === 'pending' && (
                        <Button onClick={() => setMakingDecision(meeting)}>
                          Make Decision on Case
                        </Button>
                      )}

                      {meeting.advocate_decision !== 'pending' && meeting.advocate_decision && (
                        <div className={`p-3 rounded-md ${
                          meeting.advocate_decision === 'accepted' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm font-medium ${
                            meeting.advocate_decision === 'accepted' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            Decision: {meeting.advocate_decision === 'accepted' ? 'Case Accepted' : 'Case Declined'}
                          </p>
                          {meeting.decision_notes && (
                            <p className={`text-sm mt-1 ${
                              meeting.advocate_decision === 'accepted' ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {meeting.decision_notes}
                            </p>
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
            {cases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Cases</h3>
                  <p className="text-gray-600">Cases you accept will appear here</p>
                </CardContent>
              </Card>
            ) : (
              cases.map((caseItem) => (
                <Card 
                  key={caseItem.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/cases/${caseItem.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{caseItem.title}</CardTitle>
                        <CardDescription>
                          Client: {caseItem.client?.full_name || 'N/A'} • {formatCaseType(caseItem.case_type)}
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

      {/* Meeting Request Response Dialog */}
      <Dialog open={!!respondingToRequest} onOpenChange={() => {
        setRespondingToRequest(null);
        setResponseAction('');
        setRejectionReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === 'accept' ? 'Accept Meeting Request' : 'Decline Meeting Request'}
            </DialogTitle>
            <DialogDescription>
              {responseAction === 'accept' 
                ? 'You can schedule the meeting after accepting this request.'
                : 'Please provide a reason for declining this request.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {responseAction === 'reject' && (
              <div>
                <Label>Reason for Declining</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why you're declining this request..."
                  rows={4}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setRespondingToRequest(null);
                  setResponseAction('');
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRespondToRequest} 
                disabled={processing || (responseAction === 'reject' && !rejectionReason)}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${responseAction === 'accept' ? 'Accept' : 'Decline'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={!!schedulingMeeting} onOpenChange={() => {
        setSchedulingMeeting(null);
        setMeetingData({
          scheduled_date: '',
          meeting_mode: 'online',
          meeting_link: '',
          meeting_location: '',
          notes: ''
        });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Set the date and details for the meeting with {schedulingMeeting?.client?.full_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleMeeting} className="space-y-4">
            <div>
              <Label>Meeting Date & Time</Label>
              <Input
                type="datetime-local"
                value={meetingData.scheduled_date}
                onChange={(e) => setMeetingData({...meetingData, scheduled_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Meeting Mode</Label>
              <Select
                value={meetingData.meeting_mode}
                onValueChange={(value) => setMeetingData({...meetingData, meeting_mode: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {meetingData.meeting_mode === 'online' && (
              <div>
                <Label>Meeting Link (Google Meet, Zoom, etc.)</Label>
                <Input
                  value={meetingData.meeting_link}
                  onChange={(e) => setMeetingData({...meetingData, meeting_link: e.target.value})}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {meetingData.meeting_mode === 'in_person' && (
              <div>
                <Label>Meeting Location</Label>
                <Input
                  value={meetingData.meeting_location}
                  onChange={(e) => setMeetingData({...meetingData, meeting_location: e.target.value})}
                  placeholder="Office address"
                />
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={meetingData.notes}
                onChange={(e) => setMeetingData({...meetingData, notes: e.target.value})}
                placeholder="Any additional information for the client..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setSchedulingMeeting(null);
                  setMeetingData({
                    scheduled_date: '',
                    meeting_mode: 'online',
                    meeting_link: '',
                    meeting_location: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Meeting'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Advocate Decision Dialog */}
      <Dialog open={!!makingDecision} onOpenChange={() => {
        setMakingDecision(null);
        setDecision('');
        setDecisionNotes('');
        setCaseTitle('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Case Decision</DialogTitle>
            <DialogDescription>
              After meeting with {makingDecision?.client?.full_name}, decide whether to take this case
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Your Decision</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept Case</SelectItem>
                  <SelectItem value="reject">Decline Case</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {decision === 'accept' && (
              <div>
                <Label>Case Title</Label>
                <Input
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="Enter a title for this case"
                  required
                />
              </div>
            )}

            <div>
              <Label>Notes {decision === 'reject' && '(Required)'}</Label>
              <Textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder={decision === 'accept' ? 'Any notes about the case...' : 'Explain why you are declining...'}
                rows={4}
                required={decision === 'reject'}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setMakingDecision(null);
                  setDecision('');
                  setDecisionNotes('');
                  setCaseTitle('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMakeDecision} 
                disabled={processing || !decision || (decision === 'accept' && !caseTitle)}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Decision'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvocateDashboard;