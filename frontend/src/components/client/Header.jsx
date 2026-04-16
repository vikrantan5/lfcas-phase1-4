import React from 'react';
import { Menu, Bell, Search } from 'lucide-react';

const Header = ({ onToggleSidebar, userName }) => {
  return (
    <header style={{
      background: '#fff',
      padding: '16px 28px',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left: Menu button + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={24} color="#374151" />
        </button>

        <div style={{
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 280
        }}>
          <Search size={18} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search cases, documents..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: '#374151',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bell size={20} color="#374151" />
          <span style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#EF4444'
          }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14
          }}>
            {userName?.charAt(0) || 'U'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
              {userName || 'User'}
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
              Client
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
