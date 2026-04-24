import React from 'react';
import { CheckCircle, Clock, FileText, Gavel, Calendar, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const UnifiedTimeline = ({ caseData, stageHistory, hearings, petitions, documents }) => {
  // Combine all timeline events
  const timelineEvents = [];

  // Add stage history
  if (stageHistory && stageHistory.length > 0) {
    stageHistory.forEach(stage => {
      timelineEvents.push({
        type: 'stage',
        title: stage.to_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        date: new Date(stage.created_at),
        icon: CheckCircle,
        color: 'blue',
        notes: stage.notes
      });
    });
  }

  // Add petition submissions
  if (petitions && petitions.length > 0) {
    petitions.filter(p => p.status === 'submitted').forEach(petition => {
      timelineEvents.push({
        type: 'petition',
        title: `Petition Submitted: ${petition.title}`,
        date: new Date(petition.submitted_at || petition.created_at),
        icon: FileText,
        color: 'green',
        description: petition.description
      });
    });
  }

  // Add hearings
  if (hearings && hearings.length > 0) {
    hearings.forEach(hearing => {
      timelineEvents.push({
        type: 'hearing',
        title: `Hearing at ${hearing.court_name}`,
        date: new Date(hearing.hearing_date),
        icon: Gavel,
        color: 'purple',
        notes: hearing.notes
      });
    });
  }

  // Sort by date (newest first)
  timelineEvents.sort((a, b) => b.date - a.date);

  const getIconBgColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
    };
    return colors[color] || colors.blue;
  };

  if (timelineEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="unified-timeline">
      {timelineEvents.map((event, index) => {
        const Icon = event.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-4"
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full ${getIconBgColor(event.color)} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              {index < timelineEvents.length - 1 && (
                <div className="w-0.5 bg-gray-200 flex-1 my-2" style={{ minHeight: '20px' }}></div>
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(event.date, 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                {(event.notes || event.description) && (
                  <p className="text-sm text-gray-600 mt-3">{event.notes || event.description}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default UnifiedTimeline;