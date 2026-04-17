import React, { useState, useEffect } from 'react';
import { Clock, Info, CheckCircle, ChevronRight, FileText ,Calendar } from 'lucide-react';
import { advocateDashboardAPI } from '../../services/api';
import { format } from 'date-fns';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';

const TodaysHearings = () => {
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayHearings();
  }, []);

  const loadTodayHearings = async () => {
    try {
      const response = await advocateDashboardAPI.getTodayHearings();
      setHearings(response.data.hearings || []);
    } catch (error) {
      console.error("Failed to load today's hearings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-card" data-testid="todays-hearings" style={{ height: '100%' }}>
        <div className="card-header">
          <h3>Today's Hearings</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#888' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (hearings.length === 0) {
    return (
      <div className="dash-card" data-testid="todays-hearings" style={{ height: '100%' }}>
        <div className="card-header">
          <h3>Today's Hearings</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Calendar size={48} color="#CCC" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#888', margin: 0 }}>No hearings scheduled for today</p>
        </div>
      </div>
    );
  }

  const firstHearing = hearings[0];

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
              src={getAvatarUrl({ profile_image_url: firstHearing.client_avatar, full_name: firstHearing.client_name }, { size: 40 })}
              alt={firstHearing.client_name || 'Client'}
              className="profile-avatar-sm"
              onError={handleAvatarError({ full_name: firstHearing.client_name })}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                {firstHearing.case_title || firstHearing.case_name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Clock size={13} color="#724AE3" />
                <span style={{ fontSize: 12, color: '#888' }}>
                  Today, {format(new Date(firstHearing.hearing_date), 'hh:mm a')}
                </span>
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
          {firstHearing.documents && firstHearing.documents.length > 0 && (
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

              {firstHearing.documents.slice(0, 3).map((doc, i) => (
                <div key={i} className="doc-check-item" data-testid={`doc-item-${i}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color="#724AE3" />
                    <span>{doc.name}</span>
                  </div>
                  {doc.verified && (
                    <CheckCircle size={16} color="#18B057" fill="#18B057" stroke="#fff" />
                  )}
                </div>
              ))}
            </div>
          )}
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