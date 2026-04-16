import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Users, AlertCircle } from 'lucide-react';
import { advocateDashboardAPI } from '../../services/api';
import { format } from 'date-fns';

const getIconByType = (type) => {
  switch (type.toLowerCase()) {
    case 'hearing':
      return { icon: Calendar, bg: '#EDE7F6', color: '#724AE3' };
    case 'meeting':
      return { icon: Users, bg: '#E3F2FD', color: '#2196F3' };
    case 'action required':
      return { icon: AlertCircle, bg: '#FFF3E0', color: '#FF9800' };
    default:
      return { icon: FileText, bg: '#EDE7F6', color: '#724AE3' };
  }
};

const RemindersToday = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const response = await advocateDashboardAPI.getReminders();
      setReminders(response.data.reminders || []);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return format(date, 'hh:mm a');
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="dash-card" data-testid="reminders-today" style={{ height: '100%' }}>
        <div className="card-header">
          <h3>Reminders for Today</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="dash-card" data-testid="reminders-today" style={{ height: '100%' }}>
        <div className="card-header">
          <h3>Reminders for Today</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Calendar size={48} color="#CCC" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#888', margin: 0 }}>No reminders for today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-card" data-testid="reminders-today" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Reminders for Today</h3>
      </div>
      <div className="card-body">
        {reminders.slice(0, 3).map((rem, i) => {
          const iconConfig = getIconByType(rem.type);
          const IconComponent = iconConfig.icon;
          
          return (
            <div className="reminder-item" key={rem.related_id || i} data-testid={`reminder-item-${i}`}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: iconConfig.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={18} color={iconConfig.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                    {rem.type}
                  </p>
                  {rem.time && (
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                      {formatTime(rem.time)}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rem.detail}
                </p>
              </div>
              <button
                className="btn-purple"
                data-testid={`reminder-action-${i}`}
                style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, whiteSpace: 'nowrap' }}
              >
                View
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RemindersToday;