import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';
import {
  Home, Briefcase, Search, Calendar, FileText, DollarSign,
  MessageSquare, Users, Settings, ChevronDown, ChevronRight,
  Trophy, MapPin, Award, Star
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', badge: 5, path: '/advocate/dashboard' },
  { icon: Briefcase, label: 'My Cases', hasChevron: true, path: '/advocate/cases' },
  { icon: Search, label: 'Case Tracker', path: '/advocate/case-tracker' },
  { icon: Calendar, label: 'Calendar', badge: 4, path: '/advocate/calendar' },
  { icon: FileText, label: 'Requests', badge: 2, path: '/advocate/requests' },
  { icon: FileText, label: 'Documents', path: '/advocate/documents' },
  { icon: DollarSign, label: 'Payments', badge: 2, path: '/advocate/payments' },
  { icon: MessageSquare, label: 'Messages', path: '/advocate/messages' },
  { icon: Users, label: 'Find Clients', path: '/advocate/find-clients' },
  { icon: Settings, label: 'Settings', path: '/advocate/settings' },
];

const Sidebar = ({ isOpen, onClose, userName = 'Rahul Sharma' }) => {
  const navigate = useNavigate();
  const location = useLocation();
    const { user } = useAuth();
  const avatarUrl = getAvatarUrl(user, { size: 100 });

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        data-testid="sidebar-overlay"
      />
      <aside className={`adv-sidebar ${isOpen ? 'open' : ''}`} data-testid="advocate-sidebar">
        {/* Profile Section */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={avatarUrl}
              alt="Profile"
              className="profile-avatar"
              data-testid="sidebar-profile-avatar"
              onError={handleAvatarError(user)}
            />
            <div>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
                {userName}
              </p>
              <p style={{ color: '#B3A8C0', fontSize: 12, fontWeight: 400, margin: 0 }}>
                Family Law Specialist
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '8px 0', flex: 1 }}>
          {navItems.map((item, i) => (
            <div
              key={item.label}
               className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => handleNavClick(item)}
              style={{ cursor: 'pointer' }}
            >
              <item.icon size={18} style={{ opacity: 0.9, flexShrink: 0 }} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
              {item.hasChevron && (
                <ChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              )}
            </div>
          ))}
        </nav>

        {/* Upgrade Card */}
        <div className="upgrade-card" data-testid="upgrade-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Trophy size={22} style={{ color: '#FFD700' }} />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
              Unlock More Leads!
            </span>
          </div>
          <p style={{ color: '#D0C7DD', fontSize: 11, lineHeight: 1.5, margin: '0 0 12px' }}>
            Get Premium Access to receive better client matches and more case opportunities.
          </p>
          <button className="btn-gold" data-testid="upgrade-now-btn">
            Upgrade Now <ChevronRight size={14} />
          </button>
        </div>

        {/* Bottom Profile */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img
              src={avatarUrl}
              alt="Profile"
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
              data-testid="sidebar-profile-avatar-bottom"
              onError={handleAvatarError(user)}
            />
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>
                {userName}
              </p>
              <p style={{ color: '#B3A8C0', fontSize: 11, margin: 0 }}>
                Family Law Specialist
              </p>
            </div>
            <Settings size={14} style={{ color: '#B3A8C0', marginLeft: 'auto', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B3A8C0', fontSize: 11 }}>
            <MapPin size={12} />
            <span>Delhi, India</span>
            <span style={{ margin: '0 4px' }}>|</span>
            <span style={{ opacity: 0.6 }}>&#9679;</span>
          </div>
          <div style={{ color: '#B3A8C0', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Award size={12} />
            <span>Bar Council ID: C12345678</span>
          </div>
          <div style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,193,7,0.1))',
            borderRadius: 8,
            padding: '6px 12px',
            width: 'fit-content'
          }}>
            <Star size={14} style={{ color: '#FFD700', fill: '#FFD700' }} />
            <span style={{ color: '#FFD700', fontSize: 12, fontWeight: 600 }}>Premium</span>
            <ChevronRight size={12} style={{ color: '#FFD700' }} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
