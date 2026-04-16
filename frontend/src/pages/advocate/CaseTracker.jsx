import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Search, MapPin, Filter, Briefcase, Calendar, Clock, User, 
  ChevronRight, Loader2, CheckCircle, AlertCircle, FileText,
  TrendingUp, BarChart3
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const CaseTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterCaseType, setFilterCaseType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    filterAndSortCases();
  }, [cases, searchQuery, filterStatus, filterStage, filterCaseType, sortBy]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await caseAPI.list();
      setCases(response.data || []);
    } catch (error) {
      console.error('Failed to load cases:', error);
      toast({
        title: "Error",
        description: "Failed to load cases",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortCases = () => {
    let filtered = [...cases];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Filter by stage
    if (filterStage !== 'all') {
      filtered = filtered.filter(c => c.current_stage === filterStage);
    }

    // Filter by case type
    if (filterCaseType !== 'all') {
      filtered = filtered.filter(c => c.case_type === filterCaseType);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c => {
        const title = c.title?.toLowerCase() || '';
        const description = c.description?.toLowerCase() || '';
        const clientName = c.client?.full_name?.toLowerCase() || '';
        const location = c.location?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return title.includes(query) || description.includes(query) || 
               clientName.includes(query) || location.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'client':
          return (a.client?.full_name || '').localeCompare(b.client?.full_name || '');
        default:
          return 0;
      }
    });

    setFilteredCases(filtered);
  };

  const formatCaseType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStageProgress = (stage) => {
    const stages = ['INITIATED', 'PETITION_FILED', 'COURT_REVIEW', 'HEARING_SCHEDULED', 'HEARING_DONE', 'JUDGMENT_PENDING', 'CLOSED'];
    const index = stages.indexOf(stage);
    return index >= 0 ? Math.round(((index + 1) / stages.length) * 100) : 0;
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'INITIATED': return 'bg-blue-100 text-blue-800';
      case 'PETITION_FILED': return 'bg-indigo-100 text-indigo-800';
      case 'COURT_REVIEW': return 'bg-purple-100 text-purple-800';
      case 'HEARING_SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'HEARING_DONE': return 'bg-orange-100 text-orange-800';
      case 'JUDGMENT_PENDING': return 'bg-pink-100 text-pink-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'initiated': return 'bg-blue-100 text-blue-800';
      case 'hearing_scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate stats
  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.current_stage !== 'CLOSED').length;
  const closedCases = cases.filter(c => c.current_stage === 'CLOSED').length;
  const hearingsScheduled = cases.filter(c => c.current_stage === 'HEARING_SCHEDULED').length;

  return (
    <div className="advocate-dashboard" data-testid="case-tracker-page">
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
                <BarChart3 size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  Case Tracker
                </h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                  Track and monitor all your cases in one place
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
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Total Cases</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#815DF5' }}>{totalCases}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0EBF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={24} color="#815DF5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Active Cases</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>{activeCases}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} color="#3B82F6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Hearings Scheduled</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{hearingsScheduled}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={24} color="#F59E0B" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Closed Cases</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>{closedCases}</p>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={24} color="#10B981" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search */}
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>Search</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <Input
                      placeholder="Search cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>Stage</label>
                  <Select value={filterStage} onValueChange={setFilterStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="INITIATED">Initiated</SelectItem>
                      <SelectItem value="PETITION_FILED">Petition Filed</SelectItem>
                      <SelectItem value="COURT_REVIEW">Court Review</SelectItem>
                      <SelectItem value="HEARING_SCHEDULED">Hearing Scheduled</SelectItem>
                      <SelectItem value="HEARING_DONE">Hearing Done</SelectItem>
                      <SelectItem value="JUDGMENT_PENDING">Judgment Pending</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>Case Type</label>
                  <Select value={filterCaseType} onValueChange={setFilterCaseType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="divorce">Divorce</SelectItem>
                      <SelectItem value="alimony">Alimony</SelectItem>
                      <SelectItem value="child_custody">Child Custody</SelectItem>
                      <SelectItem value="dowry">Dowry</SelectItem>
                      <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="title">Title A-Z</SelectItem>
                      <SelectItem value="client">Client Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cases List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#815DF5' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <Card>
              <CardContent style={{ padding: 60, textAlign: 'center' }}>
                <Briefcase size={64} color="#E0E0E0" style={{ margin: '0 auto 20px' }} />
                <h3 style={{ fontSize: 20, fontWeight: 600, color: '#333', marginBottom: 8 }}>No Cases Found</h3>
                <p style={{ color: '#888' }}>No cases match your current filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {filteredCases.map((caseItem) => (
                <Card key={caseItem.id} className="dash-card" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate(`/advocate/cases/${caseItem.id}`)}>
                  <CardContent style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
                      {/* Left Content */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: 'linear-gradient(135deg, #815DF5, #6B45E0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Briefcase size={24} color="#fff" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A0A3E', marginBottom: 6 }}>
                              {caseItem.title || `Case #${caseItem.id?.slice(0, 8)}`}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                              <Badge className={getCaseTypeColor(caseItem.case_type)}>
                                {formatCaseType(caseItem.case_type)}
                              </Badge>
                              <Badge className={getStageColor(caseItem.current_stage)}>
                                {caseItem.current_stage?.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Case Progress</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#815DF5' }}>
                              {getStageProgress(caseItem.current_stage)}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: '#F0EBF9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${getStageProgress(caseItem.current_stage)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #815DF5, #6B45E0)',
                              transition: 'width 0.3s ease',
                              borderRadius: 3
                            }} />
                          </div>
                        </div>

                        {/* Case Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
                            <User size={14} color="#888" />
                            <span><strong>Client:</strong> {caseItem.client?.full_name || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
                            <MapPin size={14} color="#888" />
                            <span><strong>Location:</strong> {caseItem.location || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
                            <Calendar size={14} color="#888" />
                            <span><strong>Created:</strong> {formatDate(caseItem.created_at)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
                            <Clock size={14} color="#888" />
                            <span><strong>Updated:</strong> {formatDate(caseItem.updated_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <Button
                          size="sm"
                          style={{ background: '#815DF5', color: '#fff' }}
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
    </div>
  );
};

export default CaseTracker;