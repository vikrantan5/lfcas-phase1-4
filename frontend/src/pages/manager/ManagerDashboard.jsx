import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI, advocateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
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

const NewAdminDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    loadData();
    // Check for notifications
    setNotifications(2); // Placeholder
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const statsResponse = await adminAPI.getStats();
      setStats(statsResponse.data);
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
    // Navigate to review page or open modal
    toast({
      title: "Review",
      description: `Opening review for ${advocate.user?.full_name}`,
    });
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

  // Prepare pie chart data
  const pieChartData = stats?.cases?.by_type ? [
    { name: 'Divorce', value: stats.cases.by_type.divorce || 0, color: '#3B4FAE' },
    { name: 'Custody', value: stats.cases.by_type.child_custody || 0, color: '#F9C74F' },
    { name: 'Alimony', value: stats.cases.by_type.alimony || 0, color: '#F94144' },
    { name: 'Other', value: (stats.cases.by_type.domestic_violence || 0) + (stats.cases.by_type.dowry || 0) + (stats.cases.by_type.other || 0), color: '#43AA8B' }
  ] : [];

  const totalCases = pieChartData.reduce((sum, item) => sum + item.value, 0);

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
                <p className="text-sm font-medium text-gray-800 mb-2">Pending Approvals</p>
                <p className="text-5xl font-bold text-[#3B4FAE]">{stats?.advocates?.pending || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Active Cases - Blue */}
          <Card className="bg-[#3B4FAE] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-white mb-2">Total Active Cases</p>
                <p className="text-5xl font-bold text-white">{stats?.cases?.active || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Hearings - Red */}
          <Card className="bg-[#F94144] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-white mb-2">Upcoming Hearings</p>
                <p className="text-5xl font-bold text-white">{stats?.hearings?.upcoming || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* New User Registrations - Green */}
          <Card className="bg-[#43AA8B] border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-white mb-2">New User Registrations</p>
                <p className="text-5xl font-bold text-white">{stats?.users?.new_registrations || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Advocate Verification */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Advocate Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-around items-center">
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
                  {stats?.advocates?.pending_list?.slice(0, 3).map((advocate) => (
                    <div key={advocate.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{advocate.user?.full_name || 'N/A'}</p>
                          <p className="text-xs text-gray-600">
                            {advocate.specializations?.[0] ? formatCaseType(advocate.specializations[0]) : 'Law'}, {advocate.location}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-[#3B4FAE] hover:bg-[#2E3D8F] text-white"
                        onClick={() => handleReview(advocate)}
                      >
                        Review
                      </Button>
                    </div>
                  )) || <p className="text-center text-gray-500 py-4">No pending applications</p>}
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
                  {stats?.hearings?.upcoming_list?.slice(0, 3).map((hearing, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#F94144] rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">
                        Hearing scheduled for Case #{hearing.case_id?.slice(0, 8)} on {formatDate(hearing.hearing_date)}
                      </p>
                    </div>
                  )) || <p className="text-center text-gray-500 py-4">No alerts</p>}
                  
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
                <CardTitle className="text-[#3B4FAE] text-lg">Case Statistics</CardTitle>
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

            {/* Activity Log */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-[#3B4FAE] text-lg">Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.activity_log?.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      {activity.icon === 'check' ? (
                        <CheckCircle className="w-5 h-5 text-[#43AA8B] mt-0.5" />
                      ) : activity.icon === 'case' ? (
                        <CheckCircle className="w-5 h-5 text-[#3B4FAE] mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#F94144] mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{activity.message}</p>
                        <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                  )) || <p className="text-center text-gray-500 py-4">No recent activity</p>}
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
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Case Summaries
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    User Feedback Reports
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-50"
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
    </div>
  );
};

export default NewAdminDashboard;
