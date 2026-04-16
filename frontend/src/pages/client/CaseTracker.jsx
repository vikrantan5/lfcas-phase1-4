import React, { useState, useEffect } from 'react';
import { caseAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { CheckCircle, Clock, AlertCircle, Scale, FileText, Gavel, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';

const CaseTracker = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [stageHistory, setStageHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const STAGE_FLOW = [
    { key: 'INITIATED', label: 'Case Initiated', icon: FileText, description: 'Case created and assigned' },
    { key: 'PETITION_FILED', label: 'Petition Filed', icon: FileText, description: 'Legal petition submitted to court' },
    { key: 'COURT_REVIEW', label: 'Under Court Review', icon: Scale, description: 'Court reviewing the case' },
    { key: 'HEARING_SCHEDULED', label: 'Hearing Scheduled', icon: Gavel, description: 'Hearing date set' },
    { key: 'HEARING_DONE', label: 'Hearing Completed', icon: CheckCircle, description: 'Hearing conducted' },
    { key: 'JUDGMENT_PENDING', label: 'Judgment Pending', icon: Clock, description: 'Awaiting court decision' },
    { key: 'CLOSED', label: 'Case Closed', icon: CheckCircle, description: 'Final judgment issued' },
  ];

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadStageHistory(selectedCase);
    }
  }, [selectedCase]);

  const loadCases = async () => {
    setLoading(true);
    try {
      const response = await caseAPI.list();
      setCases(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedCase(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
      toast({ title: "Error", description: "Failed to load cases", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadStageHistory = async (caseId) => {
    setLoading(true);
    try {
      const response = await caseAPI.getStageHistory(caseId);
      setStageHistory(response.data || []);
    } catch (error) {
      console.error('Failed to load stage history:', error);
      setStageHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCase = () => cases.find(c => c.id === selectedCase);
  
  const getStageStatus = (stageKey) => {
    const currentCase = getCurrentCase();
    if (!currentCase) return 'pending';
    
    const currentStageIndex = STAGE_FLOW.findIndex(s => s.key === currentCase.current_stage);
    const thisStageIndex = STAGE_FLOW.findIndex(s => s.key === stageKey);
    
    if (thisStageIndex < currentStageIndex) return 'completed';
    if (thisStageIndex === currentStageIndex) return 'active';
    return 'pending';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const currentCase = getCurrentCase();

  return (
    <div className="p-6 space-y-6" data-testid="case-tracker-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Case Tracker</h1>
        <p className="text-slate-600 mt-1">Track your case progress through each legal stage</p>
      </div>

      {/* Case Selector */}
      <Card className="p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Case to Track</label>
          <Select value={selectedCase} onValueChange={setSelectedCase}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a case" />
            </SelectTrigger>
            <SelectContent>
              {cases.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title || `${c.case_type} Case`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      ) : currentCase ? (
        <>
          {/* Case Overview */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{currentCase.title}</h2>
                <p className="text-slate-600 mt-1">{currentCase.case_type}</p>
              </div>
              <Badge className="bg-violet-100 text-violet-700 px-4 py-2">
                {currentCase.current_stage?.replace('_', ' ')}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-sm text-slate-500">Filed On</p>
                <p className="font-semibold text-slate-900">{formatDate(currentCase.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Current Stage</p>
                <p className="font-semibold text-slate-900">
                  {STAGE_FLOW.find(s => s.key === currentCase.current_stage)?.label || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Advocate</p>
                <p className="font-semibold text-slate-900">{currentCase.advocate?.user?.full_name || 'Not Assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Location</p>
                <p className="font-semibold text-slate-900">{currentCase.location}</p>
              </div>
            </div>
          </Card>

          {/* Stage Timeline */}
          <Card className="p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-8">Case Progress Timeline</h3>
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200" />

              <div className="space-y-8">
                {STAGE_FLOW.map((stage, index) => {
                  const status = getStageStatus(stage.key);
                  const stageInfo = stageHistory.find(h => h.to_stage === stage.key);
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} className="relative flex gap-6" data-testid={`stage-${stage.key}`}>
                      {/* Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-green-100' :
                        status === 'active' ? 'bg-violet-100' :
                        'bg-slate-100'
                      }`}>
                        <Icon className={`${
                          status === 'completed' ? 'text-green-600' :
                          status === 'active' ? 'text-violet-600' :
                          'text-slate-400'
                        }`} size={20} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-semibold ${
                            status === 'active' ? 'text-violet-700' : 'text-slate-900'
                          }`}>
                            {stage.label}
                          </h4>
                          {stageInfo && (
                            <span className="text-sm text-slate-500">
                              {formatDate(stageInfo.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{stage.description}</p>
                        
                        {status === 'completed' && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <CheckCircle size={12} className="mr-1" />
                            Completed
                          </Badge>
                        )}
                        {status === 'active' && (
                          <Badge className="bg-violet-100 text-violet-700 text-xs">
                            <Clock size={12} className="mr-1" />
                            In Progress
                          </Badge>
                        )}
                        
                        {stageInfo?.notes && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700">
                              <strong>Note:</strong> {stageInfo.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Stage History Details */}
          {stageHistory.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Complete Stage History</h3>
              <div className="space-y-3">
                {stageHistory.map((history, index) => (
                  <div 
                    key={history.id || index} 
                    className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg"
                    data-testid={`history-item-${index}`}
                  >
                    <ArrowRight className="text-violet-600 mt-1" size={18} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-slate-900">
                          {history.from_stage ? 
                            `${history.from_stage.replace('_', ' ')} → ${history.to_stage.replace('_', ' ')}` :
                            history.to_stage.replace('_', ' ')
                          }
                        </p>
                        <span className="text-sm text-slate-500">{formatDate(history.created_at)}</span>
                      </div>
                      {history.notes && <p className="text-sm text-slate-600">{history.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <Scale className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Cases to Track</h3>
          <p className="text-slate-500">You don't have any cases yet. Start by creating a new case.</p>
        </Card>
      )}
    </div>
  );
};

export default CaseTracker;
