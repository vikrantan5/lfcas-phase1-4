import React from 'react';
import { Plus, Clock, FolderOpen, DollarSign } from 'lucide-react';

const actions = [
  {
    icon: Plus,
    iconBg: '#EDE7F6',
    iconColor: '#724AE3',
    label: 'Add New Case',
    badge: null,
  },
  {
    icon: Clock,
    iconBg: '#EDE7F6',
    iconColor: '#724AE3',
    label: 'Check Requests',
    badge: 4,
  },
  {
    icon: FolderOpen,
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
    label: 'Manage Documents',
    badge: null,
  },
  {
    icon: DollarSign,
    iconBg: '#E8F5E9',
    iconColor: '#18B057',
    label: 'Track Payments',
    badge: null,
  },
];

const QuickActions = () => {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}
      data-testid="quick-actions"
    >
      {actions.map((action, i) => (
        <button
          key={action.label}
          className="quick-action-btn"
          data-testid={`quick-action-${action.label.toLowerCase().replace(/s/g, '-')}`}
        >
          <div className="qa-icon" style={{ background: action.iconBg, position: 'relative' }}>
            <action.icon size={18} color={action.iconColor} />
            {action.badge && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#815DF5',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {action.badge}
              </span>
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A0A3E' }}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
