import React, { useState, useEffect } from 'react';
import { Star, Briefcase, Calendar, FileText } from 'lucide-react';
import { advocateDashboardAPI } from '../../services/api';

const StatCards = () => {
  const [stats, setStats] = useState([
    {
      icon: Star,
      iconBg: '#FFF8E1',
      iconColor: '#FFD700',
      label: 'Advocate Score',
      value: '0',
      sub: '(0 Reviews)',
      fillStar: true,
    },
    {
      icon: Briefcase,
      iconBg: '#EDE7F6',
      iconColor: '#724AE3',
      label: 'Active Cases',
      value: '0',
      sub: 'Ongoing',
    },
    {
      icon: Calendar,
      iconBg: '#EDE7F6',
      iconColor: '#724AE3',
      label: "Today's Hearings",
      value: '0',
      sub: 'Scheduled',
    },
    {
      icon: FileText,
      iconBg: '#EDE7F6',
      iconColor: '#724AE3',
      label: 'Requests',
      value: '0',
      sub: 'Pending',
    },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await advocateDashboardAPI.getSummary();
      const data = response.data;
      
      setStats([
        {
          icon: Star,
          iconBg: '#FFF8E1',
          iconColor: '#FFD700',
          label: 'Advocate Score',
          value: data.advocate_score ? data.advocate_score.toFixed(1) : '0.0',
          sub: `(${data.total_reviews || 0} Reviews)`,
          fillStar: true,
        },
        {
          icon: Briefcase,
          iconBg: '#EDE7F6',
          iconColor: '#724AE3',
          label: 'Active Cases',
          value: String(data.active_cases || 0),
          sub: 'Ongoing',
        },
        {
          icon: Calendar,
          iconBg: '#EDE7F6',
          iconColor: '#724AE3',
          label: "Today's Hearings",
          value: String(data.today_hearings || 0),
          sub: 'Scheduled',
        },
        {
          icon: FileText,
          iconBg: '#EDE7F6',
          iconColor: '#724AE3',
          label: 'Requests',
          value: String(data.pending_requests || 0),
          sub: 'Pending',
        },
      ]);
    } catch (error) {
      console.error('Failed to load dashboard summary:', error);
    }
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
      data-testid="stat-cards"
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`stat-card fade-in-up fade-in-up-${i + 1}`}
          data-testid={`stat-card-${stat.label.toLowerCase().replace(/[s']/g, '-')}`}
        >
          <div
            className="stat-icon"
            style={{ background: stat.iconBg }}
          >
            <stat.icon
              size={24}
              color={stat.iconColor}
              fill={stat.fillStar ? stat.iconColor : 'none'}
            />
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 500 }}>
              {stat.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: '#1A0A3E' }}>
                {stat.value}
              </span>
              {stat.fillStar && (
                <Star size={16} color="#FFD700" fill="#FFD700" style={{ marginBottom: 2 }} />
              )}
              <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>
                {stat.sub}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
