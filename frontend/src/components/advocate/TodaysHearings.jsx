import React from 'react';
import { Clock, Info, CheckCircle, ChevronRight, FileText } from 'lucide-react';

const hearingData = {
  caseName: 'Javeriya Khan vs. Faizan Malik',
  time: 'Today, 10:00 AM',
  documents: [
    { name: 'Income Proof.pdf', verified: true },
    { name: 'Custody Agreement.pdf', verified: true },
    { name: 'Address Proof.pdf', verified: true },
  ],
};

const TodaysHearings = () => {
  return (
    <div className="dash-card" data-testid="todays-hearings" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Today's Hearings</h3>
        <button className="view-link" data-testid="view-hearings-details">
          View Details <ChevronRight size={14} />
        </button>
      </div>

      <div className="card-body">
        {/* Hearing Card */}
        <div style={{
          background: '#FAFAFE',
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}>
          {/* Case + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face"
              alt="Client"
              className="profile-avatar-sm"
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                {hearingData.caseName}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Clock size={13} color="#724AE3" />
                <span style={{ fontSize: 12, color: '#888' }}>{hearingData.time}</span>
              </div>
            </div>
            <button
              style={{
                background: '#F0EBF9',
                border: 'none',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                display: 'flex',
              }}
              data-testid="copy-hearing-btn"
            >
              <FileText size={16} color="#724AE3" />
            </button>
          </div>

          {/* Requisite Documents */}
          <div style={{
            background: '#fff',
            borderRadius: 10,
            padding: 12,
            border: '1px solid #F0EBF9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Info size={14} color="#724AE3" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1A0A3E' }}>
                Requisite Documents
              </span>
            </div>

            {hearingData.documents.map((doc, i) => (
              <div key={doc.name} className="doc-check-item" data-testid={`doc-item-${i}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} color="#724AE3" />
                  <span>{doc.name}</span>
                </div>
                <CheckCircle size={16} color="#18B057" fill="#18B057" stroke="#fff" />
              </div>
            ))}
          </div>
        </div>

        {/* View Details Button */}
        <button
          className="btn-purple"
          data-testid="view-hearing-details-btn"
          style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          View Details <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default TodaysHearings;
