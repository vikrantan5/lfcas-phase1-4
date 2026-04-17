import React from 'react';
import { Menu, Search, Bell, MessageSquare, Star } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';

const DashboardHeader = ({ onToggleSidebar, userName = 'Rahul Sharma' }) => {
  const { user } = useAuth();
  const avatarUrl = getAvatarUrl(user, { size: 40 });

  return (
    <header className="adv-header" data-testid="dashboard-header">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          data-testid="toggle-sidebar-btn"
        >
          <Menu size={22} color="#3D0072" />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A0A3E', margin: 0, lineHeight: 1.3 }}>
            Good morning, {userName} <span role="img" aria-label="wave">&#x1F44B;</span>
          </h1>
          <p style={{ fontSize: 12, color: '#888', margin: 0, fontWeight: 400 }}>
            Welcome back! Here's an overview of your activity and case management today.
          </p>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Search */}
        <div className="search-bar" data-testid="header-search">
          <Search size={16} color="#AAA" />
          <input placeholder="Search cases, clients, documents..." />
        </div>

        {/* Notifications */}
  <NotificationDropdown />

        {/* Messages */}
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          data-testid="messages-icon"
        >
          <MessageSquare size={20} color="#4A4A4A" />
        </button>

        {/* Avatar */}
        <img
          src={avatarUrl}
          alt="User"
          className="profile-avatar-sm"
          data-testid="header-avatar"
          onError={handleAvatarError(user)}
        />

        {/* Get Premium */}
        {/* <button className="btn-premium" data-testid="get-premium-btn">
          <Star size={14} fill="#fff" />
          Get Premium
        </button> */}
      </div>
    </header>
  );
};

export default DashboardHeader;
