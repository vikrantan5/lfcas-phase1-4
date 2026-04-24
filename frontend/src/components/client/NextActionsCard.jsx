import React from 'react';
import { ArrowRight, Upload, UserPlus, Calendar, FileText, Send, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useNavigate } from 'react-router-dom';

const NextActionsCard = ({ cases, meetings, meetingRequests }) => {
  const navigate = useNavigate();

  const getNextAction = () => {
    // Priority 1: No cases → Start with AI or find advocates
    if (!cases || cases.length === 0) {
      return {
        priority: 'high',
        icon: Send,
        title: 'Start Your Legal Journey',
        description: 'Use our AI assistant to analyze your case and get matched with the right advocate',
        actionText: 'Talk to AI Assistant',
        actionClick: () => navigate('/client/ai-onboarding'),
        color: 'purple'
      };
    }

    // Get the most recent case
    const recentCase = cases[0];

    // Priority 2: Case exists but no advocate assigned
    if (!recentCase.advocate_id) {
      // Check if there are pending meeting requests
      const pending = meetingRequests?.filter(req => req.status === 'pending') || [];
      if (pending.length > 0) {
        return {
          priority: 'high',
          icon: Calendar,
          title: 'Awaiting Advocate Response',
          description: `You have ${pending.length} pending meeting request(s). Advocates will review and respond soon.`,
          actionText: 'View Meeting Requests',
          actionClick: () => navigate('/client/meeting-requests'),
          color: 'blue'
        };
      }

      // No advocate and no pending requests → find advocate
      return {
        priority: 'high',
        icon: UserPlus,
        title: 'Select an Advocate',
        description: 'Your case is ready. Browse advocates and send a meeting request to get started.',
        actionText: 'Find Advocates',
        actionClick: () => navigate('/client/find-advocates'),
        color: 'indigo'
      };
    }

    // Priority 3: Advocate assigned, check document status
    const caseDocuments = recentCase.documents || [];
    if (caseDocuments.length === 0) {
      return {
        priority: 'medium',
        icon: Upload,
        title: 'Upload Case Documents',
        description: 'Your advocate is waiting for supporting documents to proceed with your case.',
        actionText: 'Upload Documents',
        actionClick: () => navigate('/client/documents'),
        color: 'green'
      };
    }

    // Priority 4: Check upcoming hearings
    const upcomingMeetings = meetings?.filter(m => 
      m.status === 'scheduled' && new Date(m.scheduled_date) > new Date()
    ) || [];

    if (upcomingMeetings.length > 0) {
      const nextMeeting = upcomingMeetings[0];
      const meetingDate = new Date(nextMeeting.scheduled_date);
      const today = new Date();
      const daysUntil = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));

      return {
        priority: daysUntil <= 3 ? 'high' : 'medium',
        icon: Calendar,
        title: `Upcoming Meeting in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
        description: `Meeting with your advocate on ${meetingDate.toLocaleDateString()}`,
        actionText: 'View Details',
        actionClick: () => navigate('/client/meeting-requests'),
        color: 'orange'
      };
    }

    // Priority 5: Everything is on track
    return {
      priority: 'low',
      icon: CheckCircle,
      title: 'Case In Progress',
      description: 'Your case is being handled by your advocate. Check case tracker for updates.',
      actionText: 'View Case Tracker',
      actionClick: () => navigate('/client/case-tracker'),
      color: 'green'
    };
  };

  const action = getNextAction();
  const Icon = action.icon;

  const colorClasses = {
    purple: {
      bg: 'from-purple-500 to-violet-600',
      border: 'border-purple-200',
      cardBg: 'bg-gradient-to-br from-purple-50 to-violet-50',
      textAccent: 'text-purple-700'
    },
    blue: {
      bg: 'from-blue-500 to-cyan-600',
      border: 'border-blue-200',
      cardBg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      textAccent: 'text-blue-700'
    },
    indigo: {
      bg: 'from-indigo-500 to-blue-600',
      border: 'border-indigo-200',
      cardBg: 'bg-gradient-to-br from-indigo-50 to-blue-50',
      textAccent: 'text-indigo-700'
    },
    green: {
      bg: 'from-green-500 to-emerald-600',
      border: 'border-green-200',
      cardBg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      textAccent: 'text-green-700'
    },
    orange: {
      bg: 'from-orange-500 to-red-600',
      border: 'border-orange-200',
      cardBg: 'bg-gradient-to-br from-orange-50 to-red-50',
      textAccent: 'text-orange-700'
    }
  };

  const colors = colorClasses[action.color];

  return (
    <Card className={`${colors.cardBg} border-2 ${colors.border} overflow-hidden`} data-testid="next-actions-card">
      <div className={`h-2 bg-gradient-to-r ${colors.bg}`} />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{action.title}</h3>
              {action.priority === 'high' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-gray-700 mb-4">{action.description}</p>
            
            <Button
              onClick={action.actionClick}
              className={`bg-gradient-to-r ${colors.bg} hover:opacity-90`}
              data-testid="next-action-btn"
            >
              {action.actionText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NextActionsCard;
