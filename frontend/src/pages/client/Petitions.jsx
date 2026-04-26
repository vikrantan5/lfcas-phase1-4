import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, Calendar, CheckCircle, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { petitionAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

const ClientPetitions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPetitions();
  }, []);

  const loadPetitions = async () => {
    try {
      setLoading(true);
      const { data } = await petitionAPI.listMine();
      setPetitions(data || []);
    } catch (err) {
      console.error('Failed to load petitions:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.detail || 'Failed to load petitions',
        variant: 'destructive',
      });
      // Set empty array to show no petitions state
      setPetitions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle case where petitionAPI might not be available
  if (!petitionAPI || typeof petitionAPI.listMine !== 'function') {
    return (
      <div className="p-6" data-testid="client-petitions-error">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <FileText className="w-14 h-14 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800">Petitions API Not Available</h3>
          <p className="text-yellow-600 mt-2">The petitions feature is currently being set up.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/client/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="client-petitions-main">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Petitions</h1>
          <p className="text-gray-600 mt-1">
            All petitions filed by your advocate for your cases
          </p>
        </div>
        <Button 
          onClick={() => navigate('/client/dashboard')}
          variant="outline"
          className="gap-2"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
        </div>
      ) : petitions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No petitions yet</h3>
          <p className="text-slate-500 mt-2">
            Once your advocate submits a petition for your case, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="client-petitions-list">
          {petitions.map((petition) => (
            <div
              key={petition.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              data-testid={`client-petition-row-${petition.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {petition.title || 'Petition Document'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Submitted
                        </span>
                        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {petition.submitted_at
                            ? format(new Date(petition.submitted_at), 'MMM dd, yyyy')
                            : format(new Date(petition.created_at), 'MMM dd, yyyy')}
                        </span>
                        {petition.case?.title && (
                          <span className="text-xs text-slate-600">
                            Case: {petition.case.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {petition.description && (
                    <p className="text-sm text-slate-600 mt-3 line-clamp-2">
                      {petition.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {petition.document_url && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`client-view-petition-${petition.id}`}
                        onClick={() => window.open(petition.document_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        data-testid={`client-download-petition-${petition.id}`}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = petition.document_url;
                          link.download = `${petition.title || 'petition'}.pdf`;
                          link.target = '_blank';
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientPetitions;