import React, { useState, useEffect } from 'react';
import { hearingAPI, caseAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const HearingsReminders = () => {
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const casesRes = await caseAPI.list();
      setCases(casesRes.data || []);

      // Load hearings for all cases
      const allHearings = [];
      for (const caseItem of casesRes.data || []) {
        try {
          const hearingsRes = await hearingAPI.getByCaseId(caseItem.id);
          allHearings.push(...(hearingsRes.data || []).map(h => ({ ...h, case: caseItem })));
        } catch (error) {
          console.error(`Failed to load hearings for case ${caseItem.id}:`, error);
        }
      }
      setHearings(allHearings.sort((a, b) => new Date(a.hearing_date) - new Date(b.hearing_date)));
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load hearings and reminders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (hearingDate) => {
    const today = new Date();
    const hearing = new Date(hearingDate);
    const diffDays = Math.ceil((hearing - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="secondary">Completed</Badge>;
    } else if (diffDays === 0) {
      return <Badge className="bg-red-500">Today</Badge>;
    } else if (diffDays === 1) {
      return <Badge className="bg-orange-500">Tomorrow</Badge>;
    } else if (diffDays <= 7) {
      return <Badge className="bg-yellow-500">This Week</Badge>;
    } else {
      return <Badge variant="outline">Upcoming</Badge>;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading hearings and reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6" data-testid="hearings-reminders-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hearings & Reminders</h1>
          <p className="text-slate-600 mt-1">Stay updated with your court dates and important events</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Bell className="mr-2" size={16} />
          Set Reminder
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Hearings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{hearings.length}</div>
            <p className="text-xs text-slate-500 mt-1">Across all cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Upcoming This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-600">
              {hearings.filter(h => {
                const diffDays = Math.ceil((new Date(h.hearing_date) - new Date()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7;
              }).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {hearings.filter(h => new Date(h.hearing_date) < new Date()).length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Past hearings</p>
          </CardContent>
        </Card>
      </div>

      {/* Hearings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="text-violet-600" size={24} />
            All Hearings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hearings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Hearings Scheduled</h3>
              <p className="text-slate-500">Your advocate will schedule hearings as your case progresses</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hearings.map((hearing, index) => (
                <div 
                  key={hearing.id || index}
                  className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-all"
                  data-testid={`hearing-item-${index}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {hearing.case?.title || 'Case Hearing'}
                        </h3>
                        {getStatusBadge(hearing.hearing_date)}
                      </div>
                      <p className="text-sm text-slate-600">{hearing.case?.case_type || 'General'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="text-violet-600 mt-1" size={18} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Date</p>
                        <p className="text-sm text-slate-600">{formatDate(hearing.hearing_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="text-violet-600 mt-1" size={18} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Time</p>
                        <p className="text-sm text-slate-600">{formatTime(hearing.hearing_date)}</p>
                      </div>
                    </div>

                    {hearing.court_name && (
                      <div className="flex items-start gap-3">
                        <MapPin className="text-violet-600 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Court</p>
                          <p className="text-sm text-slate-600">
                            {hearing.court_name} {hearing.court_room && `- ${hearing.court_room}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {hearing.notes && (
                      <div className="flex items-start gap-3">
                        <AlertCircle className="text-violet-600 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Notes</p>
                          <p className="text-sm text-slate-600">{hearing.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {hearing.outcome && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="text-green-600 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm font-medium text-green-800">Outcome</p>
                          <p className="text-sm text-green-700">{hearing.outcome}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HearingsReminders;
