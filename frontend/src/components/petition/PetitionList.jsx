import React, { useState, useEffect } from 'react';
import { FileText, Download, Send, Calendar, CheckCircle, Clock, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { petitionAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const PetitionList = ({ caseId, userRole }) => {
  const { toast } = useToast();
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const fetchPetitions = async () => {
    try {
      const response = await petitionAPI.listByCase(caseId);
      setPetitions(response.data || []);
    } catch (error) {
      console.error('Fetch petitions error:', error);
      toast({
        title: "Error",
        description: "Failed to load petitions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchPetitions();
    }
  }, [caseId]);

  const handleSubmit = async (petitionId) => {
    setSubmitting(petitionId);
    try {
      await petitionAPI.submit(petitionId);
      toast({
        title: "Petition Submitted",
        description: "Client has been notified"
      });
      fetchPetitions();
    } catch (error) {
      console.error('Submit petition error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to submit petition",
        variant: "destructive"
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDownload = (petition) => {
    window.open(petition.document_url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (petitions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No petitions yet</p>
        {userRole === 'advocate' && (
          <p className="text-sm text-gray-500 mt-2">Create a petition to get started</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="petition-list">
      {petitions.map((petition, index) => (
        <motion.div
          key={petition.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{petition.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    {petition.status === 'submitted' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Draft
                      </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(petition.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              
              {petition.description && (
                <p className="text-sm text-gray-600 mt-3 ml-13">{petition.description}</p>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              <Button
                data-testid={`view-petition-${petition.id}`}
                onClick={() => handleDownload(petition)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </Button>
              
              {userRole === 'advocate' && petition.status === 'draft' && (
                <Button
                  data-testid={`submit-petition-${petition.id}`}
                  onClick={() => handleSubmit(petition.id)}
                  disabled={submitting === petition.id}
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {submitting === petition.id ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {petition.submitted_at && (
            <div className="mt-3 ml-13 text-xs text-gray-500">
              Submitted on {format(new Date(petition.submitted_at), 'MMM dd, yyyy h:mm a')}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default PetitionList;