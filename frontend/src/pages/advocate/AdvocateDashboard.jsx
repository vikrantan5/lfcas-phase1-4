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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Scale, Loader2, X, Check, AlertCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { formatError } from '../../lib/errorFormatter';

// Premium Dashboard Components
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import StatCards from '../../components/advocate/StatCards';
import ActivityStatistics from '../../components/advocate/ActivityStatistics';
import TodaysHearings from '../../components/advocate/TodaysHearings';
import OngoingCasesTable from '../../components/advocate/OngoingCasesTable';
import PendingClientRequests from '../../components/advocate/PendingClientRequests';
import RemindersToday from '../../components/advocate/RemindersToday';
import QuickActions from '../../components/advocate/QuickActions';

import '../../styles/advocate-dashboard.css';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const generateJitsiLink = (meetingRequestId) => {
    const roomName = `LFCAS-Meeting-${meetingRequestId.slice(0, 8)}`;
    return `https://meet.jit.si/${roomName}`;
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
      // Fix: Send specializations (plural) instead of specialization
      const payload = {
        bar_council_id: profileData.bar_council_id,
        specializations: profileData.specialization,
        experience_years: parseInt(profileData.experience_years) || 0,
        location: profileData.location,
        bio: profileData.bio || null
      };
      
      await advocateAPI.createProfile(payload);
      toast({ title: "Profile Created", description: "Your advocate profile has been submitted for approval." });
      setShowProfileSetup(false);
      loadData();
    } catch (error) {
      console.error('Profile creation failed:', error);
      const errorMessage = formatError(error);
      toast({ 
        title: "Profile Creation Failed", 
        description: errorMessage, 
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
      toast({ title: `Request ${responseAction === 'accept' ? 'Accepted' : 'Rejected'}`, description: `Meeting request has been ${responseAction}ed successfully.` });
      setRespondingToRequest(null);
      setResponseAction('');
      setRejectionReason('');
      await loadMeetingRequests();
    } catch (error) {
      toast({ title: "Action Failed", description: error.response?.data?.detail || "Failed to process request.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!schedulingMeeting) return;
    if (!meetingData.scheduled_date) {
      toast({ title: "Invalid Date", description: "Please select a valid meeting date and time.", variant: "destructive" });
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
      toast({ title: "Meeting Scheduled", description: "The client has been notified about the meeting schedule." });
      setSchedulingMeeting(null);
      setMeetingData({ scheduled_date: '', meeting_mode: 'online', meeting_link: '', meeting_location: '', notes: '' });
      await loadMeetings();
      await loadMeetingRequests();
    } catch (error) {
      toast({ title: "Scheduling Failed", description: error.response?.data?.detail || "Failed to schedule meeting.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteMeeting = async (meetingId) => {
    try {
      await meetingAPI.complete(meetingId);
      toast({ title: "Meeting Completed", description: "Meeting marked as completed." });
      await loadMeetings();
    } catch (error) {
      toast({ title: "Action Failed", description: error.response?.data?.detail || "Failed to complete meeting.", variant: "destructive" });
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
        description: decision === 'accept' ? "The case has been created and assigned to you." : "The client has been notified of your decision.",
      });
      setMakingDecision(null);
      setDecision('');
      setDecisionNotes('');
      setCaseTitle('');
      await loadMeetings();
      if (decision === 'accept') await loadCases();
    } catch (error) {
      toast({ title: "Decision Failed", description: error.response?.data?.detail || "Failed to record decision.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatCaseType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F3FF' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#815DF5' }} />
      </div>
    );
  }

  // Profile Setup
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
              <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
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
                  <Input value={profileData.bar_council_id} onChange={(e) => setProfileData({...profileData, bar_council_id: e.target.value})} placeholder="Enter your Bar Council ID" required />
                </div>
                <div>
                  <Label>Specialization</Label>
                  <Select value={profileData.specialization[0] || ''} onValueChange={(value) => {
                    if (!profileData.specialization.includes(value)) {
                      setProfileData({ ...profileData, specialization: [...profileData.specialization, value] });
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select specializations" /></SelectTrigger>
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
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setProfileData({ ...profileData, specialization: profileData.specialization.filter((_, i) => i !== index) })} />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Experience Years</Label>
                  <Input type="number" value={profileData.experience_years} onChange={(e) => setProfileData({...profileData, experience_years: parseInt(e.target.value) || 0})} min="0" required />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={profileData.location} onChange={(e) => setProfileData({...profileData, location: e.target.value})} placeholder="City, State" required />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} placeholder="Brief description..." rows={4} />
                </div>
                <Button type="submit" className="w-full" disabled={creatingProfile}>
                  {creatingProfile ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Profile...</>) : 'Create Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // === PREMIUM ADVOCATE DASHBOARD ===
  return (
    <div className="advocate-dashboard" data-testid="advocate-dashboard">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.full_name }
      />

      {/* Main Content */}
      <div className="adv-main" data-testid="advocate-main-content">
        {/* Header */}
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userName={user?.full_name }
        />

        {/* Profile Status Alert */}
        {profile?.status !== 'approved' && (
          <div style={{
            background: '#FFF8E1',
            borderBottom: '1px solid #FFE082',
            padding: '10px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertCircle size={18} color="#F57F17" />
            <p style={{ fontSize: 13, color: '#F57F17', fontWeight: 500, margin: 0 }}>
              Your profile is {profile?.status === 'pending_approval' ? 'pending approval' : profile?.status}.
              You'll be able to accept cases once approved by the platform manager.
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="adv-content" style={{ padding: '24px 28px' }}>
          {/* Stat Cards */}
          <StatCards />

          {/* Main Grid: Activity + Right Column */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 20,
            marginTop: 20,
          }} data-testid="main-grid">
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Activity Statistics */}
              <ActivityStatistics />

              {/* Ongoing Cases Table */}
              <OngoingCasesTable cases={cases} />

              {/* Quick Actions */}
              <QuickActions />
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Today's Hearings */}
              <TodaysHearings />

              {/* Pending Client Requests */}
              <PendingClientRequests requests={meetingRequests.filter(r => r.status === 'pending')} />

              {/* Reminders for Today */}
              <RemindersToday />
            </div>
          </div>
        </div>
      </div>

      {/* ===== DIALOGS (keep all existing functionality) ===== */}

      {/* Meeting Request Response Dialog */}
      <Dialog open={!!respondingToRequest} onOpenChange={() => {
        setRespondingToRequest(null);
        setResponseAction('');
        setRejectionReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{responseAction === 'accept' ? 'Accept Meeting Request' : 'Decline Meeting Request'}</DialogTitle>
            <DialogDescription>
              {responseAction === 'accept' ? 'You can schedule the meeting after accepting this request.' : 'Please provide a reason for declining this request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {responseAction === 'reject' && (
              <div>
                <Label>Reason for Declining</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why..." rows={4} required />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setRespondingToRequest(null); setResponseAction(''); setRejectionReason(''); }}>Cancel</Button>
              <Button onClick={handleRespondToRequest} disabled={processing || (responseAction === 'reject' && !rejectionReason)}>
                {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : `Confirm ${responseAction === 'accept' ? 'Accept' : 'Decline'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={!!schedulingMeeting} onOpenChange={() => {
        setSchedulingMeeting(null);
        setMeetingData({ scheduled_date: '', meeting_mode: 'online', meeting_link: '', meeting_location: '', notes: '' });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>Set the date and details for the meeting with {schedulingMeeting?.client?.full_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleMeeting} className="space-y-4">
            <div>
              <Label>Meeting Date & Time</Label>
              <Input type="datetime-local" value={meetingData.scheduled_date} onChange={(e) => setMeetingData({...meetingData, scheduled_date: e.target.value})} required />
            </div>
            <div>
              <Label>Meeting Mode</Label>
              <Select value={meetingData.meeting_mode} onValueChange={(value) => setMeetingData({...meetingData, meeting_mode: value})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {meetingData.meeting_mode === 'online' && (
              <div>
                <Label>Meeting Link</Label>
                <div className="flex gap-2">
                  <Input value={meetingData.meeting_link} onChange={(e) => setMeetingData({...meetingData, meeting_link: e.target.value})} placeholder="https://meet.jit.si/..." />
                  <Button type="button" variant="outline" onClick={() => { const link = generateJitsiLink(schedulingMeeting.id); setMeetingData({...meetingData, meeting_link: link}); }}>Generate</Button>
                </div>
              </div>
            )}
            {meetingData.meeting_mode === 'in_person' && (
              <div>
                <Label>Meeting Location</Label>
                <Input value={meetingData.meeting_location} onChange={(e) => setMeetingData({...meetingData, meeting_location: e.target.value})} placeholder="Office address" />
              </div>
            )}
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={meetingData.notes} onChange={(e) => setMeetingData({...meetingData, notes: e.target.value})} placeholder="Additional info..." rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setSchedulingMeeting(null); setMeetingData({ scheduled_date: '', meeting_mode: 'online', meeting_link: '', meeting_location: '', notes: '' }); }}>Cancel</Button>
              <Button type="submit" disabled={processing}>
                {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scheduling...</>) : 'Schedule Meeting'}
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
            <DialogDescription>After meeting with {makingDecision?.client?.full_name}, decide whether to take this case</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Decision</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger><SelectValue placeholder="Select your decision" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept Case</SelectItem>
                  <SelectItem value="reject">Decline Case</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {decision === 'accept' && (
              <div>
                <Label>Case Title</Label>
                <Input value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} placeholder="Enter a title for this case" required />
              </div>
            )}
            <div>
              <Label>Notes {decision === 'reject' && '(Required)'}</Label>
              <Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder={decision === 'accept' ? 'Notes...' : 'Explain why...'} rows={4} required={decision === 'reject'} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setMakingDecision(null); setDecision(''); setDecisionNotes(''); setCaseTitle(''); }}>Cancel</Button>
              <Button onClick={handleMakeDecision} disabled={processing || !decision || (decision === 'accept' && !caseTitle)}>
                {processing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : 'Confirm Decision'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvocateDashboard;
