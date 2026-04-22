import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Scale, Loader2, User, Star, AlertTriangle, ArrowLeft, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const AllAdvocatesPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [advocateDetails, setAdvocateDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Warning form state
  const [warningData, setWarningData] = useState({
    severity: 'medium',
    reason: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    location: '',
    min_rating: ''
  });

  useEffect(() => {
    loadAdvocates();
  }, []);

  const loadAdvocates = async () => {
    try {
      setLoading(true);
          // FIX: Remove empty string / \"all\" parameters to avoid 422 error
      const cleanFilters = {};
      if (filters.status && filters.status !== 'all') cleanFilters.status = filters.status;
      if (filters.location && filters.location !== '') cleanFilters.location = filters.location;
      if (filters.min_rating && filters.min_rating !== '') cleanFilters.min_rating = filters.min_rating;
      
      const response = await adminAPI.getAllAdvocates(cleanFilters);
      setAdvocates(response.data.advocates || []);
    } catch (error) {
      console.error('Failed to load advocates:', error);
      toast({
        title: "Error",
        description: "Failed to load advocates data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadAdvocates();
  };

  const handleViewDetails = async (advocate) => {
    try {
      setLoadingDetails(true);
      setDetailsModalOpen(true);
      setSelectedAdvocate(advocate);
      
      const response = await adminAPI.getAdvocateDetails(advocate.id);
      setAdvocateDetails(response.data);
    } catch (error) {
      console.error('Failed to load details:', error);
      toast({
        title: "Error",
        description: "Failed to load advocate details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGiveWarning = (advocate) => {
    setSelectedAdvocate(advocate);
    setWarningModalOpen(true);
    setWarningData({ severity: 'medium', reason: '', description: '' });
  };

  const handleSubmitWarning = async () => {
    if (!warningData.reason) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for the warning",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      await adminAPI.createWarning(
        selectedAdvocate.id,
        warningData.severity,
        warningData.reason,
        warningData.description || null
      );

      toast({
        title: "Warning Issued",
        description: `Warning issued to ${selectedAdvocate.users?.full_name || 'advocate'} successfully`
      });

      setWarningModalOpen(false);
      setWarningData({ severity: 'medium', reason: '', description: '' });
      loadAdvocates(); // Reload to get updated warning count
    } catch (error) {
      console.error('Failed to issue warning:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to issue warning",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/manager/dashboard')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="bg-white p-2 rounded-lg">
                <Scale className="w-6 h-6 text-[#3B4FAE]" />
              </div>
              <div>
                <h1 className="text-xl font-bold">All Advocates</h1>
                <p className="text-xs opacity-90">Ratings & Warnings</p>
              </div>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending_approval">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                  placeholder="City name..."
                />
              </div>
              <div>
                <Label>Min Rating</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.min_rating}
                  onChange={(e) => setFilters({...filters, min_rating: e.target.value})}
                  placeholder="0-5"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleFilter} className="w-full">Apply Filters</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advocates Table */}
        <Card data-testid="advocates-table">
          <CardHeader>
            <CardTitle>All Advocates ({advocates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating ⭐</TableHead>
                  <TableHead>Warnings ⚠️</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advocates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No advocates found
                    </TableCell>
                  </TableRow>
                ) : (
                  advocates.map((advocate) => (
                    <TableRow key={advocate.id} data-testid={`advocate-row-${advocate.id}`}>
                      <TableCell className="font-medium">
                        {advocate.users?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{advocate.users?.email || 'N/A'}</TableCell>
                      <TableCell>{advocate.location}</TableCell>
                      <TableCell>
                        <Badge variant={advocate.status === 'approved' ? 'success' : 'secondary'}>
                          {advocate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{advocate.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs text-gray-500">({advocate.rating_count || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="font-semibold">{advocate.warning_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{advocate.total_cases || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(advocate)}
                            data-testid={`view-details-${advocate.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleGiveWarning(advocate)}
                            data-testid={`give-warning-${advocate.id}`}
                          >
                            ⚠️ Warn
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Warning Modal */}
      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent data-testid="warning-modal">
          <DialogHeader>
            <DialogTitle>Issue Warning</DialogTitle>
            <DialogDescription>
              Issue a warning to {selectedAdvocate?.users?.full_name || 'advocate'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Severity</Label>
              <Select 
                value={warningData.severity} 
                onValueChange={(value) => setWarningData({...warningData, severity: value})}
              >
                <SelectTrigger data-testid="warning-severity-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Input
                value={warningData.reason}
                onChange={(e) => setWarningData({...warningData, reason: e.target.value})}
                placeholder="Poor response to client"
                data-testid="warning-reason-input"
                required
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={warningData.description}
                onChange={(e) => setWarningData({...warningData, description: e.target.value})}
                placeholder="Additional details..."
                rows={3}
                data-testid="warning-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitWarning} 
              disabled={submitting || !warningData.reason}
              data-testid="submit-warning-button"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Issue Warning'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="details-modal">
          <DialogHeader>
            <DialogTitle>Advocate Details - {selectedAdvocate?.users?.full_name}</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : advocateDetails ? (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{advocateDetails.statistics?.average_rating?.toFixed(1) || '0.0'}</p>
                    <p className="text-sm text-gray-600">Avg Rating</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{advocateDetails.statistics?.rating_count || 0}</p>
                    <p className="text-sm text-gray-600">Total Ratings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{advocateDetails.statistics?.warning_count || 0}</p>
                    <p className="text-sm text-gray-600">Warnings</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{advocateDetails.statistics?.total_cases || 0}</p>
                    <p className="text-sm text-gray-600">Total Cases</p>
                  </CardContent>
                </Card>
              </div>

              {/* Warnings */}
              <div>
                <h3 className="font-semibold mb-3">Warnings History</h3>
                {advocateDetails.warnings && advocateDetails.warnings.length > 0 ? (
                  <div className="space-y-2">
                    {advocateDetails.warnings.map((warning) => (
                      <Card key={warning.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge className={getSeverityColor(warning.severity)}>
                                {warning.severity.toUpperCase()}
                              </Badge>
                              <p className="font-medium mt-2">{warning.reason}</p>
                              {warning.description && (
                                <p className="text-sm text-gray-600 mt-1">{warning.description}</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(warning.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No warnings issued</p>
                )}
              </div>

              {/* Ratings */}
              <div>
                <h3 className="font-semibold mb-3">Recent Ratings</h3>
                {advocateDetails.ratings && advocateDetails.ratings.length > 0 ? (
                  <div className="space-y-2">
                    {advocateDetails.ratings.slice(0, 5).map((rating) => (
                      <Card key={rating.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < rating.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-semibold">{rating.rating}/5</span>
                              </div>
                              {rating.review && (
                                <p className="text-sm text-gray-600 mt-2">{rating.review}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                By: {rating.client?.full_name || 'Client'}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No ratings yet</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllAdvocatesPage;
