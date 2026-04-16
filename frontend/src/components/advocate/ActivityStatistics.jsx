import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ChevronRight, TrendingUp, Upload } from 'lucide-react';

const chartData = [
  { day: 'Mon', hearings: 10 },
  { day: 'Tue', hearings: 11 },
  { day: 'Wed', hearings: 9 },
  { day: 'Thu', hearings: 12 },
  { day: 'Fri', hearings: 14 },
  { day: 'Sat', hearings: 18 },
  { day: 'Sun', hearings: 24 },
];

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
        {payload[0].value} Hearings
      </div>
    );
  }
  return null;
};

const ActivityStatistics = () => {
  const [activeTab, setActiveTab] = useState('hearings');

  return (
    <div className="dash-card" data-testid="activity-statistics" style={{ height: '100%' }}>
      <div className="card-header">
        <h3>Activity Statistics</h3>
        <button className="hearings-toggle-btn" data-testid="hearings-toggle">
          Hearings <ChevronRight size={14} />
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
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
          <span style={{ fontSize: 22, fontWeight: 700, color: '#1A0A3E' }}>16</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A0A3E' }}>
            Hearings <span style={{ fontWeight: 400, color: '#888' }}>This Week</span>
          </span>
        </div>

        {/* Bottom Stats */}
        <div className="stats-bottom-row">
          <div className="stats-bottom-item">
            <TrendingUp size={18} color="#18B057" />
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Cases Filed This Month</p>
              <p style={{ fontSize: 12, color: '#18B057', fontWeight: 600, margin: 0 }}>+10% Vs last month.</p>
            </div>
          </div>
          <div className="stats-bottom-item">
            <Upload size={18} color="#724AE3" />
            <div>
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Document Uploads</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                32 <span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>30days WNCK.</span>
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
