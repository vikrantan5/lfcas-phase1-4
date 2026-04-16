import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hearingAPI, meetingAPI, caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Calendar as CalendarIcon, Clock, MapPin, Video, User, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import '../../styles/advocate-dashboard.css';

const Calendar = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hearings, setHearings] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'list'

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      // Load all cases first
      const casesResponse = await caseAPI.list();
      const cases = casesResponse.data || [];
      
      // Load hearings for all cases
      const hearingsPromises = cases.map(c => hearingAPI.getByCaseId(c.id).catch(() => ({ data: [] })));
      const hearingsResults = await Promise.all(hearingsPromises);
      const allHearings = hearingsResults.flatMap((r, i) => 
        (r.data || []).map(h => ({ ...h, case: cases[i] }))
      );
      
      // Load meetings
      const meetingsResponse = await meetingAPI.list();
      
      setHearings(allHearings);
      setMeetings(meetingsResponse.data || []);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Time TBD';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getUpcomingEvents = () => {
    const events = [];
    
    hearings.forEach(h => {
      events.push({
        type: 'hearing',
        date: h.hearing_date,
        title: `Hearing: ${h.case?.title || 'Case'}`,
        location: `${h.court_name}, ${h.court_room}`,
        client: h.case?.client?.full_name,
        icon: CalendarIcon,
        color: '#724AE3',
        data: h
      });
    });
    
    meetings.forEach(m => {
      events.push({
        type: 'meeting',
        date: m.scheduled_date,
        title: `Meeting: ${m.client?.full_name || 'Client'}`,
        location: m.meeting_mode === 'online' ? 'Online Meeting' : m.meeting_location,
        client: m.client?.full_name,
        icon: m.meeting_mode === 'online' ? Video : MapPin,
        color: '#18B057',
        data: m
      });
    });
    
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const upcomingEvents = getUpcomingEvents();
  const todayEvents = upcomingEvents.filter(e => isToday(e.date));
  const futureEvents = upcomingEvents.filter(e => new Date(e.date) > new Date() && !isToday(e.date));

  return (
    <div className="advocate-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="adv-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>Calendar</h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Manage your hearings and meetings</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: viewMode === 'list' ? 'none' : '1px solid #E0E0E0',
                    background: viewMode === 'list' ? '#724AE3' : '#fff',
                    color: viewMode === 'list' ? '#fff' : '#666',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  List View
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 className="animate-spin" size={48} color="#724AE3" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading calendar...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="dash-card" style={{ textAlign: 'center', padding: 60 }}>
              <CalendarIcon size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>No Events Scheduled</h3>
              <p style={{ color: '#888', fontSize: 14 }}>You don't have any hearings or meetings scheduled.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Today's Events */}
              <div className="dash-card">
                <div className="card-header">
                  <h3>Today's Events</h3>
                </div>
                <div className="card-body">
                  {todayEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <CalendarIcon size={48} color="#DDD" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: '#888', fontSize: 14 }}>No events scheduled for today</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {todayEvents.map((event, i) => (
                        <div key={i} style={{
                          padding: 16,
                          background: '#FAFAFE',
                          borderRadius: 12,
                          borderLeft: `4px solid ${event.color}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `${event.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <event.icon size={20} color={event.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: '0 0 4px' }}>
                                {event.title}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                  <Clock size={12} />
                                  <span>{formatTime(event.date)}</span>
                                </div>
                                {event.location && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                    <MapPin size={12} />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.client && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                    <User size={12} />
                                    <span>{event.client}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="dash-card">
                <div className="card-header">
                  <h3>Upcoming Events</h3>
                </div>
                <div className="card-body" style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {futureEvents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <CalendarIcon size={48} color="#DDD" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: '#888', fontSize: 14 }}>No upcoming events</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {futureEvents.map((event, i) => (
                        <div key={i} style={{
                          padding: 16,
                          background: '#FAFAFE',
                          borderRadius: 12,
                          borderLeft: `4px solid ${event.color}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `${event.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <event.icon size={20} color={event.color} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: '0 0 4px' }}>
                                {event.title}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                  <CalendarIcon size={12} />
                                  <span>{formatDate(event.date)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                  <Clock size={12} />
                                  <span>{formatTime(event.date)}</span>
                                </div>
                                {event.location && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                    <MapPin size={12} />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.client && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                                    <User size={12} />
                                    <span>{event.client}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;