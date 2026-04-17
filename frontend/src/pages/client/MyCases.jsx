import React, { useState, useEffect } from 'react';
import { caseAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Briefcase, Clock, UserCheck, MapPin, Gavel, Calendar, FileText, 
  Search, Filter, ArrowRight, Loader2, Eye, Download, AlertCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const MyCases = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    filterCases();
  }, [cases, searchTerm, statusFilter]);

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

  const filterCases = () => {
    let filtered = [...cases];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => {
        if (statusFilter === 'active') {
          return c.current_stage !== 'CLOSED' && c.status !== 'closed';
        }
        if (statusFilter === 'closed') {
          return c.current_stage === 'CLOSED' || c.status === 'closed';
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.case_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCases(filtered);
  };

  const getStatusBadge = (caseItem) => {
    const stage = caseItem.current_stage || caseItem.status;
    const colors = {
      'INITIATED': 'bg-blue-100 text-blue-700',
      'PETITION_FILED': 'bg-purple-100 text-purple-700',
      'COURT_REVIEW': 'bg-amber-100 text-amber-700',
      'HEARING_SCHEDULED': 'bg-orange-100 text-orange-700',
      'HEARING_DONE': 'bg-teal-100 text-teal-700',
      'JUDGMENT_PENDING': 'bg-yellow-100 text-yellow-700',
      'CLOSED': 'bg-green-100 text-green-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  const formatCaseType = (type) =>
    type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

  const getProgressPercentage = (stage) => {
    const stages = ['INITIATED', 'PETITION_FILED', 'COURT_REVIEW', 'HEARING_SCHEDULED', 'HEARING_DONE', 'JUDGMENT_PENDING', 'CLOSED'];
    const index = stages.indexOf(stage);
    return index >= 0 ? Math.round(((index + 1) / stages.length) * 100) : 0;
  };

  return (
    <div className="p-6 space-y-6" data-testid="my-cases-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Cases</h1>
        <p className="text-slate-600 mt-1">View and manage all your legal cases</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Search cases by title, type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="cases-search-input"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="whitespace-nowrap"
                data-testid="filter-all"
              >
                All Cases
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className="whitespace-nowrap"
                data-testid="filter-active"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'closed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('closed')}
                className="whitespace-nowrap"
                data-testid="filter-closed"
              >
                Closed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cases Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={48} />
        </div>
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Briefcase size={64} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No cases found' : 'No cases yet'}
            </h3>
            <p className="text-slate-500 text-center max-w-md">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search terms' 
                : 'Start by creating a new case with our AI assistant'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((caseItem) => (
            <Card 
              key={caseItem.id} 
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
              onClick={() => navigate(`/client/cases/${caseItem.id}`)}
              data-testid={`case-card-${caseItem.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getStatusBadge(caseItem)}>
                    {caseItem.current_stage?.replace('_', ' ') || caseItem.status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    #{caseItem.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-lg">
                  {formatCaseType(caseItem.case_type)} Case
                </CardTitle>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {caseItem.title || caseItem.description}
                </p>
              </CardHeader>

              <CardContent>
                <div className="space-y-3 mb-4">
                  {/* Advocate */}
                  {caseItem.advocate && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <UserCheck size={16} className="text-violet-600" />
                      <span>{caseItem.advocate.user?.full_name || 'Advocate assigned'}</span>
                    </div>
                  )}

                  {/* Location */}
                  {caseItem.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={16} className="text-violet-600" />
                      <span>{caseItem.location}</span>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={16} className="text-violet-600" />
                    <span>Filed on {formatDate(caseItem.created_at)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-slate-600">Progress</span>
                    <span className="text-xs font-bold text-violet-600">
                      {getProgressPercentage(caseItem.current_stage)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-violet-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(caseItem.current_stage)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/client/cases/${caseItem.id}`);
                    }}
                    data-testid={`view-case-${caseItem.id}`}
                  >
                    <Eye size={16} className="mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && cases.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-600">{cases.length}</div>
                <div className="text-sm text-slate-600 mt-1">Total Cases</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {cases.filter(c => c.current_stage !== 'CLOSED' && c.status !== 'closed').length}
                </div>
                <div className="text-sm text-slate-600 mt-1">Active Cases</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {cases.filter(c => c.current_stage === 'CLOSED' || c.status === 'closed').length}
                </div>
                <div className="text-sm text-slate-600 mt-1">Closed Cases</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyCases;
