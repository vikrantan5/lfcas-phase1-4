import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Briefcase, CheckCircle, Loader2, Send, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { meetingRequestAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const AdvocateRecommendations = ({ 
  caseType, 
  location, 
  chatSessionId, 
  aiAnalysis 
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  React.useEffect(() => {
    fetchRecommendations();
  }, [caseType, location]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/advocate-recommendations?case_type=${caseType}&location=${location || ''}&limit=6`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setAdvocates(data.advocates || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load advocate recommendations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (advocate) => {
    setSending(advocate.id);
    try {
      const requestData = {
        advocate_id: advocate.id,
        case_type: caseType,
        description: aiAnalysis?.summary || "Legal consultation request",
        location: location || "Not specified",
        ai_analysis: aiAnalysis,
        chat_session_id: chatSessionId
      };

      await meetingRequestAPI.create(requestData);

      toast({
        title: "Request Sent! ✅",
        description: `Meeting request sent to ${advocate.user?.full_name || 'advocate'} with your case summary`
      });

      // Navigate to meeting requests page after 1.5 seconds
      setTimeout(() => {
        navigate('/client/meeting-requests');
      }, 1500);
    } catch (error) {
      console.error('Send request error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to send request",
        variant: "destructive"
      });
    } finally {
      setSending(null);
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-blue-600 bg-blue-50";
    return "text-orange-600 bg-orange-50";
  };

  const getMatchScoreLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Fair Match";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Finding best advocates for you...</span>
      </div>
    );
  }

  if (advocates.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No advocates available for this case type currently</p>
        <p className="text-sm text-gray-500 mt-2">Please try again later or contact support</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Recommended Advocates for Your Case
        </h2>
        <p className="text-gray-600">
          AI-matched based on specialization, location, experience, and ratings
        </p>
      </div>

      {/* Advocates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {advocates.map((advocate, index) => (
          <motion.div
            key={advocate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
              <CardContent className="p-6">
                {/* Match Score Badge */}
                <div className="flex justify-between items-start mb-4">
                  <Badge className={`${getMatchScoreColor(advocate.match_score)} font-semibold px-3 py-1`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {advocate.match_score}% {getMatchScoreLabel(advocate.match_score)}
                  </Badge>
                  {advocate.matched_specialization && (
                    <Badge variant="outline" className="text-xs">
                      Specializes in {advocate.matched_specialization}
                    </Badge>
                  )}
                </div>

                {/* Advocate Info */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={advocate.user?.profile_image_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                      {advocate.user?.full_name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {advocate.user?.full_name || 'Advocate'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Bar Council ID: {advocate.bar_council_id}
                    </p>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-gray-900">
                        {advocate.rating ? advocate.rating.toFixed(1) : 'New'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({advocate.total_cases || 0} cases)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{advocate.experience_years || 0} years experience</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{advocate.location || 'Location not specified'}</span>
                  </div>
                </div>

                {/* Specializations */}
                {advocate.specializations && advocate.specializations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Specializations:</p>
                    <div className="flex flex-wrap gap-1">
                      {advocate.specializations.slice(0, 3).map((spec, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {advocate.specializations.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{advocate.specializations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Bio Preview */}
                {advocate.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {advocate.bio}
                  </p>
                )}

                {/* Send Request Button */}
                <Button
                  onClick={() => handleSendRequest(advocate)}
                  disabled={sending === advocate.id}
                  className="w-full"
                  data-testid={`send-request-btn-${advocate.id}`}
                >
                  {sending === advocate.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Meeting Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdvocateRecommendations;
