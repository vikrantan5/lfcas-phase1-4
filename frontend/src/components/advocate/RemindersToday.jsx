import React from 'react';
import { Calendar, FileText } from 'lucide-react';

const mockReminders = [
  {
    id: '1',
    icon: Calendar,
    iconBg: '#EDE7F6',
    iconColor: '#724AE3',
    type: 'Hearing',
    detail: 'Reda Shurte Case Peboltan Malik',
    time: '10:00 AM',
    action: 'To Logout',
    actionLabel: 'To Logout',
  },
  {
    id: '2',
    icon: FileText,
    iconBg: '#EDE7F6',
    iconColor: '#724AE3',
    type: 'Document Deadline',
    detail: 'Upload Custody Experimenalities',
    time: '',
    action: 'Upload',
    actionLabel: 'Upload Vop',
  },
];

const RemindersToday = () => {
  return (
    <div className="dash-card" data-testid="reminders-today" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Reminders for Today</h3>
      </div>
      <div className="card-body">
        {mockReminders.map((rem, i) => (
          <div className="reminder-item" key={rem.id} data-testid={`reminder-item-${i}`}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: rem.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <rem.icon size={18} color={rem.iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                  {rem.type}
                </p>
                {rem.time && (
                  <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>{rem.time}</span>
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
              {rem.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RemindersToday;
