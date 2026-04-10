import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI, advocateAPI, hearingAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Scale, Briefcase, Clock, Star, Bell, Loader2, Calendar, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdvocateDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load advocate profile
      const advocatesResponse = await advocateAPI.list();
      const myProfile = advocatesResponse.data.find(adv => adv.user_id === user.id);
      
      if (myProfile) {
        setProfile(myProfile);
        // Load assigned cases
        const casesResponse = await caseAPI.list();
        setCases(casesResponse.data);
      } else {
        setShowProfileSetup(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      hearing_scheduled: 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showProfileSetup && !profile) {
    return <ProfileSetupForm onSuccess={loadData} />;
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
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-xs text-gray-500">{profile?.rating || 0}/5</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Status Banner */}
        {profile?.status === 'pending_approval' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-900">Profile Under Review</h3>
                <p className="text-sm text-yellow-700">Your profile is being reviewed by the platform manager. You'll be notified once approved.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.total_cases || 0}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.active_cases || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.rating || 0}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Experience</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.experience_years || 0}y</p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Cases</CardTitle>
            <CardDescription>Manage your client cases</CardDescription>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cases assigned yet</h3>
                <p className="text-gray-600">Cases will appear here once clients assign them to you</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((case_) => (
                  <div
                    key={case_.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`/advocate/cases/${case_.id}`)}
                    data-testid={`case-item-${case_.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{case_.title}</h3>
                          <Badge className={getStatusColor(case_.status)}>
                            {case_.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{case_.description.substring(0, 150)}...</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {case_.client?.full_name || 'Client'}
                          </span>
                          <span>📍 {case_.location}</span>
                          <span>📅 {new Date(case_.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Profile Setup Form
const ProfileSetupForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    bar_council_id: '',
    specialization: [],
    experience_years: 0,
    location: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await advocateAPI.createProfile(formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialization = (type) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(type)
        ? prev.specialization.filter(t => t !== type)
        : [...prev.specialization, type]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Complete Your Advocate Profile</CardTitle>
          <CardDescription>Provide your professional details to start receiving cases</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Bar Council ID</Label>
              <Input
                placeholder="Your Bar Council registration ID"
                value={formData.bar_council_id}
                onChange={(e) => setFormData({...formData, bar_council_id: e.target.value})}
                required
                data-testid="bar-council-id-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Specialization (Select multiple)</Label>
              <div className="grid grid-cols-2 gap-2">
                {['divorce', 'alimony', 'child_custody', 'dowry', 'domestic_violence'].map(type => (
                  <label key={type} className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.specialization.includes(type)}
                      onChange={() => toggleSpecialization(type)}
                    />
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                min="0"
                value={formData.experience_years}
                onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value)})}
                required
                data-testid="experience-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="City, State"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
                data-testid="location-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                placeholder="Brief professional bio..."
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={4}
                data-testid="bio-input"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" data-testid="submit-profile-button">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Profile...</>
              ) : (
                'Create Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvocateDashboard;
