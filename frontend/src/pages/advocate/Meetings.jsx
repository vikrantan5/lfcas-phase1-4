import React, { useState, useEffect } from 'react';
import { meetingAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar, Clock, MapPin, Video, User, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';

const Meetings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const response = await meetingAPI.list();
      setMeetings(response.data || []);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = (meeting) => {
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, '_blank');
    } else {
      toast({
        title: "No Link Available",
        description: "This meeting doesn't have a link yet",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const upcomingMeetings = meetings.filter(m => 
    new Date(m.scheduled_date) >= new Date() && m.status !== 'completed'
  );

  const pastMeetings = meetings.filter(m => 
    new Date(m.scheduled_date) < new Date() || m.status === 'completed'
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F3FF' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#815DF5' }} />
      </div>
    );
  }

  return (
    <div className="advocate-dashboard" data-testid="advocate-meetings-page">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.full_name || 'Advocate'}
      />

      <div className="adv-main">
        <DashboardHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userName={user?.full_name || 'Advocate'}
        />

        <div className="adv-content" style={{ padding: '24px 28px' }}>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">My Meetings</h1>
            <p className="text-slate-600 mt-1">View and manage your scheduled meetings</p>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming" data-testid="upcoming-tab">
                Upcoming ({upcomingMeetings.length})
              </TabsTrigger>
              <TabsTrigger value="past" data-testid="past-tab">
                Past ({pastMeetings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              {upcomingMeetings.length === 0 ? (
                <Card className="p-12 text-center">
                  <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Upcoming Meetings</h3>
                  <p className="text-slate-500">You don't have any meetings scheduled</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {upcomingMeetings.map((meeting) => (
                    <Card key={meeting.id} data-testid={`meeting-${meeting.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                                <User className="text-violet-600" size={24} />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                  {meeting.client?.full_name || 'Client'}
                                </h3>
                                <Badge className="bg-violet-100 text-violet-700">
                                  {meeting.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Calendar size={16} className="text-violet-600" />
                                <span>{formatDate(meeting.scheduled_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Clock size={16} className="text-violet-600" />
                                <span>{formatTime(meeting.scheduled_date)}</span>
                              </div>
                              {meeting.meeting_mode === 'online' ? (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <Video size={16} className="text-violet-600" />
                                  <span>Online Meeting</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <MapPin size={16} className="text-violet-600" />
                                  <span>{meeting.meeting_location || 'In Person'}</span>
                                </div>
                              )}
                            </div>

                            {meeting.notes && (
                              <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded">
                                {meeting.notes}
                              </p>
                            )}
                          </div>

                          <div>
                            {meeting.meeting_mode === 'online' && meeting.meeting_link && (
                              <Button
                                onClick={() => handleJoinMeeting(meeting)}
                                className="bg-violet-600 hover:bg-violet-700"
                                data-testid={`join-meeting-${meeting.id}`}
                              >
                                <ExternalLink size={16} className="mr-2" />
                                Join Meeting
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              {pastMeetings.length === 0 ? (
                <Card className="p-12 text-center">
                  <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Past Meetings</h3>
                  <p className="text-slate-500">Your completed meetings will appear here</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pastMeetings.map((meeting) => (
                    <Card key={meeting.id} className="opacity-75" data-testid={`past-meeting-${meeting.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="text-slate-600" size={24} />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                  {meeting.client?.full_name || 'Client'}
                                </h3>
                                <Badge variant="secondary">Completed</Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar size={16} />
                                <span>{formatDate(meeting.scheduled_date)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Clock size={16} />
                                <span>{formatTime(meeting.scheduled_date)}</span>
                              </div>
                            </div>

                            {meeting.decision_notes && (
                              <p className="text-sm text-slate-600 mt-3 bg-slate-50 p-3 rounded">
                                Decision: {meeting.advocate_decision}
                                <br />
                                {meeting.decision_notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Meetings;
