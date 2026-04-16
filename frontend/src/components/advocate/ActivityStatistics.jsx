import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ChevronRight, TrendingUp, Upload } from 'lucide-react';
import { advocateDashboardAPI } from '../../services/api';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1A0A3E',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'Poppins, sans-serif',
      }}>
        {payload[0].value} {payload[0].name === 'hearings' ? 'Hearings' : 'Documents'}
      </div>
    );
  }
  return null;
};

const ActivityStatistics = () => {
  const [activeTab, setActiveTab] = useState('hearings');
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    hearings_this_week: 0,
    documents_this_week: 0,
    cases_filed_this_month: 0,
    cases_change_percent: 0,
    documents_30_days: 0
  });

  useEffect(() => {
    loadActivityData();
  }, []);

  const loadActivityData = async () => {
    try {
      const response = await advocateDashboardAPI.getActivityStats();
      const data = response.data;
      
      setChartData(data.activity_data || []);
      setSummary(data.summary || {
        hearings_this_week: 0,
        documents_this_week: 0,
        cases_filed_this_month: 0,
        cases_change_percent: 0,
        documents_30_days: 0
      });
    } catch (error) {
      console.error('Failed to load activity stats:', error);
    }
  };

  const displayData = chartData.map(item => ({
    day: item.day,
    hearings: activeTab === 'hearings' ? item.hearings : item.documents
  }));

  return (
    <div className="dash-card" data-testid="activity-statistics" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Activity Statistics</h3>
        <button className="hearings-toggle-btn" data-testid="hearings-toggle">
          {activeTab === 'hearings' ? 'Hearings' : 'Documents'} <ChevronRight size={14} />
        </button>
      </div>

      <div className="card-body">
        {/* Tabs */}
        <div className="chart-tabs" style={{ marginBottom: 16 }}>
          <button
            className={`chart-tab ${activeTab === 'hearings' ? 'active' : ''}`}
            onClick={() => setActiveTab('hearings')}
            data-testid="tab-hearings"
          >
            Hearings
          </button>
          <button
            className={`chart-tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
            data-testid="tab-documents"
          >
            Documents
          </button>
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hearingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#815DF5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#815DF5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EBF9" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#3D0072', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#CCC', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="hearings"
                name={activeTab}
                stroke="#815DF5"
                strokeWidth={2.5}
                fill="url(#hearingsGradient)"
                dot={{ r: 4, fill: '#fff', stroke: '#815DF5', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#815DF5', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Label */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
          background: '#F8F5FF', borderRadius: 8, padding: '6px 12px', width: 'fit-content'
        }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#1A0A3E' }}>
            {activeTab === 'hearings' ? summary.hearings_this_week : summary.documents_this_week}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A0A3E' }}>
            {activeTab === 'hearings' ? 'Hearings' : 'Documents'} <span style={{ fontWeight: 400, color: '#888' }}>This Week</span>
          </span>
        </div>

        {/* Bottom Stats */}
        <div className="stats-bottom-row">
          <div className="stats-bottom-item">
            <TrendingUp size={18} color={summary.cases_change_percent >= 0 ? "#18B057" : "#FF5252"} />
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Cases Filed This Month</p>
              <p style={{ fontSize: 12, color: summary.cases_change_percent >= 0 ? '#18B057' : '#FF5252', fontWeight: 600, margin: 0 }}>
                {summary.cases_change_percent >= 0 ? '+' : ''}{summary.cases_change_percent}% Vs last month.
              </p>
            </div>
          </div>
          <div className="stats-bottom-item">
            <Upload size={18} color="#724AE3" />
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Document Uploads</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                {summary.documents_30_days} <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>Last 30 days</span>
              </p>
            </div>
          </div>
          <button className="btn-purple" data-testid="view-stats-btn" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13 }}>
            View Stats <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityStatistics;