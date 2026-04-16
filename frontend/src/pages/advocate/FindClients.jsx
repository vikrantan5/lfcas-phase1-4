import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Users } from 'lucide-react';
import '../../styles/advocate-dashboard.css';

const FindClients = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="adv-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="dash-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="dash-content" style={{ padding: '24px' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: 80 }}>
            <Users size={64} color="#724AE3" style={{ margin: '0 auto 20px', opacity: 0.3 }} />
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', marginBottom: 12 }}>
              Find New Clients
            </h1>
            <p style={{ fontSize: 16, color: '#888', marginBottom: 24 }}>
              Browse potential clients looking for legal assistance. Expand your practice.
            </p>
            <p style={{ fontSize: 14, color: '#724AE3', fontWeight: 600 }}>
              Coming Soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindClients;