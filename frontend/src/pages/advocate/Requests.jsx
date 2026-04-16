import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { meetingRequestAPI, meetingAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { FileText, Check, X, Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const Requests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  
  // Response Dialog State
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseAction, setResponseAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Schedule Meeting Dialog State
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [meetingData, setMeetingData] = useState({
    scheduled_date: '',
    meeting_mode: 'online',
    meeting_link: '',
    meeting_location: '',
    notes: ''
  });

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : {};
      const response = await meetingRequestAPI.list(params);
      setRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondClick = (request, action) => {
    setSelectedRequest(request);
    setResponseAction(action);
    setShowResponseDialog(true);
  };

  const handleRespondSubmit = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      await meetingRequestAPI.respond(selectedRequest.id, {
        action: responseAction,
        rejection_reason: responseAction === 'reject' ? rejectionReason : null
      });
      
      toast({
        title: "Success",
        description: `Meeting request ${responseAction}ed successfully`
      });
      
      setShowResponseDialog(false);
      setRejectionReason('');
      
      if (responseAction === 'accept') {
        setSelectedRequest(selectedRequest);
        setShowScheduleDialog(true);
      } else {
        loadRequests();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to respond to request',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      await meetingAPI.schedule({
        meeting_request_id: selectedRequest.id,
        ...meetingData
      });
      
      toast({
        title: "Success",
        description: "Meeting scheduled successfully"
      });
      
      setShowScheduleDialog(false);
      setMeetingData({
        scheduled_date: '',
        meeting_mode: 'online',
        meeting_link: '',
        meeting_location: '',
        notes: ''
      });
      loadRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || 'Failed to schedule meeting',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#FFF8E1', color: '#F57C00', text: 'Pending' },
      accepted: { bg: '#E8F5E9', color: '#2E7D32', text: 'Accepted' },
      rejected: { bg: '#FFEBEE', color: '#C62828', text: 'Rejected' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: badge.bg,
        color: badge.color
      }}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="adv-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="dash-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="dash-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>Meeting Requests</h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Manage client meeting requests</p>
              </div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid #E0E0E0',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Requests</option>
              </select>
            </div>
          </div>

          {/* Requests List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 className="animate-spin" size={48} color="#724AE3" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="dash-card" style={{ textAlign: 'center', padding: 60 }}>
              <FileText size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>No Requests Found</h3>
              <p style={{ color: '#888', fontSize: 14 }}>You don't have any meeting requests with this status.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {requests.map((req) => (
                <div key={req.id} className="dash-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                          {req.client?.full_name || 'Client'}
                        </h3>
                        {getStatusBadge(req.status)}
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                          <FileText size={14} />
                          <span>{req.case_type ? req.case_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}</span>
                        </div>
                        {req.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                            <MapPin size={14} />
                            <span>{req.location}</span>
                          </div>
                        )}
                        {req.preferred_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                            <Calendar size={14} />
                            <span>Preferred: {new Date(req.preferred_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: 0 }}>
                        {req.description}
                      </p>
                    </div>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                        <button
                          onClick={() => handleRespondClick(req, 'accept')}
                          style={{
                            padding: '8px 16px',
                            background: '#18B057',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Check size={16} /> Accept
                        </button>
                        <button
                          onClick={() => handleRespondClick(req, 'reject')}
                          style={{
                            padding: '8px 16px',
                            background: '#F44336',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <X size={16} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                  {req.rejection_reason && (
                    <div style={{ marginTop: 12, padding: 12, background: '#FFEBEE', borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: '#C62828', margin: 0 }}>
                        <strong>Rejection Reason:</strong> {req.rejection_reason}
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F0F0', fontSize: 12, color: '#999' }}>
                    Requested on {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{responseAction === 'accept' ? 'Accept' : 'Reject'} Meeting Request</DialogTitle>
            <DialogDescription>
              {responseAction === 'accept' 
                ? 'Accepting this request will allow you to schedule a meeting.' 
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>
          {responseAction === 'reject' && (
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why you're rejecting this request..."
                rows={4}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleRespondSubmit} disabled={processing || (responseAction === 'reject' && !rejectionReason)}>
              {processing ? <Loader2 className="animate-spin" size={16} /> : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Set up a meeting with {selectedRequest?.client?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <Label>Meeting Date & Time</Label>
              <Input
                type="datetime-local"
                value={meetingData.scheduled_date}
                onChange={(e) => setMeetingData({ ...meetingData, scheduled_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Meeting Mode</Label>
              <select
                value={meetingData.meeting_mode}
                onChange={(e) => setMeetingData({ ...meetingData, meeting_mode: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #E0E0E0',
                  fontSize: 14
                }}
              >
                <option value="online">Online</option>
                <option value="in_person">In Person</option>
              </select>
            </div>
            {meetingData.meeting_mode === 'online' && (
              <div>
                <Label>Meeting Link</Label>
                <Input
                  value={meetingData.meeting_link}
                  onChange={(e) => setMeetingData({ ...meetingData, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}
            {meetingData.meeting_mode === 'in_person' && (
              <div>
                <Label>Meeting Location</Label>
                <Input
                  value={meetingData.meeting_location}
                  onChange={(e) => setMeetingData({ ...meetingData, meeting_location: e.target.value })}
                  placeholder="Office address or location"
                />
              </div>
            )}
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={meetingData.notes}
                onChange={(e) => setMeetingData({ ...meetingData, notes: e.target.value })}
                placeholder="Any additional notes for the meeting..."
                rows={3}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleScheduleMeeting} disabled={processing || !meetingData.scheduled_date}>
              {processing ? <Loader2 className="animate-spin" size={16} /> : 'Schedule Meeting'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Requests;