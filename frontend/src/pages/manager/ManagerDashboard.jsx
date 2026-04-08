import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { adminAPI, advocateAPI } from '../../../services/api';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Scale, Users, Briefcase, TrendingUp, CheckCircle, XCircle, Clock, Loader2, BarChart3 } from 'lucide-react';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsResponse, advocatesResponse] = await Promise.all([
        adminAPI.getStats(),
        advocateAPI.list()
      ]);
      setStats(statsResponse.data);
      setAdvocates(advocatesResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdvocateStatus = async (advocateId, status) => {
    try {
      await advocateAPI.updateStatus(advocateId, status);
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const pendingAdvocates = advocates.filter(a => a.status === 'pending_approval');
  const approvedAdvocates = advocates.filter(a => a.status === 'approved');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">Platform Manager</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats?.users?.clients || 0} Clients, {stats?.users?.advocates || 0} Advocates
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.cases?.total || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-orange-600" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats?.cases?.active || 0} Active, {stats?.cases?.closed || 0} Closed
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.advocates?.pending || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved Advocates</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.advocates?.approved || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Distribution Chart */}
        {stats?.cases?.by_type && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Case Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.cases.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.cases.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advocates Management Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" data-testid="pending-tab">
              Pending Approval ({pendingAdvocates.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="approved-tab">
              Approved Advocates ({approvedAdvocates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Advocate Approvals</CardTitle>
                <CardDescription>Review and approve advocate registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAdvocates.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
                    <p className="text-gray-600">All advocate profiles have been reviewed</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAdvocates.map((advocate) => (
                      <div key={advocate.id} className="border border-gray-200 rounded-lg p-4" data-testid={`pending-advocate-${advocate.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{advocate.user?.full_name || 'Advocate'}</h3>
                            <p className="text-sm text-gray-600 mb-2">{advocate.user?.email}</p>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-700 mb-2">
                              <span>🏗️ {advocate.location}</span>
                              <span>💼 {advocate.experience_years} years</span>
                              <span>🎯 Bar ID: {advocate.bar_council_id}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {advocate.specialization?.map(spec => (
                                <Badge key={spec} variant="outline" className="text-xs">
                                  {spec.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                            {advocate.bio && (
                              <p className="text-sm text-gray-600 mt-2">{advocate.bio}</p>
                            )}
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateAdvocateStatus(advocate.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`approve-${advocate.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateAdvocateStatus(advocate.id, 'rejected')}
                              data-testid={`reject-${advocate.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Approved Advocates</CardTitle>
                <CardDescription>Active advocates on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvedAdvocates.map((advocate) => (
                    <div key={advocate.id} className="border border-gray-200 rounded-lg p-4" data-testid={`approved-advocate-${advocate.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{advocate.user?.full_name || 'Advocate'}</h3>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{advocate.user?.email}</p>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                            <span>🏗️ {advocate.location}</span>
                            <span>⭐ {advocate.rating || 0}/5</span>
                            <span>💼 {advocate.total_cases || 0} cases</span>
                            <span className="text-blue-600">🔄 {advocate.active_cases || 0} active</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateAdvocateStatus(advocate.id, 'suspended')}
                        >
                          Suspend
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ManagerDashboard;
