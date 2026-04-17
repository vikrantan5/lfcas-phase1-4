import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { caseAPI, documentAPI, hearingAPI, messageAPI, paymentAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { 
  Scale, ArrowLeft, FileText, Calendar, MessageSquare, Upload, User, 
  Clock, CheckCircle, AlertCircle, Loader2, Download, Send, Briefcase, Plus 
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const AdvocateCaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, joinCaseRoom, leaveCaseRoom, onNewMessage, offNewMessage } = useSocket();
  const messagesEndRef = useRef(null);
  const { toast } = useToast();
  
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [stageHistory, setStageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Hearing Dialog State
  const [showHearingDialog, setShowHearingDialog] = useState(false);
  const [hearingData, setHearingData] = useState({
    hearing_date: '',
    court_name: '',
    court_room: '',
    notes: ''
  });
  const [schedulingHearing, setSchedulingHearing] = useState(false);

  // Case Stage Update State
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  // Payment Request State
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    due_date: ''
  });
  const [requestingPayment, setRequestingPayment] = useState(false);

  const caseStages = [
    { value: 'INITIATED', label: 'Initiated' },
    { value: 'PETITION_FILED', label: 'Petition Filed' },
    { value: 'COURT_REVIEW', label: 'Court Review' },
    { value: 'HEARING_SCHEDULED', label: 'Hearing Scheduled' },
    { value: 'HEARING_DONE', label: 'Hearing Done' },
    { value: 'JUDGMENT_PENDING', label: 'Judgment Pending' },
    { value: 'CLOSED', label: 'Closed' }
  ];

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  // Socket.IO real-time messaging
  useEffect(() => {
    if (caseId && connected) {
      joinCaseRoom(caseId);
      onNewMessage((message) => {
        if (message.case_id === caseId) {
          setMessages((prevMessages) => {
            const exists = prevMessages.some(m => 
              m.content === message.content && 
              m.sender_id === message.sender_id &&
              new Date(m.created_at).getTime() === new Date(message.created_at).getTime()
            );
            if (!exists) {
              return [...prevMessages, message];
            }
            return prevMessages;
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      });

      return () => {
        leaveCaseRoom(caseId);
        offNewMessage();
      };
    }
  }, [caseId, connected, joinCaseRoom, leaveCaseRoom, onNewMessage, offNewMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCaseDetails = async () => {
    try {
      const [caseRes, docsRes, hearingsRes, messagesRes, historyRes] = await Promise.all([
        caseAPI.getById(caseId),
        documentAPI.getByCaseId(caseId),
        hearingAPI.getByCaseId(caseId),
        messageAPI.getByCaseId(caseId),
        caseAPI.getStageHistory(caseId).catch(() => ({ data: [] }))
      ]);

      setCaseData(caseRes.data);
      setDocuments(docsRes.data || []);
      setHearings(hearingsRes.data || []);
      setMessages(messagesRes.data || []);
      setStageHistory(historyRes.data || []);
    } catch (error) {
      console.error('Failed to load case details:', error);
      toast({
        title: "Error",
        description: "Failed to load case details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('document_name', file.name);
      formData.append('document_type', 'legal_document');
      formData.append('description', file.name);

      await documentAPI.upload(formData);
      await loadCaseDetails();
      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded successfully."
      });
    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await messageAPI.send({
        case_id: caseId,
        content: newMessage,
        message_type: 'text'
      });
      
      const optimisticMessage = {
        id: response.data?.id || `temp-${Date.now()}`,
        case_id: caseId,
        sender_id: user.id,
        content: newMessage,
        created_at: new Date().toISOString(),
        message_type: 'text',
        is_read: false
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Message Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleScheduleHearing = async (e) => {
    e.preventDefault();
    setSchedulingHearing(true);
    
    try {
      await hearingAPI.create({
        case_id: caseId,
        hearing_date: new Date(hearingData.hearing_date).toISOString(),
        court_name: hearingData.court_name,
        court_room: hearingData.court_room || undefined,
        notes: hearingData.notes || undefined
      });
      
      toast({
        title: "Hearing Scheduled",
        description: "The court hearing has been scheduled successfully."
      });
      
      setShowHearingDialog(false);
      setHearingData({
        hearing_date: '',
        court_name: '',
        court_room: '',
        notes: ''
      });
      await loadCaseDetails();
    } catch (error) {
      console.error('Failed to schedule hearing:', error);
      toast({
        title: "Scheduling Failed",
        description: error.response?.data?.detail || "Failed to schedule hearing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSchedulingHearing(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!newStage) return;
    
    setUpdatingStage(true);
    
    try {
      await caseAPI.updateStage(caseId, {
        new_stage: newStage,
        notes: stageNotes || undefined
      });
      
      toast({
        title: "Stage Updated",
        description: `Case stage has been updated to ${newStage.replace('_', ' ')}.`
      });
      
      setShowStageDialog(false);
      setNewStage('');
      setStageNotes('');
      await loadCaseDetails();
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Failed to update case stage.",
        variant: "destructive"
      });
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleRequestPayment = async () => {
    if (!paymentData.amount || !paymentData.description) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setRequestingPayment(true);
    try {
      await paymentAPI.createRequest({
        case_id: caseId,
        amount: parseFloat(paymentData.amount),
        description: paymentData.description,
        due_date: paymentData.due_date || null
      });

      toast({ title: "Success", description: "Payment request sent to client" });
      setShowPaymentDialog(false);
      setPaymentData({ amount: '', description: '', due_date: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create payment request",
        variant: "destructive"
      });
    } finally {
      setRequestingPayment(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      initiated: 'bg-blue-100 text-blue-800',
      petition_filed: 'bg-purple-100 text-purple-800',
      court_review: 'bg-indigo-100 text-indigo-800',
      hearing_scheduled: 'bg-orange-100 text-orange-800',
      hearing_done: 'bg-teal-100 text-teal-800',
      judgment_pending: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-green-100 text-green-800',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCaseType = (type) => {
    return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LFCAS</h1>
                <p className="text-xs text-gray-500">Case Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setShowPaymentDialog(true)} variant="default">
                <Plus className="w-4 h-4 mr-2" />
                Request Payment
              </Button>
              <Button onClick={() => setShowHearingDialog(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Hearing
              </Button>
              <Button variant="outline" onClick={() => setShowStageDialog(true)}>
                Update Stage
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Case Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <CardTitle className="text-2xl">{caseData.title}</CardTitle>
                  <Badge className={getStatusColor(caseData.current_stage || caseData.status)}>
                    {caseData.current_stage?.replace('_', ' ') || caseData.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="text-base">{caseData.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Briefcase className="w-4 h-4 mr-2" />
                {formatCaseType(caseData.case_type)}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Case ID</p>
                <p className="font-medium">{caseData.id.substring(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">{caseData.client?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created On</p>
                <p className="font-medium">{formatDate(caseData.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents">
              <Upload className="w-4 h-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="hearings">
              <Calendar className="w-4 h-4 mr-2" />
              Hearings ({hearings.length})
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {caseData.ai_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Legal Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {caseData.legal_sections && caseData.legal_sections.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Applicable Legal Sections</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {caseData.legal_sections.map((section, i) => (
                          <li key={i} className="text-gray-700">{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {caseData.required_documents && caseData.required_documents.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Required Documents</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {caseData.required_documents.map((doc, i) => (
                          <li key={i} className="text-gray-700">{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {caseData.procedural_guidance && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Procedural Guidance</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{caseData.procedural_guidance}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Case Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 bg-green-100 p-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Case Created</p>
                      <p className="text-sm text-gray-600">{formatDate(caseData.created_at)}</p>
                    </div>
                  </div>

                  {hearings.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 bg-purple-100 p-2 rounded-full">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{hearings.length} Hearing(s) Scheduled</p>
                        <p className="text-sm text-gray-600">
                          Next: {hearings[0] && formatDate(hearings[0].hearing_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Documents</CardTitle>
                <CardDescription>Upload and manage case documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">Upload documents (PDF, Images)</p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <Button
                    onClick={() => document.getElementById('file-upload').click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                    ) : (
                      <>Choose File</>
                    )}
                  </Button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium">{doc.document_name}</p>
                            <p className="text-sm text-gray-600">
                              {doc.document_type} • {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.cloudinary_url, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hearings Tab */}
          <TabsContent value="hearings" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Court Hearings</CardTitle>
                    <CardDescription>Scheduled hearing dates and details</CardDescription>
                  </div>
                  <Button onClick={() => setShowHearingDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Hearing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {hearings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No hearings scheduled yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hearings.map((hearing) => (
                      <div
                        key={hearing.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">
                                {formatDate(hearing.hearing_date)}
                              </p>
                            </div>
                          </div>
                          {hearing.is_completed ? (
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">Upcoming</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Court Name</p>
                            <p className="font-medium">{hearing.court_name}</p>
                          </div>
                          {hearing.court_room && (
                            <div>
                              <p className="text-gray-600">Court Room</p>
                              <p className="font-medium">{hearing.court_room}</p>
                            </div>
                          )}
                        </div>

                        {hearing.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Notes</p>
                            <p className="text-sm">{hearing.notes}</p>
                          </div>
                        )}

                        {hearing.outcome && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Outcome</p>
                            <p className="text-sm font-medium">{hearing.outcome}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Communicate with your client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 rounded-lg p-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No messages yet</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <div
                          key={msg.id || `${msg.sender_id}-${msg.created_at}`}
                          className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.sender_id === user.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-blue-100' : 'text-gray-600'}`}>
                              {formatDate(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Timeline</CardTitle>
                <CardDescription>Track all case stage changes</CardDescription>
              </CardHeader>
              <CardContent>
                {stageHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No stage history available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stageHistory.map((history, index) => (
                      <div key={history.id} className="flex items-start space-x-4">
                        <div className="flex flex-col items-center">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          {index < stageHistory.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-900">
                              {history.from_stage ? `${history.from_stage} → ` : ''}{history.to_stage}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(history.created_at)}
                            </p>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-gray-600">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Schedule Hearing Dialog */}
      <Dialog open={showHearingDialog} onOpenChange={setShowHearingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Court Hearing</DialogTitle>
            <DialogDescription>
              Set the date and details for the court hearing
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleHearing} className="space-y-4">
            <div>
              <Label>Hearing Date & Time</Label>
              <Input
                type="datetime-local"
                value={hearingData.hearing_date}
                onChange={(e) => setHearingData({...hearingData, hearing_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Court Name</Label>
              <Input
                value={hearingData.court_name}
                onChange={(e) => setHearingData({...hearingData, court_name: e.target.value})}
                placeholder="e.g., District Court"
                required
              />
            </div>

            <div>
              <Label>Court Room (Optional)</Label>
              <Input
                value={hearingData.court_room}
                onChange={(e) => setHearingData({...hearingData, court_room: e.target.value})}
                placeholder="e.g., Room 201"
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={hearingData.notes}
                onChange={(e) => setHearingData({...hearingData, notes: e.target.value})}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowHearingDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={schedulingHearing}>
                {schedulingHearing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Hearing'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Stage Dialog */}
      <Dialog open={showStageDialog} onOpenChange={setShowStageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Case Stage</DialogTitle>
            <DialogDescription>
              Update the current stage of the case
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Stage</Label>
              <Input value={caseData?.current_stage || caseData?.status} disabled />
            </div>

            <div>
              <Label>New Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new stage" />
                </SelectTrigger>
                <SelectContent>
                  {caseStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                placeholder="Reason for stage change..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowStageDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStage} 
                disabled={updatingStage || !newStage}
              >
                {updatingStage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Stage'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Request Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment from Client</DialogTitle>
            <DialogDescription>
              Send a payment request to the client for legal services
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleRequestPayment();
          }} className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this payment is for (e.g., Consultation fee, Court filing fees, etc.)"
                value={paymentData.description}
                onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Due Date (Optional)</Label>
              <Input
                type="date"
                value={paymentData.due_date}
                onChange={(e) => setPaymentData({...paymentData, due_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">Set a deadline for payment if applicable</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setShowPaymentDialog(false);
                  setPaymentData({ amount: '', description: '', due_date: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={requestingPayment}>
                {requestingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Payment Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvocateCaseDetail;