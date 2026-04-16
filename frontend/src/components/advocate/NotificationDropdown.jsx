import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock, AlertCircle, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.list({ limit: 20 });
      const notifs = response.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.related_id) {
      const type = notification.notification_type;
      if (type?.includes('case') || type?.includes('CASE')) {
        navigate(`/advocate/cases/${notification.related_id}`);
      } else if (type?.includes('meeting') || type?.includes('MEETING')) {
        navigate('/advocate/requests');
      } else if (type?.includes('document') || type?.includes('DOCUMENT')) {
        navigate('/advocate/documents');
      }
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const typeStr = type?.toLowerCase() || '';
    if (typeStr.includes('meeting')) return <Calendar size={16} />;
    if (typeStr.includes('document')) return <FileText size={16} />;
    if (typeStr.includes('message')) return <MessageSquare size={16} />;
    if (typeStr.includes('case')) return <AlertCircle size={16} />;
    return <Bell size={16} />;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        style={{ 
          position: 'relative', 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          padding: 6 
        }}
        data-testid="notifications-bell"
      >
        <Bell size={20} color="#4A4A4A" />
        {unreadCount > 0 && (
          <span className="notif-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: 380,
          maxHeight: 500,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E8E4F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span style={{
                fontSize: 12,
                color: '#724AE3',
                fontWeight: 600,
                background: '#F5F3FF',
                padding: '4px 10px',
                borderRadius: 12
              }}>
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#724AE3" style={{ margin: '0 auto' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Bell size={48} color="#DDD" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#888' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #F5F5F5',
                    cursor: 'pointer',
                    background: notification.is_read ? '#fff' : '#F5F3FF',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F9F9F9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notification.is_read ? '#fff' : '#F5F3FF'}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: notification.is_read ? '#F5F5F5' : '#E8DEFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#724AE3'
                    }}>
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1A0A3E',
                        margin: '0 0 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        {notification.title}
                        {!notification.is_read && (
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#724AE3',
                            flexShrink: 0
                          }} />
                        )}
                      </h4>
                      <p style={{
                        fontSize: 12,
                        color: '#666',
                        margin: '0 0 4px',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {notification.message}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: '#999'
                      }}>
                        <Clock size={10} />
                        <span>{formatTime(notification.created_at)}</span>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: '#724AE3',
                          flexShrink: 0
                        }}
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #E8E4F0',
              textAlign: 'center'
            }}>
              <button
                onClick={() => {
                  // Mark all as read
                  notifications.filter(n => !n.is_read).forEach(n => handleMarkAsRead(n.id));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#724AE3',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;