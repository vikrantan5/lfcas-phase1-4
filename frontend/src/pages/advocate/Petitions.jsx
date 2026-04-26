import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Send, Calendar, CheckCircle, Clock, ArrowLeft, Menu, Plus, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { petitionAPI, caseAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import Sidebar from '../../components/advocate/Sidebar';
import PetitionForm from '../../components/advocate/PetitionForm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';

const AdvocatePetitions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [petitions, setPetitions] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        petitionAPI.listMine(),
        caseAPI.list(),
      ]);
      setPetitions(pRes.data || []);
      setCases(cRes.data || []);
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

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (petitionId) => {
    setSubmitting(petitionId);
    try {
      await petitionAPI.submit(petitionId);
      toast({ title: 'Submitted', description: 'Petition submitted. Client notified.' });
      load();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.detail || 'Failed to submit',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.full_name}
      />

      <div className="flex-1" style={{ marginLeft: sidebarOpen && window.innerWidth >= 1024 ? 260 : 0 }}>
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="adv-petitions-menu-btn"
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/advocate/dashboard')} data-testid="adv-petitions-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">Petitions</h1>
            <p className="text-sm text-slate-500">Create and manage petitions for your cases</p>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowCreate(true)}
            data-testid="adv-petitions-create-btn"
            disabled={cases.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" /> New Petition
          </Button>
        </header>

        <main className="p-6 max-w-5xl mx-auto" data-testid="adv-petitions-main">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : petitions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No petitions yet</h3>
              <p className="text-slate-500 mt-2">
                {cases.length === 0
                  ? 'You need an assigned case before creating a petition.'
                  : 'Click "New Petition" to create your first petition.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="adv-petitions-list">
              {petitions.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{p.title}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {p.status === 'submitted' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                <Clock className="w-3 h-3" /> Draft
                              </span>
                            )}
                            <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(p.created_at), 'MMM dd, yyyy')}
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
                        onClick={() => window.open(p.document_url, '_blank')}
                        data-testid={`adv-view-petition-${p.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      {p.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleSubmit(p.id)}
                          disabled={submitting === p.id}
                          data-testid={`adv-submit-petition-${p.id}`}
                        >
                          {submitting === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" /> Submit
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Petition</DialogTitle>
            <DialogDescription>Select a case and upload the petition PDF.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Case</label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger data-testid="adv-petition-case-select">
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title || `Case ${c.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCaseId && (
              <PetitionForm
                caseId={selectedCaseId}
                onSuccess={() => {
                  setShowCreate(false);
                  setSelectedCaseId('');
                  load();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvocatePetitions;
