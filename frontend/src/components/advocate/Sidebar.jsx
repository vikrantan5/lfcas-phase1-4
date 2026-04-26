import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { advocateAPI } from '../../services/api';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';
import {
  Home, Briefcase, Search, Calendar, FileText, DollarSign,
  MessageSquare, Users, Settings, ChevronDown, ChevronRight,
  Trophy, MapPin, Award, Star, Scale
} from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/advocate/dashboard' },
  { icon: Briefcase, label: 'My Cases', hasChevron: true, path: '/advocate/cases' },
  { icon: Search, label: 'Case Tracker', path: '/advocate/case-tracker' },
  { icon: Calendar, label: 'Calendar', path: '/advocate/calendar' },
  { icon: FileText, label: 'Requests', path: '/advocate/requests' },
  { icon: FileText, label: 'Documents', path: '/advocate/documents' },
  { icon: Scale, label: 'Petitions', path: '/advocate/petitions' },
  { icon: DollarSign, label: 'Payments', path: '/advocate/payments' },
  { icon: MessageSquare, label: 'Messages', path: '/advocate/messages' },
  { icon: Users, label: 'Find Clients', path: '/advocate/find-clients' },
  { icon: Settings, label: 'Settings', path: '/advocate/settings' },
];

// Map enum value → human readable
const CASE_TYPE_LABEL = {
  divorce: 'Divorce Law',
  child_custody: 'Child Custody',
  alimony: 'Alimony / Maintenance',
  domestic_violence: 'Domestic Violence',
  dowry: 'Dowry Law',
  property_dispute: 'Property Dispute',
  other: 'General Practice',
};

const formatSpecialization = (specs) => {
  if (!specs || !Array.isArray(specs) || specs.length === 0) return 'Advocate';
  const primary = CASE_TYPE_LABEL[specs[0]] || specs[0].replace(/_/g, ' ');
  return `${primary} Specialist`;
};

const Sidebar = ({ isOpen, onClose, userName, profile: profileProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const avatarUrl = getAvatarUrl(user, { size: 100 });
  const [profile, setProfile] = useState(profileProp || null);

  useEffect(() => {
    if (profileProp) {
      setProfile(profileProp);
      return;
    }
    // Fallback: load advocate profile if not passed as prop
    const loadProfile = async () => {
      try {
        const response = await advocateAPI.list();
        const mine = response.data?.find((adv) => adv.user_id === user?.id);
        if (mine) setProfile(mine);
      } catch (e) {
        // non-fatal
      }
    };
    if (user?.id) loadProfile();
  }, [profileProp, user?.id]);

  const displayName = userName || user?.full_name || 'Advocate';
  const specLabel = formatSpecialization(profile?.specializations);
  const locationLabel = profile?.location || 'Location not set';
  const barId = profile?.bar_council_id || 'Not Provided';

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    }
    if (window.innerWidth < 768) {
      onClose && onClose();
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
            <div style={{ minWidth: 0 }}>
              <p data-testid="sidebar-advocate-name" style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p data-testid="sidebar-advocate-spec" style={{ color: '#B3A8C0', fontSize: 12, fontWeight: 400, margin: 0 }}>
                {specLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '8px 0', flex: 1 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => handleNavClick(item)}
              style={{ cursor: 'pointer' }}
            >
              <item.icon size={18} style={{ opacity: 0.9, flexShrink: 0 }} />
              <span>{item.label}</span>
              {item.hasChevron && (
                <ChevronDown size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              )}
            </div>
          ))}
        </nav>

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
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ color: '#B3A8C0', fontSize: 11, margin: 0 }}>
                {specLabel}
              </p>
            </div>
            <Settings
              size={14}
              style={{ color: '#B3A8C0', marginLeft: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/advocate/settings')}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B3A8C0', fontSize: 11 }}>
            <MapPin size={12} />
            <span data-testid="sidebar-advocate-location">{locationLabel}</span>
          </div>
          <div data-testid="sidebar-advocate-barid" style={{ color: '#B3A8C0', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Award size={12} />
            <span>Bar Council ID: {barId}</span>
          </div>
          {profile?.experience_years ? (
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
              <span style={{ color: '#FFD700', fontSize: 12, fontWeight: 600 }}>
                {profile.experience_years}+ yrs exp
              </span>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
