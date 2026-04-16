import React from 'react';
import { ChevronRight } from 'lucide-react';

const mockRequests = [
  {
    id: '1',
    name: 'Priya Singh',
    caseType: 'Divorce',
    urgency: 'High',
    timeAgo: '21s ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face',
  },
  {
    id: '2',
    name: 'Aditya Mehta',
    caseType: 'Divorce',
    urgency: 'Medium',
    timeAgo: '3h ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
  },
];

const PendingClientRequests = ({ requests = [] }) => {
  const displayRequests = requests.length > 0 ? requests.map(r => ({
    id: r.id,
    name: r.client?.full_name || 'Client',
    caseType: r.case_type ? r.case_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Divorce',
    urgency: 'Medium',
    timeAgo: 'recently',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face',
  })) : mockRequests;

  return (
    <div className="dash-card" data-testid="pending-client-requests" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Pending Client Requests</h3>
        <button className="view-link" data-testid="view-all-requests">
          View All <ChevronRight size={14} />
        </button>
      </div>
      <div className="card-body">
        {displayRequests.map((req, i) => (
          <div className="request-item" key={req.id} data-testid={`request-item-${i}`}>
            <img
              src={req.avatar}
              alt={req.name}
              className="profile-avatar-sm"
              style={{ width: 40, height: 40 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                {req.name}
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                {req.caseType}
              </p>
              <p style={{ fontSize: 11, color: '#AAA', margin: '2px 0 0' }}>
                Urgency: {req.urgency} · {req.timeAgo}
              </p>
            </div>
            <button
              className="btn-purple"
              data-testid={`view-request-btn-${i}`}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap' }}
            >
              View Request
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingClientRequests;
