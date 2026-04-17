import React from 'react';
import { ChevronRight } from 'lucide-react';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';

const PendingClientRequests = ({ requests = [] }) => {
  const displayRequests = requests.map((r) => ({
    id: r.id,
    name: r.client?.full_name || 'Client',
    caseType: r.case_type
      ? r.case_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'Divorce',
    urgency: 'Medium',
    timeAgo: 'recently',
    avatar: getAvatarUrl(r.client, { size: 40 }),
    clientRaw: r.client,
  }));

  return (
    <div className="dash-card" data-testid="pending-client-requests" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Pending Client Requests</h3>
        <button className="view-link" data-testid="view-all-requests">
          View All <ChevronRight size={14} />
        </button>
      </div>
      <div className="card-body">
        {displayRequests.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', padding: '24px 0', margin: 0, fontSize: 13 }}>
            No pending client requests
          </p>
        )}
        {displayRequests.map((req, i) => (
          <div className="request-item" key={req.id} data-testid={`request-item-${i}`}>
            <img
              src={req.avatar}
              alt={req.name}
              className="profile-avatar-sm"
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }}
              onError={handleAvatarError(req.clientRaw)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                {req.name}
              </p>
              <p style={{ fontSize: 12, color: '#888', margin: '2px 0 0' }}>
                {req.caseType}
              </p>
              <p style={{ fontSize: 11, color: '#AAA', margin: '2px 0 0' }}>
                Urgency: {req.urgency} &middot; {req.timeAgo}
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
