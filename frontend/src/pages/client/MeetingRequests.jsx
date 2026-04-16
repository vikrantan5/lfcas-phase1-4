import React, { useState, useEffect } from 'react';
import { meetingRequestAPI, meetingAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Clock, CheckCircle, XCircle, Calendar, MapPin, FileText, User, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const MeetingRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsRes, meetingsRes] = await Promise.all([
        meetingRequestAPI.list(),
        meetingAPI.list()
      ]);
      setRequests(requestsRes.data || []);
      setMeetings(meetingsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Pending' },
      accepted: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Accepted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar, label: 'Scheduled' },
      completed: { bg: 'bg-violet-100', text: 'text-violet-700', icon: CheckCircle, label: 'Completed' },
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </Badge>
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const RequestCard = ({ request }) => (
    <Card className="p-6 hover:shadow-lg transition-shadow" data-testid={`request-card-${request.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {request.case_type.replace('_', ' ').toUpperCase()} Case
            </h3>
            {getStatusBadge(request.status)}
          </div>
          <p className="text-sm text-slate-600">
            Request sent {formatDate(request.created_at)}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {request.advocate && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <User size={16} className="text-violet-600" />
            <span><strong>Advocate:</strong> {request.advocate.user?.full_name || 'N/A'}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <MapPin size={16} className="text-violet-600" />
          <span><strong>Location:</strong> {request.location}</span>
        </div>
        {request.preferred_date && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Calendar size={16} className="text-violet-600" />
            <span><strong>Preferred Date:</strong> {formatDate(request.preferred_date)}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-slate-700">
          <strong>Case Description:</strong><br />
          {request.description}
        </p>
      </div>

      {request.rejection_reason && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
          <p className="text-sm text-red-700">
            <strong>Rejection Reason:</strong> {request.rejection_reason}
          </p>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          <Clock size={16} />
          <span>Waiting for advocate response...</span>
        </div>
      )}
    </Card>
  );

  const MeetingCard = ({ meeting }) => (
    <Card className="p-6 hover:shadow-lg transition-shadow" data-testid={`meeting-card-${meeting.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">Scheduled Meeting</h3>
            {getStatusBadge(meeting.status)}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {meeting.advocate && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <User size={16} className="text-violet-600" />
            <span><strong>With:</strong> {meeting.advocate.user?.full_name || 'N/A'}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Calendar size={16} className="text-violet-600" />
          <span><strong>Date & Time:</strong> {formatDate(meeting.scheduled_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <MapPin size={16} className="text-violet-600" />
          <span><strong>Mode:</strong> {meeting.meeting_mode === 'online' ? 'Online Meeting' : 'In-Person'}</span>
        </div>
      </div>

      {meeting.meeting_link && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-slate-700 mb-2"><strong>Meeting Link:</strong></p>
          <a 
            href={meeting.meeting_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {meeting.meeting_link}
          </a>
        </div>
      )}

      {meeting.meeting_location && (
        <div className="bg-slate-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-slate-700">
            <strong>Location:</strong> {meeting.meeting_location}
          </p>
        </div>
      )}

      {meeting.notes && (
        <div className="bg-slate-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-slate-700">
            <strong>Notes:</strong> {meeting.notes}
          </p>
        </div>
      )}

      {meeting.advocate_decision && meeting.advocate_decision !== 'pending' && (
        <div className={`p-4 rounded-lg ${
          meeting.advocate_decision === 'accepted' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm font-medium ${
            meeting.advocate_decision === 'accepted' ? 'text-green-700' : 'text-red-700'
          }`}>
            {meeting.advocate_decision === 'accepted' 
              ? '✓ Advocate accepted your case' 
              : '✗ Advocate declined to take the case'}
          </p>
          {meeting.decision_notes && (
            <p className="text-sm mt-2 text-slate-700">{meeting.decision_notes}</p>
          )}
        </div>
      )}

      {meeting.status === 'scheduled' && meeting.meeting_link && (
        <Button 
          onClick={() => window.open(meeting.meeting_link, '_blank')} 
          className="w-full bg-violet-600 hover:bg-violet-700 mt-4"
        >
          Join Meeting
        </Button>
      )}
    </Card>
  );

  return (
    <div className="p-6 space-y-6" data-testid="meeting-requests-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Meeting Requests</h1>
        <p className="text-slate-600 mt-1">Track your meeting requests and scheduled meetings</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      ) : (
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted ({acceptedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="meetings">
              Meetings ({meetings.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Pending Requests</h3>
                <p className="text-slate-500">You don't have any pending meeting requests</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingRequests.map(req => <RequestCard key={req.id} request={req} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            {acceptedRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <CheckCircle className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Accepted Requests</h3>
                <p className="text-slate-500">No advocate has accepted your requests yet</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {acceptedRequests.map(req => <RequestCard key={req.id} request={req} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="meetings" className="mt-6">
            {meetings.length === 0 ? (
              <Card className="p-12 text-center">
                <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Scheduled Meetings</h3>
                <p className="text-slate-500">You don't have any scheduled meetings</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {meetings.map(meeting => <MeetingCard key={meeting.id} meeting={meeting} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejectedRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <XCircle className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No Rejected Requests</h3>
                <p className="text-slate-500">None of your requests have been rejected</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rejectedRequests.map(req => <RequestCard key={req.id} request={req} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MeetingRequests;
