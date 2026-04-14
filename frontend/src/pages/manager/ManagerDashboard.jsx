import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI, advocateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Scale, Users, Briefcase, TrendingUp, CheckCircle, XCircle, Clock, Loader2, BarChart3, UserCheck, Calendar, AlertCircle, Shield, Award, FileText } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState(null);
  const [advocates, setAdvocates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Advocate Review State
  const [reviewingAdvocate, setReviewingAdvocate] = useState(null);
  const [reviewAction, setReviewAction] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, advocatesResponse, logsResponse] = await Promise.all([
        adminAPI.getStats(),
        advocateAPI.list(),
        adminAPI.getLogs({ limit: 50 }).catch(() => ({ data: [] }))
      ]);
      setStats(statsResponse.data);
      setAdvocates(advocatesResponse.data);
      setLogs(logsResponse.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load dashboard data. Please refresh.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdvocateStatus = async (advocateId, newStatus) => {
    setProcessing(true);
    
    try {
      await advocateAPI.updateStatus(advocateId, newStatus);
      
      toast({
        title: `Advocate ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The advocate profile has been ${newStatus}.`,
      });
      
      setReviewingAdvocate(null);
      setReviewAction('');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Failed to update advocate status.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
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

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      suspended: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const pendingAdvocates = advocates.filter(a => a.status === 'pending_approval');
  const approvedAdvocates = advocates.filter(a => a.status === 'approved');
  const rejectedAdvocates = advocates.filter(a => a.status === 'rejected');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="manager-dashboard">
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
                <p className="text-xs text-gray-500">Platform Manager</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
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

      {/* Alert for Pending Approvals */}
      {pendingAdvocates.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                {pendingAdvocates.length} advocate{pendingAdvocates.length !== 1 ? 's' : ''} pending approval
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.users?.clients || 0} clients • {stats?.users?.advocates || 0} advocates
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.advocates?.pending || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.advocates?.approved || 0} approved total
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.cases?.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.cases?.active || 0} active • {stats?.cases?.closed || 0} closed
                  </p>
                </div>
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Meetings</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.meetings?.total || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.meeting_requests?.pending || 0} requests pending
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Type Distribution */}
        {stats?.cases?.by_type && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Case Distribution by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(stats.cases.by_type).map(([type, count]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatCaseType(type)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" data-testid="tab-pending">
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingAdvocates.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved ({approvedAdvocates.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <FileText className="w-4 h-4 mr-2" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          {/* Pending Advocates Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingAdvocates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Approvals</h3>
                  <p className="text-gray-600">All advocate applications have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              pendingAdvocates.map((advocate) => (
                <Card key={advocate.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2">
                          {advocate.user?.full_name || 'N/A'}
                          <Badge className={getStatusColor(advocate.status)}>
                            {advocate.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {advocate.user?.email} • {advocate.user?.phone || 'No phone'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Bar Council ID</p>
                          <p className="text-sm text-gray-900">{advocate.bar_council_id}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Location</p>
                          <p className="text-sm text-gray-900">{advocate.location}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Experience</p>
                          <p className="text-sm text-gray-900">{advocate.experience_years} years</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Specialization</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {advocate.specialization?.map((spec, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {formatCaseType(spec)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {advocate.bio && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Bio</p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{advocate.bio}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-4 h-4" />
                        Applied on {formatDate(advocate.created_at)}
                      </div>

                      <div className="flex gap-3 pt-2 border-t">
                        <Button
                          onClick={() => {
                            setReviewingAdvocate(advocate);
                            setReviewAction('approved');
                          }}
                          className="flex-1"
                          data-testid={`approve-${advocate.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setReviewingAdvocate(advocate);
                            setReviewAction('rejected');
                          }}
                          className="flex-1"
                          data-testid={`reject-${advocate.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Approved Advocates Tab */}
          <TabsContent value="approved" className="space-y-4">
            {approvedAdvocates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Advocates</h3>
                  <p className="text-gray-600">Approved advocates will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedAdvocates.map((advocate) => (
                  <Card key={advocate.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1 flex items-center gap-2">
                            {advocate.user?.full_name || 'N/A'}
                            <Badge className={getStatusColor(advocate.status)}>
                              {advocate.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {advocate.location} • {advocate.experience_years}y exp
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Rating</span>
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-yellow-600" />
                            <span className="font-semibold">{advocate.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total Cases</span>
                          <span className="font-semibold">{advocate.total_cases || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Active Cases</span>
                          <span className="font-semibold">{advocate.active_cases || 0}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-2 border-t">
                          {advocate.specialization?.slice(0, 3).map((spec, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {formatCaseType(spec)}
                            </Badge>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setReviewingAdvocate(advocate);
                            setReviewAction('suspended');
                          }}
                        >
                          Suspend Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Cases */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Cases</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.recent_cases?.slice(0, 5).map((caseItem) => (
                      <div key={caseItem.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{caseItem.title}</p>
                          <p className="text-xs text-gray-500">{formatCaseType(caseItem.case_type)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {caseItem.current_stage || caseItem.status}
                        </Badge>
                      </div>
                    )) || <p className="text-sm text-gray-500">No recent cases</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Meetings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Meetings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.recent_meetings?.slice(0, 5).map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{meeting.meeting_mode}</p>
                          <p className="text-xs text-gray-500">{formatDate(meeting.scheduled_date)}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {meeting.status}
                        </Badge>
                      </div>
                    )) || <p className="text-sm text-gray-500">No recent meetings</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Platform Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats?.users?.total || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats?.cases?.total || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Total Cases</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{stats?.meetings?.total || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Meetings Held</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-yellow-600">{stats?.advocates?.approved || 0}</p>
                    <p className="text-sm text-gray-600 mt-1">Active Advocates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Admin Activity</CardTitle>
                <CardDescription>Track all administrative actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No activity logs available</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-3 py-3 border-b last:border-0">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-600">
                            {log.target_type} • {log.target_id?.slice(0, 8)}
                          </p>
                          {log.details && (
                            <p className="text-xs text-gray-500 mt-1">
                              {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Review Advocate Dialog */}
      <Dialog open={!!reviewingAdvocate} onOpenChange={() => {
        setReviewingAdvocate(null);
        setReviewAction('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' && 'Approve Advocate'}
              {reviewAction === 'rejected' && 'Reject Advocate'}
              {reviewAction === 'suspended' && 'Suspend Advocate'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approved' && `Approve ${reviewingAdvocate?.user?.full_name} to start accepting cases?`}
              {reviewAction === 'rejected' && `Reject ${reviewingAdvocate?.user?.full_name}'s application?`}
              {reviewAction === 'suspended' && `Suspend ${reviewingAdvocate?.user?.full_name}'s account?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewingAdvocate && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Name:</strong> {reviewingAdvocate.user?.full_name}</p>
                <p><strong>Email:</strong> {reviewingAdvocate.user?.email}</p>
                <p><strong>Bar Council ID:</strong> {reviewingAdvocate.bar_council_id}</p>
                <p><strong>Location:</strong> {reviewingAdvocate.location}</p>
                <p><strong>Experience:</strong> {reviewingAdvocate.experience_years} years</p>
                <div>
                  <strong>Specialization:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {reviewingAdvocate.specialization?.map((spec, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {formatCaseType(spec)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setReviewingAdvocate(null);
                  setReviewAction('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleUpdateAdvocateStatus(reviewingAdvocate.id, reviewAction)}
                disabled={processing}
                variant={reviewAction === 'approved' ? 'default' : 'destructive'}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${reviewAction === 'approved' ? 'Approval' : reviewAction === 'rejected' ? 'Rejection' : 'Suspension'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerDashboard;
