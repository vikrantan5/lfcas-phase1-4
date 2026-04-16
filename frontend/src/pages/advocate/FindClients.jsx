import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { meetingRequestAPI, caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Users, Search, Filter, MapPin, Calendar, Briefcase, Clock, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const FindClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCaseType, setFilterCaseType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responding, setResponding] = useState(false);
  const [responseAction, setResponseAction] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadMeetingRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [meetingRequests, searchQuery, filterStatus, filterCaseType]);

  const loadMeetingRequests = async () => {
    try {
      setLoading(true);
      const response = await meetingRequestAPI.list();
      setMeetingRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load meeting requests:', error);
      toast({
        title: "Error",
        description: "Failed to load client requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...meetingRequests];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Filter by case type
    if (filterCaseType !== 'all') {
      filtered = filtered.filter(req => req.case_type === filterCaseType);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(req => {
        const clientName = req.client?.full_name?.toLowerCase() || '';
        const description = req.description?.toLowerCase() || '';
        const location = req.location?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return clientName.includes(query) || description.includes(query) || location.includes(query);
      });
    }

    setFilteredRequests(filtered);
  };

  const handleRespondToRequest = async () => {
    if (!selectedRequest || !responseAction) return;
    setResponding(true);
    try {
      await meetingRequestAPI.respond(selectedRequest.id, {
        action: responseAction,
        rejection_reason: responseAction === 'reject' ? rejectionReason : undefined
      });
      toast({
        title: `Request ${responseAction === 'accept' ? 'Accepted' : 'Rejected'}`,
        description: `Meeting request has been ${responseAction}ed successfully.`
      });
      setSelectedRequest(null);
      setResponseAction('');
      setRejectionReason('');
      await loadMeetingRequests();
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error.response?.data?.detail || "Failed to process request.",
        variant: "destructive"
      });
    } finally {
      setResponding(false);
    }
  };

  const formatCaseType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'accepted': return <CheckCircle size={14} />;
      case 'rejected': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getCaseTypeColor = (type) => {
    switch (type) {
      case 'divorce': return 'bg-purple-100 text-purple-800';
      case 'alimony': return 'bg-blue-100 text-blue-800';
      case 'child_custody': return 'bg-pink-100 text-pink-800';
      case 'dowry': return 'bg-orange-100 text-orange-800';
      case 'domestic_violence': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = meetingRequests.filter(r => r.status === 'pending').length;
  const acceptedCount = meetingRequests.filter(r => r.status === 'accepted').length;
  const rejectedCount = meetingRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="advocate-dashboard" data-testid="find-clients-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="adv-content" style={{ padding: '24px 28px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #815DF5, #6B45E0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  Find New Clients
                </h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                  Browse and respond to client meeting requests
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Pending Requests</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{pendingCount}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} color="#F59E0B" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Accepted</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>{acceptedCount}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={24} color="#10B981" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Rejected</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{rejectedCount}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={24} color="#EF4444" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                <div>
                  <Label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Search</Label>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <Input
                      placeholder="Search by client, location, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                <div>
                  <Label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Case Type</Label>
                  <Select value={filterCaseType} onValueChange={setFilterCaseType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Case Types</SelectItem>
                      <SelectItem value="divorce">Divorce</SelectItem>
                      <SelectItem value="alimony">Alimony</SelectItem>
                      <SelectItem value="child_custody">Child Custody</SelectItem>
                      <SelectItem value="dowry">Dowry</SelectItem>
                      <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Requests List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#815DF5' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading client requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent style={{ padding: 60, textAlign: 'center' }}>
                <Users size={64} color="#E0E0E0" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#333', marginBottom: 8 }}>No Requests Found</h3>
                <p style={{ color: '#888' }}>There are no client meeting requests matching your filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {filteredRequests.map((request) => (
                <Card key={request.id} className="dash-card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setSelectedRequest(request)}>
                  <CardContent style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
                      {/* Left Content */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #815DF5, #6B45E0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 600
                          }}>
                            {request.client?.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A0A3E', marginBottom: 2 }}>
                              {request.client?.full_name || 'Client'}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MapPin size={14} color="#888" />
                              <span style={{ fontSize: 13, color: '#888' }}>{request.location || 'Location not specified'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <Badge className={getCaseTypeColor(request.case_type)} style={{ marginRight: 8 }}>
                            <Briefcase size={12} style={{ marginRight: 4 }} />
                            {formatCaseType(request.case_type)}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusIcon(request.status)}
                            <span style={{ marginLeft: 4 }}>{request.status?.toUpperCase()}</span>
                          </Badge>
                        </div>

                        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 12 }}>
                          {request.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#888' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} />
                            <span>Requested: {formatDate(request.created_at)}</span>
                          </div>
                          {request.preferred_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Clock size={14} />
                              <span>Preferred: {formatDate(request.preferred_date)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                                setResponseAction('accept');
                              }}
                              style={{ background: '#10B981', color: '#fff', borderRadius: 8 }}
                            >
                              <CheckCircle size={14} style={{ marginRight: 6 }} />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                                setResponseAction('reject');
                              }}
                              style={{ borderColor: '#EF4444', color: '#EF4444' }}
                            >
                              <XCircle size={14} style={{ marginRight: 6 }} />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                          }}
                        >
                          View Details
                          <ChevronRight size={14} style={{ marginLeft: 4 }} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request Details & Response Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setResponseAction('');
        setRejectionReason('');
      }}>
        <DialogContent style={{ maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>
              {responseAction ? `${responseAction === 'accept' ? 'Accept' : 'Reject'} Meeting Request` : 'Request Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.client?.full_name} - {formatCaseType(selectedRequest?.case_type)}
            </DialogDescription>
          </DialogHeader>

          {!responseAction ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <Label>Client</Label>
                <p style={{ fontSize: 14, marginTop: 4 }}>{selectedRequest?.client?.full_name}</p>
                <p style={{ fontSize: 13, color: '#888' }}>{selectedRequest?.client?.email}</p>
              </div>

              <div>
                <Label>Case Type</Label>
                <Badge className={getCaseTypeColor(selectedRequest?.case_type)} style={{ marginTop: 4 }}>
                  {formatCaseType(selectedRequest?.case_type)}
                </Badge>
              </div>

              <div>
                <Label>Location</Label>
                <p style={{ fontSize: 14, marginTop: 4 }}>{selectedRequest?.location || 'Not specified'}</p>
              </div>

              <div>
                <Label>Description</Label>
                <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.6 }}>{selectedRequest?.description}</p>
              </div>

              {selectedRequest?.preferred_date && (
                <div>
                  <Label>Preferred Meeting Date</Label>
                  <p style={{ fontSize: 14, marginTop: 4 }}>{formatDate(selectedRequest?.preferred_date)}</p>
                </div>
              )}

              {selectedRequest?.ai_analysis && (
                <div>
                  <Label>AI Analysis</Label>
                  <div style={{ background: '#F8F5FF', padding: 12, borderRadius: 8, marginTop: 4 }}>
                    <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                      {selectedRequest.ai_analysis.summary || 'AI analysis available'}
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest?.status === 'pending' && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <Button
                    className="flex-1"
                    onClick={() => setResponseAction('accept')}
                    style={{ background: '#10B981', color: '#fff' }}
                  >
                    <CheckCircle size={16} style={{ marginRight: 6 }} />
                    Accept Request
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setResponseAction('reject')}
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                  >
                    <XCircle size={16} style={{ marginRight: 6 }} />
                    Reject Request
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {responseAction === 'reject' && (
                <div>
                  <Label>Reason for Rejection *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why you're rejecting this request..."
                    rows={4}
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}

              {responseAction === 'accept' && (
                <div style={{ background: '#D1FAE5', padding: 12, borderRadius: 8 }}>
                  <p style={{ fontSize: 13, color: '#065F46' }}>
                    After accepting, you'll be able to schedule a meeting with the client.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResponseAction('');
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespondToRequest}
                  disabled={responding || (responseAction === 'reject' && !rejectionReason)}
                  style={{
                    background: responseAction === 'accept' ? '#10B981' : '#EF4444',
                    color: '#fff'
                  }}
                >
                  {responding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Confirm ${responseAction === 'accept' ? 'Accept' : 'Reject'}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindClients;