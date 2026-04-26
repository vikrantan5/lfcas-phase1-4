import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';
import { 
  Home, Briefcase, FileText, Calendar, Search, UserCheck, 
  MessageSquare, Download, BookOpen, Settings, DollarSign, X, Scale
} from 'lucide-react';
import '../../styles/client-dashboard.css';

const Sidebar = ({ isOpen, onClose, userName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const displayName = userName || user?.full_name || 'User';
  const avatarUrl = getAvatarUrl(user || { full_name: displayName }, { size: 80, background: '60A5FA', color: 'fff' });

  const sidebarSections = [
    {
      title: 'CASE MANAGEMENT',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/client/dashboard' },
        { id: 'documents', label: 'Documents', icon: FileText, path: '/client/dashboard' },
        { id: 'case-tracker', label: 'Case Tracker', icon: Briefcase, path: '/client/dashboard' },
          { id: 'petitions', label: 'Petitions', icon: Scale, path: '/client/petitions' },
        { id: 'hearings', label: 'Hearings & Reminders', icon: Calendar, path: '/client/dashboard' },
      ]
    },
    {
      title: 'FINANCIAL',
      items: [
        { id: 'payments', label: 'Payments', icon: DollarSign, path: '/client/payments' },
      ]
    },
    {
      title: 'ADVOCATES',
      items: [
        { id: 'find-advocates', label: 'Find Advocates', icon: Search, path: '/client/dashboard' },
        { id: 'my-advocate', label: 'My Advocate', icon: UserCheck, path: '/client/dashboard' },
        { id: 'meeting-requests', label: 'Meeting Requests', icon: MessageSquare, path: '/client/dashboard' },
      ]
    },
    {
      title: 'MORE',
      items: [
        { id: 'downloads', label: 'Downloads', icon: Download, path: '/client/dashboard' },
        { id: 'legal-resources', label: 'Legal Resources', icon: BookOpen, path: '/client/dashboard' },
        { id: 'settings', label: 'Settings', icon: Settings, path: '/client/dashboard' },
      ]
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            display: isOpen ? 'block' : 'none'
          }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`lfcas-sidebar ${isOpen ? 'open' : ''}`}
        style={{
          background: 'linear-gradient(180deg, #1E40AF 0%, #1E3A8A 100%)',
          width: 240,
          minHeight: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          overflowY: 'auto'
        }}
      >
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: isOpen ? 'block' : 'none'
          }}
        >
          <X size={24} />
        </button>

        {/* Logo/Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>
            LFCAS
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
            Legal Case Advisor
          </p>
        </div>

        {/* Navigation */}
        <div style={{ padding: '16px 0', flex: 1 }}>
          {sidebarSections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <p style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                color: 'rgba(255,255,255,0.5)', 
                padding: '0 20px 8px',
                letterSpacing: '0.5px'
              }}>
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #60A5FA' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Info */}
        <div style={{
          padding: 20,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={avatarUrl}
              alt={displayName}
              data-testid="client-sidebar-avatar"
              onError={handleAvatarError({ full_name: displayName })}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.2)',
                background: '#60A5FA'
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Client
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
