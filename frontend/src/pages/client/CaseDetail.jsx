import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { caseAPI, documentAPI, hearingAPI, messageAPI, advocateAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Scale, ArrowLeft, FileText, Calendar, MessageSquare, Upload, User, 
  Clock, CheckCircle, AlertCircle, Loader2, Download, Send, Briefcase 
} from 'lucide-react';
import { format } from 'date-fns';

import Sidebar from '../../components/client/Sidebar';
import Header from '../../components/client/Header';
import '../../styles/client-dashboard.css';

const CaseDetailPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, joinCaseRoom, leaveCaseRoom, onNewMessage, offNewMessage } = useSocket();
  const messagesEndRef = useRef(null);
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  // Socket.IO real-time messaging
  useEffect(() => {
    if (caseId && connected) {
      // Join the case room
      joinCaseRoom(caseId);
      console.log(`📂 Joined case room: ${caseId}`);

      // Listen for new messages
      onNewMessage((message) => {
        console.log('📨 Received new message:', message);
        if (message.case_id === caseId) {
          setMessages((prevMessages) => {
            // Check if message already exists to avoid duplicates
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
          
          // Auto-scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      });

      // Cleanup
      return () => {
        leaveCaseRoom(caseId);
        offNewMessage();
      };
    }
  }, [caseId, connected, joinCaseRoom, leaveCaseRoom, onNewMessage, offNewMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCaseDetails = async () => {
    try {
      const [caseRes, docsRes, hearingsRes, messagesRes] = await Promise.all([
        caseAPI.getById(caseId),
        documentAPI.getByCaseId(caseId),
        hearingAPI.getByCaseId(caseId),
        messageAPI.getByCaseId(caseId)
      ]);

      setCaseData(caseRes.data);
      setDocuments(docsRes.data || []);
      setHearings(hearingsRes.data || []);
      setMessages(messagesRes.data || []);

      // Load advocates if case is pending
      if (caseRes.data.status === 'pending' && user?.role === 'client') {
        const advocatesRes = await advocateAPI.list({
          specialization: caseRes.data.case_type,
          location: caseRes.data.location
        });
        setAdvocates(advocatesRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load case details:', error);
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
      formData.append('document_type', 'evidence');
      formData.append('description', file.name);

      await documentAPI.upload(formData);
      await loadCaseDetails();
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload document');
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
        receiver_id: caseData.advocate_id || caseData.client_id,
        content: newMessage,
        message_type: 'text'
      });
      
      // Real-time update will come through Socket.IO, but add optimistically
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
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleHireAdvocate = async (advocateId) => {
    try {
      await caseAPI.assignAdvocate(caseId, { advocate_id: advocateId });
      await loadCaseDetails();
      alert('Advocate hire request sent!');
    } catch (error) {
      console.error('Failed to hire advocate:', error);
      alert('Failed to send hire request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      hearing_scheduled: 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="lfcas-client-dashboard" style={{ minHeight: '100vh', background: '#F7F7FB' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      <div className="dashboard-main" style={{ marginLeft: 0 }}>
        <Header userName={user?.full_name} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cases
            </Button>
          </div>

      {/* Main Content */}
      <main>
        {/* Case Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <CardTitle className="text-2xl" data-testid="case-title">{caseData.title}</CardTitle>
                  <Badge className={getStatusColor(caseData.status)}>
                    {caseData.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="text-base">{caseData.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Briefcase className="w-4 h-4 mr-2" />
                {caseData.case_type.replace('_', ' ')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Case ID</p>
                <p className="font-medium" data-testid="case-id">{caseData.id.substring(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">📍 {caseData.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created On</p>
                <p className="font-medium">{format(new Date(caseData.created_at), 'MMM dd, yyyy')}</p>
              </div>
            </div>

            {caseData.advocate && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Assigned Advocate</p>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Advocate Name</p>
                    <p className="text-sm text-gray-600">Specialization: {caseData.case_type}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <Upload className="w-4 h-4 mr-2" />
              Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="hearings" data-testid="tab-hearings">
              <Calendar className="w-4 h-4 mr-2" />
              Hearings ({hearings.length})
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="advocates" data-testid="tab-advocates" disabled={caseData.status !== 'pending' || user?.role !== 'client'}>
              <User className="w-4 h-4 mr-2" />
              Advocates
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {caseData.ai_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    🤖 AI Legal Analysis
                  </CardTitle>
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
                <CardTitle>Case Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 bg-green-100 p-2 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Case Created</p>
                      <p className="text-sm text-gray-600">{format(new Date(caseData.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>

                  {caseData.advocate && (
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 bg-blue-100 p-2 rounded-full">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Advocate Assigned</p>
                        <p className="text-sm text-gray-600">Professional legal counsel assigned to your case</p>
                      </div>
                    </div>
                  )}

                  {hearings.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 bg-purple-100 p-2 rounded-full">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{hearings.length} Hearing(s) Scheduled</p>
                        <p className="text-sm text-gray-600">Next: {hearings[0] && format(new Date(hearings[0].hearing_date), 'MMM dd, yyyy')}</p>
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
                    data-testid="file-upload-input"
                  />
                  <Button
                    onClick={() => document.getElementById('file-upload').click()}
                    disabled={uploading}
                    data-testid="upload-button"
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
                        data-testid={`document-item-${doc.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium">{doc.document_name}</p>
                            <p className="text-sm text-gray-600">
                              {doc.document_type} • {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.cloudinary_url, '_blank')}
                          data-testid={`download-doc-${doc.id}`}
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
                <CardTitle>Court Hearings</CardTitle>
                <CardDescription>Scheduled hearing dates and details</CardDescription>
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
                        data-testid={`hearing-item-${hearing.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="bg-purple-100 p-2 rounded-lg">
                              <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">
                                {format(new Date(hearing.hearing_date), 'EEEE, MMMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(hearing.hearing_date), 'hh:mm a')}
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
                <CardDescription>Communicate with your advocate</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Messages List */}
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
                          data-testid={`message-${msg.id}`}
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
                              {format(new Date(msg.created_at), 'MMM dd, hh:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                {/* Send Message */}
                {caseData.advocate && (
                  <div className="flex space-x-2 mt-4">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={2}
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      data-testid="send-message-button"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )}

                {!caseData.advocate && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mt-4">
                    <p className="text-sm text-yellow-800">
                      Hire an advocate to start messaging
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advocates Tab */}
          <TabsContent value="advocates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Advocates</CardTitle>
                <CardDescription>Select an advocate for your case</CardDescription>
              </CardHeader>
              <CardContent>
                {advocates.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No advocates available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {advocates.map((advocate) => (
                      <Card key={advocate.id} data-testid={`advocate-card-${advocate.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Advocate {advocate.id.substring(0, 8)}</h4>
                              <div className="space-y-1 mt-2 text-sm">
                                <p className="text-gray-600">
                                  <strong>Specialization:</strong> {advocate.specialization}
                                </p>
                                <p className="text-gray-600">
                                  <strong>Experience:</strong> {advocate.experience_years} years
                                </p>
                                <p className="text-gray-600">
                                  <strong>Location:</strong> {advocate.location}
                                </p>
                                <p className="text-gray-600">
                                  <strong>Rating:</strong> ⭐ {advocate.rating}/5 ({advocate.total_cases} cases)
                                </p>
                              </div>
                              <Button
                                className="w-full mt-4"
                                onClick={() => handleHireAdvocate(advocate.user_id)}
                                data-testid={`hire-advocate-${advocate.id}`}
                              >
                                Hire This Advocate
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </div>
    </div>
  );
};

export default CaseDetailPage;