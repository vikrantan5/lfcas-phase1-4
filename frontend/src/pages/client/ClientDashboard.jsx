import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { caseAPI, aiAPI, advocateAPI } from '../../../services/api';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Scale, Plus, FileText, Users, Bell, MessageSquare, Loader2, Briefcase, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const response = await caseAPI.list();
      setCases(response.data);
    } catch (error) {
      console.error('Failed to load cases:', error);
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

  const formatCaseType = (type) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="client-dashboard">
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
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Cases</p>
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
                  <p className="text-sm text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {cases.filter(c => c.status !== 'closed').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Closed Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {cases.filter(c => c.status === 'closed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Messages</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <Button 
            onClick={() => setShowCreateCase(true)} 
            className="w-full md:w-auto"
            data-testid="create-case-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Case
          </Button>
        </div>

        {/* Cases List */}
        {showCreateCase ? (
          <CreateCaseForm 
            onClose={() => setShowCreateCase(false)} 
            onSuccess={() => {
              setShowCreateCase(false);
              loadCases();
            }} 
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>My Cases</CardTitle>
              <CardDescription>View and manage your legal cases</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No cases yet</h3>
                  <p className="text-gray-600 mb-4">Create your first case to get started with legal assistance</p>
                  <Button onClick={() => setShowCreateCase(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Case
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.map((case_) => (
                    <div
                      key={case_.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() => navigate(`/client/cases/${case_.id}`)}
                      data-testid={`case-item-${case_.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{case_.title}</h3>
                            <Badge className={getStatusColor(case_.status)}>
                              {case_.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">{formatCaseType(case_.case_type)}</Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{case_.description.substring(0, 150)}...</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📍 {case_.location}</span>
                            <span>📅 {new Date(case_.created_at).toLocaleDateString()}</span>
                            {case_.advocate && (
                              <span className="text-blue-600">⚖️ Advocate Assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

// Create Case Form Component
const CreateCaseForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    case_type: 'divorce',
    title: '',
    description: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!formData.description) {
      setError('Please provide case description for AI analysis');
      return;
    }

    setAnalyzing(true);
    setError('');
    try {
      const response = await aiAPI.analyze({
        case_type: formData.case_type,
        description: formData.description,
      });
      setAiAnalysis(response.data.data);
    } catch (err) {
      setError('AI analysis failed. You can still create the case.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await caseAPI.create(formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Case</CardTitle>
        <CardDescription>Provide details about your legal case</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Case Type</Label>
            <Select value={formData.case_type} onValueChange={(val) => setFormData({...formData, case_type: val})}>
              <SelectTrigger data-testid="case-type-select">
                <SelectValue />
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
          </div>

          <div className="space-y-2">
            <Label>Case Title</Label>
            <Input
              placeholder="Brief title for your case"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              data-testid="case-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Provide detailed description of your case..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={5}
              required
              data-testid="case-description-input"
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="City, State"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
              data-testid="case-location-input"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full"
            data-testid="analyze-button"
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing with AI...</>
            ) : (
              <>🤖 Get AI Legal Analysis</>
            )}
          </Button>

          {aiAnalysis && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-blue-900">AI Legal Analysis</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Legal Sections:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {aiAnalysis.legal_sections?.map((section, i) => (
                      <li key={i}>{section}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Required Documents:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {aiAnalysis.required_documents?.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1" data-testid="submit-case-button">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                'Create Case'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ClientDashboard;
