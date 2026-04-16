import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Briefcase, Search, Filter, ChevronRight, Loader2 } from 'lucide-react';
import '../../styles/advocate-dashboard.css';

const MyCases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await caseAPI.list();
      setCases(response.data || []);
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'initiated': 'bg-blue-100 text-blue-800',
      'hearing_scheduled': 'bg-purple-100 text-purple-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStageClass = (stage) => {
    const s = stage?.toLowerCase() || '';
    if (s.includes('hearing')) return 'stage-hearing';
    if (s.includes('court') || s.includes('response')) return 'stage-response';
    if (s.includes('document') || s.includes('awaiting')) return 'stage-documents';
    return 'stage-filed';
  };

  return (
    <div className="advocate-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="adv-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>My Cases</h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Manage all your ongoing and completed cases</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid #E0E0E0',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="initiated">Initiated</option>
                  <option value="hearing_scheduled">Hearing Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', maxWidth: 500 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Search cases by title or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  borderRadius: 10,
                  border: '1px solid #E0E0E0',
                  fontSize: 14
                }}
              />
            </div>
          </div>

          {/* Cases List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 className="animate-spin" size={48} color="#724AE3" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="dash-card" style={{ textAlign: 'center', padding: 60 }}>
              <Briefcase size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>No Cases Found</h3>
              <p style={{ color: '#888', fontSize: 14 }}>You don't have any cases yet or no cases match your filters.</p>
            </div>
          ) : (
            <div className="dash-card">
              <div className="card-body" style={{ padding: '0 22px 18px', overflowX: 'auto' }}>
                <table className="cases-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Client Name</th>
                      <th>Case Type</th>
                      <th>Current Stage</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: '#1A0A3E' }}>{c.id.slice(0, 8)}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1A0A3E' }}>
                            {c.client?.full_name || 'Client'}
                          </span>
                        </td>
                        <td>{c.case_type ? c.case_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}</td>
                        <td>
                          <span className={`stage-badge ${getStageClass(c.current_stage)}`}>
                            {c.current_stage || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(c.status)}`}>
                            {c.status || 'N/A'}
                          </span>
                        </td>
                        <td style={{ color: '#666' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <button
                            onClick={() => navigate(`/advocate/cases/${c.id}`)}
                            style={{
                              padding: '6px 12px',
                              background: '#F0EBF9',
                              border: 'none',
                              borderRadius: 8,
                              color: '#724AE3',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            View <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCases;