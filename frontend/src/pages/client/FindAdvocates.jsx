import React, { useState, useEffect } from 'react';
import { advocateAPI, meetingRequestAPI, aiAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Search, MapPin, Star, CheckCircle, Briefcase, Award, UserCheck, Filter, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const FindAdvocates = () => {
  const { toast } = useToast();
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    specialization: 'all',
    location: '',
    experience: 'all',
    search: ''
  });
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestData, setRequestData] = useState({
    case_type: '',
    description: '',
    location: '',
    preferred_date: ''
  });
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadAdvocates();
  }, [filters.specialization, filters.location]);

  const loadAdvocates = async () => {
    setLoading(true);
    try {
      const params = {
        status: 'approved',
        ...(filters.specialization && filters.specialization !== 'all' && { specialization: filters.specialization }),
        ...(filters.location && { location: filters.location }),
      };
      const response = await advocateAPI.list(params);
      setAdvocates(response.data || []);
    } catch (error) {
      console.error('Failed to load advocates:', error);
      toast({ title: "Error", description: "Failed to load advocates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMeeting = (advocate) => {
    setSelectedAdvocate(advocate);
    setShowRequestDialog(true);
  };

  const submitMeetingRequest = async (e) => {
    e.preventDefault();
    if (!selectedAdvocate || !requestData.case_type || !requestData.description) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setRequesting(true);
    try {
      await meetingRequestAPI.create({
        advocate_id: selectedAdvocate.id,
        case_type: requestData.case_type,
        description: requestData.description,
        location: requestData.location,
        preferred_date: requestData.preferred_date || null,
        ai_analysis: null
      });
      toast({ title: "Success", description: `Meeting request sent to ${selectedAdvocate.user?.full_name}` });
      setShowRequestDialog(false);
      setRequestData({ case_type: '', description: '', location: '', preferred_date: '' });
    } catch (error) {
      toast({ title: "Request Failed", description: error.response?.data?.detail || "Failed to send request", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const filteredAdvocates = advocates.filter(adv => {
    const matchesExp = !filters.experience || filters.experience === 'all' || adv.experience_years >= parseInt(filters.experience);
    const matchesSearch = !filters.search || 
      adv.user?.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      adv.location.toLowerCase().includes(filters.search.toLowerCase());
    return matchesExp && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6" data-testid="find-advocates-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Find Advocates</h1>
        <p className="text-slate-600 mt-1">Connect with verified legal experts for your case</p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Name or location..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Specialization</label>
            <Select value={filters.specialization} onValueChange={(v) => setFilters({ ...filters, specialization: v })}>
              <SelectTrigger>
                <SelectValue placeholder="All Specializations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specializations</SelectItem>
                <SelectItem value="divorce">Divorce</SelectItem>
                <SelectItem value="alimony">Alimony</SelectItem>
                <SelectItem value="child_custody">Child Custody</SelectItem>
                <SelectItem value="dowry">Dowry</SelectItem>
                <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
            <Input
              placeholder="e.g. Mumbai"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Min Experience</label>
            <Select value={filters.experience} onValueChange={(v) => setFilters({ ...filters, experience: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Any Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Experience</SelectItem>
                <SelectItem value="2">2+ Years</SelectItem>
                <SelectItem value="5">5+ Years</SelectItem>
                <SelectItem value="10">10+ Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      ) : filteredAdvocates.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCheck className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Advocates Found</h3>
          <p className="text-slate-500">Try adjusting your filters to find more advocates</p>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing <strong>{filteredAdvocates.length}</strong> advocate{filteredAdvocates.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAdvocates.map(advocate => (
              <Card key={advocate.id} className="p-6 hover:shadow-lg transition-shadow" data-testid={`advocate-card-${advocate.id}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={advocate.user?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advocate.user?.full_name || 'Advocate')}&size=64&background=724AE3&color=fff&font-size=0.4`}
                      alt={advocate.user?.full_name || 'Advocate'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {advocate.user?.full_name || 'Advocate'}
                      </h3>
                      {advocate.status === 'approved' && (
                        <CheckCircle className="text-green-600" size={16} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Star className="text-amber-500" size={14} fill="currentColor" />
                      <span className="font-medium">{advocate.rating || 0}/5.0</span>
                      <span className="text-slate-400">•</span>
                      <span>{advocate.total_cases || 0} cases</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Award size={16} className="text-violet-600" />
                    <span>{advocate.experience_years} years experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={16} className="text-violet-600" />
                    <span>{advocate.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Briefcase size={16} className="text-violet-600" />
                    <span>Bar ID: {advocate.bar_council_id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {advocate.specialization?.slice(0, 3).map((spec, idx) => (
                    <Badge key={idx} className="bg-violet-100 text-violet-700 text-xs">
                      {spec.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>

                {advocate.bio && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{advocate.bio}</p>
                )}

                <Button 
                  onClick={() => handleRequestMeeting(advocate)} 
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  data-testid={`request-meeting-${advocate.id}`}
                >
                  <MessageSquare size={16} className="mr-2" />
                  Request Meeting
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Meeting Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-lg" data-testid="meeting-request-dialog">
          <DialogHeader>
            <DialogTitle>Request Meeting with {selectedAdvocate?.user?.full_name}</DialogTitle>
            <DialogDescription>
              Provide details about your case to request a meeting
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMeetingRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Case Type *</label>
              <Select 
                value={requestData.case_type} 
                onValueChange={(v) => setRequestData({ ...requestData, case_type: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Location *</label>
              <Input
                placeholder="e.g. Mumbai, Maharashtra"
                value={requestData.location}
                onChange={(e) => setRequestData({ ...requestData, location: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Describe Your Case *</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                placeholder="Please provide details about your legal issue..."
                value={requestData.description}
                onChange={(e) => setRequestData({ ...requestData, description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Meeting Date (Optional)</label>
              <Input
                type="datetime-local"
                value={requestData.preferred_date}
                onChange={(e) => setRequestData({ ...requestData, preferred_date: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowRequestDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={requesting} className="flex-1 bg-violet-600 hover:bg-violet-700">
                {requesting ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindAdvocates;