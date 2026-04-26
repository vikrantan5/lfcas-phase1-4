import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../services/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Bell, Check, X, Calendar, MessageSquare, FileText, 
  UserCheck, AlertCircle, Briefcase, Loader2 
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

const NotificationPanel = ({ darkMode = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
    const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await Promise.all(
        notifications.filter(n => !n.is_read).map(n => notificationAPI.markAsRead(n.id))
      );
      await loadNotifications();
      toast({
        title: "Success",
        description: "All notifications marked as read"
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Close the popover
    setOpen(false);

    // Navigate based on notification type
    const userRole = user?.role;
    const relatedId = notification.reference_id || notification.related_id;

    console.log('Notification click:', { 
      type: notification.notification_type, 
      relatedId, 
      userRole,
      referenceType: notification.reference_type 
    });

    // If no related ID and it's a case-related notification, try to navigate to dashboard
    if (!relatedId && (notification.notification_type === 'case_update' || notification.notification_type === 'case_approved')) {
      console.warn('No related_id for case notification, navigating to dashboard');
      if (userRole === 'client') {
        navigate('/client/dashboard');
      } else if (userRole === 'advocate') {
        navigate('/advocate/dashboard');
      }
      return;
    }

    switch (notification.notification_type) {
      case 'case_update':
      case 'case_approved':
        if (userRole === 'client' && relatedId) {
          navigate(`/client/cases/${relatedId}`);
        } else if (userRole === 'advocate' && relatedId) {
          navigate(`/advocate/cases/${relatedId}`);
        }
        break;

      case 'meeting_requested':
        if (userRole === 'advocate') {
          navigate('/advocate/requests');
        } else if (userRole === 'client') {
          navigate('/client/dashboard');
        }
        break;

      case 'meeting_scheduled':
      case 'meeting_accepted':
        if (userRole === 'advocate') {
          navigate('/advocate/meetings');
        } else if (userRole === 'client') {
          navigate('/client/dashboard');
        }
        break;

      case 'meeting_rejected':
        if (userRole === 'client') {
          navigate('/client/find-advocates');
        }
        break;

      case 'new_message':
        if (userRole === 'advocate') {
          navigate('/advocate/messages');
        } else if (userRole === 'client' && relatedId) {
          navigate(`/client/cases/${relatedId}`);
        }
        break;

      case 'hearing_reminder':
        if (userRole === 'advocate') {
          navigate('/advocate/calendar');
        } else if (userRole === 'client' && relatedId) {
          navigate(`/client/cases/${relatedId}`);
        }
        break;

      case 'document_uploaded':
        if (userRole === 'advocate') {
          navigate('/advocate/documents');
        } else if (userRole === 'client' && relatedId) {
          navigate(`/client/cases/${relatedId}`);
        }
        break;

      case 'advocate_assigned':
        if (userRole === 'client' && relatedId) {
          navigate(`/client/cases/${relatedId}`);
        }
        break;

      case 'case_rejected_by_advocate':
        if (userRole === 'client') {
          navigate('/client/find-advocates');
        }
        break;

      case 'petition_submitted':
        // Navigate to petitions page
        if (userRole === 'client') {
          navigate('/client/petitions');
        } else if (userRole === 'advocate') {
          navigate('/advocate/petitions');
        }
        break;

      case 'payment_request':
      case 'payment_received':
        if (userRole === 'client') {
          navigate('/client/payments');
        } else if (userRole === 'advocate') {
          navigate('/advocate/payments');
        }
        break;

      default:
        // For unknown types, try to navigate based on related_id
        if (relatedId) {
          // Try to determine the type from context
          if (notification.title?.toLowerCase().includes('petition')) {
            if (userRole === 'client') {
              navigate('/client/petitions');
            } else if (userRole === 'advocate') {
              navigate('/advocate/petitions');
            }
          } else if (notification.title?.toLowerCase().includes('case')) {
            if (userRole === 'client') {
              navigate(`/client/cases/${relatedId}`);
            } else if (userRole === 'advocate') {
              navigate(`/advocate/cases/${relatedId}`);
            }
          } else {
            // Default to dashboard
            if (userRole === 'client') {
              navigate('/client/dashboard');
            } else if (userRole === 'advocate') {
              navigate('/advocate/dashboard');
            }
          }
        } else {
          // No related_id, go to dashboard
          if (userRole === 'client') {
            navigate('/client/dashboard');
          } else if (userRole === 'advocate') {
            navigate('/advocate/dashboard');
          }
        }
        break;
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      case_update: <Briefcase className="w-4 h-4" />,
      hearing_reminder: <Calendar className="w-4 h-4" />,
      new_message: <MessageSquare className="w-4 h-4" />,
      document_uploaded: <FileText className="w-4 h-4" />,
      advocate_assigned: <UserCheck className="w-4 h-4" />,
      meeting_requested: <UserCheck className="w-4 h-4" />,
      meeting_accepted: <Check className="w-4 h-4" />,
      meeting_rejected: <X className="w-4 h-4" />,
      meeting_scheduled: <Calendar className="w-4 h-4" />,
      case_approved: <Check className="w-4 h-4" />,
      case_rejected_by_advocate: <AlertCircle className="w-4 h-4" />,
      petition_submitted: <FileText className="w-4 h-4" />,
      payment_request: <FileText className="w-4 h-4" />,
      payment_received: <Check className="w-4 h-4" />,
      system: <Bell className="w-4 h-4" />,
    };
    return iconMap[type] || <Bell className="w-4 h-4" />;
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      case_update: 'bg-blue-500',
      hearing_reminder: 'bg-purple-500',
      new_message: 'bg-green-500',
      document_uploaded: 'bg-indigo-500',
      advocate_assigned: 'bg-teal-500',
      meeting_requested: 'bg-yellow-500',
      meeting_accepted: 'bg-green-500',
      meeting_rejected: 'bg-red-500',
      meeting_scheduled: 'bg-blue-500',
      case_approved: 'bg-green-500',
      case_rejected_by_advocate: 'bg-red-500',
         petition_submitted: 'bg-indigo-500',
      payment_request: 'bg-yellow-500',
      payment_received: 'bg-green-500',
      system: 'bg-gray-500',
    };
    return colorMap[type] || 'bg-gray-500';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`relative ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="notifications-button"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center bg-red-500 text-white text-xs p-0 px-1"
              data-testid="unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-96 p-0 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`} 
        align="end"
      >
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className={darkMode ? 'hover:bg-gray-800' : ''}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Mark all read'
                )}
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className={`w-12 h-12 mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No notifications</p>
            </div>
          ) : (
               <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-opacity-50 transition-colors cursor-pointer ${
                    !notification.is_read 
                      ? (darkMode ? 'bg-gray-800/50' : 'bg-blue-50/50') 
                      : (darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
                  }`}
                   onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${getNotificationColor(notification.notification_type)} bg-opacity-10 flex-shrink-0`}>
                      <div className={`${getNotificationColor(notification.notification_type)} bg-opacity-100 text-white rounded p-1`}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
