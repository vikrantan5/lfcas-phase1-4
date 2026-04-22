import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Scale,
  Bell,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  TrendingUp,
  Download,
  MessageSquare,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const NewAdminDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
    const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(0);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsResponse, timelineResponse] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getTimelineAnalytics(7)
      ]);
      setStats(statsResponse.data);
      setTimelineData(timelineResponse.data);
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

  const handleReview = (advocate) => {
    setSelectedAdvocate(advocate);
    setReviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedAdvocate) return;
    
    try {
      setActionLoading(true);
      await adminAPI.approveAdvocate(selectedAdvocate.id);
      toast({
        title: "Success",
        description: `${selectedAdvocate.users?.full_name || 'Advocate'} has been approved!`,
      });
      setReviewModalOpen(false);
      loadData(); // Reload data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve advocate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAdvocate) return;
    
    try {
      setActionLoading(true);
      await adminAPI.rejectAdvocate(selectedAdvocate.id, "Application does not meet requirements");
      toast({
        title: "Rejected",
        description: `${selectedAdvocate.users?.full_name || 'Advocate'} has been rejected.`,
      });
      setReviewModalOpen(false);
      loadData(); // Reload data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject advocate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const downloadReport = async (type) => {
    try {
      let response;
      let filename;
      
      toast({
        title: "Downloading...",
        description: "Preparing your report",
      });

      switch(type) {
        case 'cases':
          response = await adminAPI.downloadCasesReport();
          filename = `cases_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'feedback':
          response = await adminAPI.downloadFeedbackReport();
          filename = `feedback_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'revenue':
          response = await adminAPI.downloadRevenueReport();
          filename = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          return;
      }

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Success",
        description: "Report downloaded successfully!",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

 // Prepare pie chart data - uses DB enum case_type keys so labels always match
  const CASE_TYPE_LABELS = {
    divorce: 'Divorce',
    child_custody: 'Child Custody',
    alimony: 'Alimony',
    domestic_violence: 'Domestic Violence',
    dowry: 'Dowry',
    property_dispute: 'Property Dispute',
    other: 'Other',
  };
  const CASE_TYPE_COLORS = {
    divorce: '#3B4FAE',
    child_custody: '#F9C74F',
    alimony: '#F94144',
    domestic_violence: '#7E57C2',
    dowry: '#F8961E',
    property_dispute: '#277DA1',
    other: '#43AA8B',
  };
  const byType = stats?.cases?.by_type || {};
  const pieChartData = Object.keys(CASE_TYPE_LABELS)
    .map((key) => ({
      name: CASE_TYPE_LABELS[key],
      value: byType[key] || 0,
      color: CASE_TYPE_COLORS[key],
    }))
    .filter((d) => d.value > 0);

  const totalCases = pieChartData.reduce((sum, item) => sum + item.value, 0);

  // Prepare line chart data
  const lineChartData = timelineData?.timeline?.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Cases: day.cases,
    Hearings: day.hearings,
    Clients: day.clients
  })) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#3B4FAE] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <Scale className="w-6 h-6 text-[#3B4FAE]" />
              </div>
              <div>
                <h1 className="text-xl font-bold">LFCAS</h1>
                <p className="text-xs opacity-90">Admin Dashboard</p>
              </div>
            </div>

            {/* Right side - Notifications and User */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <Bell className="w-6 h-6 cursor-pointer hover:opacity-80" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    {notifications}
                  </span>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                                   onClick={() => navigate('/manager/advocates')}
                  className="bg-white text-[#3B4FAE] border-white hover:bg-gray-100"
                  data-testid="view-all-advocates-btn"
                >
                  <User className="w-4 h-4 mr-2" />
                  View All Advocates
                </Button>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#3B4FAE]" />
                </div>
                <span className="font-medium">Admin</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout}
                  className="bg-white text-[#3B4FAE] border-white hover:bg-gray-100"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Pending Approvals - Yellow */}
          <Card className="bg-[#F9C74F] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-white" />
                <p className="text-sm font-medium text-gray-800 mb-2">Pending Approvals</p>
                <p className="text-4xl font-bold text-white">{stats?.advocates?.pending || 0}</p>
                <p className="text-xs text-gray-700 mt-2">Advocates awaiting review</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Cases - Blue */}
          <Card className="bg-[#3B4FAE] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-white" />
                <p className="text-sm font-medium text-gray-200 mb-2">Total Cases</p>
                <p className="text-4xl font-bold text-white">{stats?.cases?.total || 0}</p>
                <p className="text-xs text-gray-200 mt-2">{stats?.cases?.active || 0} active cases</p>
              </div>
            </CardContent>
          </Card>

          {/* Revenue - Green */}
          <Card className="bg-[#43AA8B] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-white" />
                <p className="text-sm font-medium text-gray-200 mb-2">Total Users</p>
                <p className="text-4xl font-bold text-white">{stats?.users?.total || 0}</p>
                <p className="text-xs text-gray-200 mt-2">{stats?.users?.clients || 0} clients</p>
              </div>
            </CardContent>
          </Card>

          {/* Platform Activity - Red */}
          <Card className="bg-[#F94144] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-white" />
                <p className="text-sm font-medium text-gray-200 mb-2">Active Hearings</p>
                <p className="text-4xl font-bold text-white">{stats?.hearings?.upcoming || 0}</p>
                <p className="text-xs text-gray-200 mt-2">Scheduled hearings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Advocate Status Breakdown */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Advocate Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {/* Pending */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-6 h-6 text-[#F9C74F]" />
                      <span className="text-sm font-medium text-gray-700">Pending</span>
                    </div>
                    <p className="text-3xl font-bold text-[#F9C74F]">{stats?.advocates?.pending || 0}</p>
                  </div>

                  {/* Approved */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-6 h-6 text-[#43AA8B]" />
                      <span className="text-sm font-medium text-gray-700">Approved</span>
                    </div>
                    <p className="text-3xl font-bold text-[#43AA8B]">{stats?.advocates?.approved || 0}</p>
                  </div>

                  {/* Rejected */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-2">
                      <XCircle className="w-6 h-6 text-[#F94144]" />
                      <span className="text-sm font-medium text-gray-700">Rejected</span>
                    </div>
                    <p className="text-3xl font-bold text-[#F94144]">{stats?.advocates?.rejected || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications Pending Review */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Applications Pending Review</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.advocates?.pending_list && stats.advocates.pending_list.length > 0 ? (
                    stats.advocates.pending_list.slice(0, 3).map((advocate) => (
                      <div key={advocate.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{advocate.users?.full_name || advocate.user?.full_name || 'N/A'}</p>
                            <p className="text-xs text-gray-600">
                              {advocate.specializations?.[0] ? formatCaseType(advocate.specializations[0]) : 'Law'}, {advocate.location || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-[#3B4FAE] hover:bg-[#2E3D8F] text-white"
                          onClick={() => handleReview(advocate)}
                          data-testid={`review-advocate-${advocate.id}`}
                        >
                          Review
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No pending applications</p>
                  )}
                </div>
              </CardContent>
            </Card>


                        {/* Recent Client Ratings */}
            <Card className="shadow-md" data-testid="recent-ratings-card">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Recent Client Ratings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.ratings?.recent && stats.ratings.recent.length > 0 ? (
                    stats.ratings.recent.slice(0, 5).map((r, idx) => (
                      <div key={r.id || idx} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0" data-testid={`recent-rating-${idx}`}>
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} style={{ color: i < (r.rating || 0) ? '#F9C74F' : '#d1d5db', fontSize: 14 }}>★</span>
                            ))}
                            <span className="text-xs text-gray-500 ml-2">{r.rating}/5</span>
                          </div>
                          {r.review && <p className="text-sm text-gray-700 line-clamp-2">{r.review}</p>}
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">{r.client_name || 'Client'}</span> → {r.advocate_name || 'Advocate'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No ratings yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Alerts */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">System Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.hearings?.upcoming_list && stats.hearings.upcoming_list.length > 0 ? (
                    stats.hearings.upcoming_list.slice(0, 3).map((hearing, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#F94144] rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">
                          Hearing scheduled for Case #{hearing.case_id?.slice(0, 8)} on {formatDate(hearing.hearing_date)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No alerts</p>
                  )}
                  
                  {stats?.meeting_requests?.pending > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#3B4FAE] rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">
                        {stats.meeting_requests.pending} meeting requests pending
                      </p>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 text-[#3B4FAE] border-[#3B4FAE]"
                >
                  View All
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Case Statistics Pie Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Case Statistics by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {totalCases > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          iconType="square"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No case data available</p>
                )}
              </CardContent>
            </Card>

            {/* Timeline Chart - NEW */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Activity Timeline (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {lineChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Cases" stroke="#3B4FAE" strokeWidth={2} />
                        <Line type="monotone" dataKey="Hearings" stroke="#F9C74F" strokeWidth={2} />
                        <Line type="monotone" dataKey="Clients" stroke="#43AA8B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No timeline data available</p>
                )}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.activity_log && stats.activity_log.length > 0 ? (
                    stats.activity_log.slice(0, 5).map((activity, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        {activity.icon === 'check' ? (
                          <CheckCircle className="w-5 h-5 text-[#43AA8B] mt-0.5" />
                        ) : activity.icon === 'case' ? (
                          <FileText className="w-5 h-5 text-[#3B4FAE] mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[#F94144] mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{activity.message}</p>
                          <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Reports */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Quick Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                      <Button 
                    variant="default" 
                    className="w-full justify-start bg-[#3B4FAE] text-white hover:bg-[#2f3f8e]"
                    onClick={() => navigate('/manager/reports')}
                    data-testid="view-all-reports-btn"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View All Reports (Data Tables)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    onClick={() => downloadReport('cases')}
                    data-testid="download-cases-report"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Case Summaries
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    onClick={() => downloadReport('feedback')}
                    data-testid="download-feedback-report"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    User Feedback Reports
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                    onClick={() => downloadReport('revenue')}
                    data-testid="download-revenue-report"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Revenue Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Case Progress Overview - Timeline Style */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-[#3B4FAE] text-lg">Case Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between px-4 py-6">
              {/* Stage 1: Petition Filed */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-24 h-24 bg-[#43AA8B] rounded-lg flex flex-col items-center justify-center shadow-md mb-2">
                  <CheckCircle className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white font-medium">Petition Filed</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-2">{stats?.case_progress?.petition_filed || 0} Completed</p>
              </div>

              {/* Connecting Line */}
              <div className="flex items-center flex-1 px-4">
                <div className="w-full h-1 bg-[#F9C74F]"></div>
                <div className="w-3 h-3 bg-[#F9C74F] rounded-full -ml-1.5"></div>
              </div>

              {/* Stage 2: Hearing Scheduled */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-24 h-24 bg-[#F9C74F] rounded-lg flex flex-col items-center justify-center shadow-md mb-2">
                  <Calendar className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white font-medium text-center">Hearing Scheduled</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-2">{stats?.case_progress?.hearing_scheduled || 0} Upcoming</p>
              </div>

              {/* Connecting Line */}
              <div className="flex items-center flex-1 px-4">
                <div className="w-full h-1 bg-[#F94144]"></div>
                <div className="w-3 h-3 bg-[#F94144] rounded-full -ml-1.5"></div>
              </div>

              {/* Stage 3: Final Judgment */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-24 h-24 bg-[#F94144] rounded-lg flex flex-col items-center justify-center shadow-md mb-2">
                  <AlertCircle className="w-8 h-8 text-white mb-1" />
                  <span className="text-xs text-white font-medium text-center">Final Judgment</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-2">{stats?.case_progress?.judgment_pending || 0} Pending</p>
              </div>

              {/* End Marker */}
              <div className="flex items-center pl-4">
                <div className="w-3 h-3 bg-[#3B4FAE] rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Advocate Application</DialogTitle>
            <DialogDescription>
              Review the advocate's application and decide to approve or reject.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAdvocate && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-base">{selectedAdvocate.users?.full_name || selectedAdvocate.user?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Bar Council ID</p>
                <p className="text-base">{selectedAdvocate.bar_council_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Experience</p>
                <p className="text-base">{selectedAdvocate.experience_years || 0} years</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Location</p>
                <p className="text-base">{selectedAdvocate.location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Specializations</p>
                <p className="text-base">
                  {selectedAdvocate.specializations?.map(s => formatCaseType(s)).join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading}
              data-testid="reject-advocate-confirm"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-[#43AA8B] hover:bg-[#368F75]"
              data-testid="approve-advocate-confirm"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewAdminDashboard;
