import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, Calendar, CheckCircle, ArrowLeft, Menu } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { petitionAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import Sidebar from '../../components/client/Sidebar';

const ClientPetitions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await petitionAPI.listMine();
        setPetitions(data || []);
      } catch (err) {
        toast({
          title: 'Error',
          description: err.response?.data?.detail || 'Failed to load petitions',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.full_name}
      />

      <div className="flex-1" style={{ marginLeft: sidebarOpen && window.innerWidth >= 1024 ? 240 : 0 }}>
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="client-petitions-menu-btn"
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/client/dashboard')} data-testid="client-petitions-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Petitions</h1>
            <p className="text-sm text-slate-500">All petitions filed by your advocate for your cases</p>
          </div>
        </header>

        <main className="p-6 max-w-5xl mx-auto" data-testid="client-petitions-main">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : petitions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No petitions yet</h3>
              <p className="text-slate-500 mt-2">Once your advocate submits a petition for your case, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="client-petitions-list">
              {petitions.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition"
                  data-testid={`client-petition-row-${p.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{p.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Submitted
                            </span>
                            <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {p.submitted_at
                                ? format(new Date(p.submitted_at), 'MMM dd, yyyy')
                                : format(new Date(p.created_at), 'MMM dd, yyyy')}
                            </span>
                            {p.case?.title && (
                              <span className="text-xs text-slate-600">Case: {p.case.title}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {p.description && <p className="text-sm text-slate-600 mt-3">{p.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`client-view-petition-${p.id}`}
                        onClick={() => window.open(p.document_url, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        data-testid={`client-download-petition-${p.id}`}
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = p.document_url;
                          a.download = `${p.title}.pdf`;
                          a.target = '_blank';
                          a.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ClientPetitions;
