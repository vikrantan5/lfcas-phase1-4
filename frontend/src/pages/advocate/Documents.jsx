import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { documentAPI, caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  FileText, Upload, Loader2, X, Check, Download, Eye, Filter,
  Search, Calendar, File, CheckCircle, AlertCircle, Clock, Briefcase,
  Lock, Unlock, History, Send, XCircle, User, MessageSquare
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const Documents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState('all');
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    case_id: '',
    document_name: '',
    document_type: '',
    description: ''
  });

  // Edit request states
  const [editRequests, setEditRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [advocateNotes, setAdvocateNotes] = useState('');
  const [editDuration, setEditDuration] = useState(24);
  const [processing, setProcessing] = useState(false);

  // Version history states
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const documentTypes = [
    'Legal Notice', 'Petition', 'Affidavit', 'Evidence',
    'Court Order', 'Agreement', 'Power of Attorney', 'Other'
  ];

  useEffect(() => {
    loadData();
    loadEditRequests();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, selectedCase]);

  const loadData = async () => {
    try {
      setLoading(true);
      const casesResponse = await caseAPI.list();
      const casesData = casesResponse.data || [];
      setCases(casesData);

      // Load documents for all cases
      const docsPromises = casesData.map(c => 
        documentAPI.getByCaseId(c.id).catch(() => ({ data: [] }))
      );
      const docsResults = await Promise.all(docsPromises);
      
      const allDocs = [];
      for (let i = 0; i < docsResults.length; i++) {
        const result = docsResults[i];
        if (result.data) {
          for (const doc of result.data) {
            // Get edit status for each document
            try {
              const statusResponse = await documentAPI.getEditStatus(doc.id);
              allDocs.push({
                ...doc,
                case: casesData[i],
                editStatus: statusResponse.data
              });
            } catch (error) {
              allDocs.push({
                ...doc,
                case: casesData[i],
                editStatus: { is_locked: true, is_editable: false }
              });
            }
          }
        }
      }

      setDocuments(allDocs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEditRequests = async (status = null) => {
    try {
      setLoadingRequests(true);
      const response = await documentAPI.getAdvocateEditRequests(status);
      setEditRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load edit requests:', error);
      toast({
        title: "Error",
        description: "Failed to load edit requests",
        variant: "destructive"
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (selectedCase !== 'all') {
      filtered = filtered.filter(doc => doc.case_id === selectedCase);
    }

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredDocuments(filtered);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.document_name) {
        setUploadData({ ...uploadData, document_name: file.name });
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !uploadData.case_id) {
      toast({
        title: "Error",
        description: "Please select a file and case",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('case_id', uploadData.case_id);
    formData.append('document_name', uploadData.document_name);
    formData.append('document_type', uploadData.document_type);
    formData.append('description', uploadData.description || '');

    try {
      await documentAPI.upload(formData);
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadData({ case_id: '', document_name: '', document_type: '', description: '' });
      loadData();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.detail || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRequestAction = async (action) => {
    if (!advocateNotes.trim() && action === 'rejected') {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await documentAPI.updateEditRequest(selectedRequest.id, {
        status: action,
        advocate_notes: advocateNotes,
        edit_duration_hours: action === 'approved' ? editDuration : null
      });

      toast({
        title: action === 'approved' ? "Request Approved" : "Request Rejected",
        description: `Edit request has been ${action}. Client will be notified.`
      });

      setShowRequestDialog(false);
      setSelectedRequest(null);
      setAdvocateNotes('');
      setEditDuration(24);
      loadEditRequests();
      loadData();
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error.response?.data?.detail || "Failed to process request",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewVersions = async (doc) => {
    setSelectedDocument(doc);
    setShowVersionDialog(true);
    setLoadingVersions(true);
    
    try {
      const response = await documentAPI.getVersions(doc.id);
      setVersions(response.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive"
      });
    } finally {
      setLoadingVersions(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock size={12} className="mr-1" />Pending</Badge>,
      approved: <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle size={12} className="mr-1" />Approved</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle size={12} className="mr-1" />Rejected</Badge>
    };
    return badges[status] || null;
  };

  const pendingCount = editRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="advocate-dashboard">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="main-content">
        <DashboardHeader setSidebarOpen={setSidebarOpen} />

        <div className="p-6">
          <Tabs defaultValue="documents" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Document Management</h1>
                <p className="text-slate-600 mt-1">Manage case documents and edit permissions</p>
              </div>
              <TabsList>
                <TabsTrigger value="documents">
                  <FileText size={16} className="mr-2" />
                  All Documents
                </TabsTrigger>
                <TabsTrigger value="edit-requests" className="relative">
                  <Send size={16} className="mr-2" />
                  Edit Requests
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-3 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      placeholder="Search documents..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="px-4 py-2 border border-slate-200 rounded-md"
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value)}
                  >
                    <option value="all">All Cases</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title || c.case_type}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => setShowUploadDialog(true)} className="bg-violet-600 hover:bg-violet-700">
                  <Upload size={18} className="mr-2" />
                  Upload Document
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-violet-600" size={40} />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Documents Found</h3>
                  <p className="text-slate-500 mb-6">Upload documents to get started</p>
                  <Button onClick={() => setShowUploadDialog(true)} variant="outline">
                    <Upload size={18} className="mr-2" />
                    Upload Document
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map(doc => (
                    <Card key={doc.id} className="p-5 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-violet-600" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                              {doc.document_name}
                            </h4>
                            <p className="text-xs text-slate-500">{doc.case?.title || 'Unknown Case'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {doc.document_type}
                        </span>
                        {doc.editStatus?.current_version > 1 && (
                          <Badge variant="outline" className="ml-2">
                            v{doc.editStatus.current_version}
                          </Badge>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{doc.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(doc.created_at)}
                        </span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(doc.cloudinary_url, '_blank')}
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewVersions(doc)}
                        >
                          <History size={14} className="mr-1" />
                          History
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Edit Requests Tab */}
            <TabsContent value="edit-requests" className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant={loadingRequests ? "outline" : "default"}
                  onClick={() => loadEditRequests('pending')}
                  className="relative"
                >
                  <Clock size={16} className="mr-2" />
                  Pending ({editRequests.filter(r => r.status === 'pending').length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => loadEditRequests('approved')}
                >
                  <CheckCircle size={16} className="mr-2" />
                  Approved ({editRequests.filter(r => r.status === 'approved').length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => loadEditRequests('rejected')}
                >
                  <XCircle size={16} className="mr-2" />
                  Rejected ({editRequests.filter(r => r.status === 'rejected').length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => loadEditRequests()}
                >
                  All Requests
                </Button>
              </div>

              {loadingRequests ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="animate-spin text-violet-600" size={40} />
                </div>
              ) : editRequests.length === 0 ? (
                <Card className="p-12 text-center">
                  <Send className="mx-auto text-slate-300 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-slate-700 mb-2">No Edit Requests</h3>
                  <p className="text-slate-500">No edit requests found for the selected filter</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {editRequests.map(request => (
                    <Card key={request.id} className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getStatusBadge(request.status)}
                            <span className="text-xs text-slate-500">
                              {formatDate(request.created_at)}
                            </span>
                          </div>
                          
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {request.document_name || 'Document'}
                          </h4>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {request.client_name || 'Unknown Client'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase size={14} />
                              {request.case_title || 'Unknown Case'}
                            </span>
                          </div>

                          {request.request_reason && (
                            <div className="bg-slate-50 rounded p-3 mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Client's Reason:</p>
                              <p className="text-sm text-slate-600">{request.request_reason}</p>
                            </div>
                          )}

                          {request.advocate_notes && (
                            <div className="bg-violet-50 rounded p-3">
                              <p className="text-xs font-semibold text-violet-700 mb-1">Your Notes:</p>
                              <p className="text-sm text-violet-900">{request.advocate_notes}</p>
                            </div>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRequestDialog(true);
                              }}
                            >
                              <Check size={14} className="mr-1" />
                              Review
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a new document to a case</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Select Case *</Label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
                value={uploadData.case_id}
                onChange={(e) => setUploadData({ ...uploadData, case_id: e.target.value })}
                required
              >
                <option value="">Choose a case</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title || c.case_type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Document File *</Label>
              <Input type="file" onChange={handleFileChange} required />
            </div>
            <div>
              <Label>Document Name *</Label>
              <Input
                value={uploadData.document_name}
                onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Document Type *</Label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
                value={uploadData.document_type}
                onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                required
              >
                <option value="">Select type</option>
                {documentTypes.map(type => (
                  <option key={type} value={type.toLowerCase().replace(/ /g, '_')}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Upload
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Edit Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Edit Request</DialogTitle>
            <DialogDescription>
              Approve or reject the client's request to edit this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded p-4 space-y-2">
              <div>
                <span className="text-xs font-semibold text-slate-600">Document:</span>
                <p className="font-semibold">{selectedRequest?.document_name}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600">Client:</span>
                <p>{selectedRequest?.client_name}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-600">Reason:</span>
                <p className="text-sm">{selectedRequest?.request_reason || 'No reason provided'}</p>
              </div>
            </div>

            <div>
              <Label>Your Notes (Optional for approval, Required for rejection)</Label>
              <Textarea
                value={advocateNotes}
                onChange={(e) => setAdvocateNotes(e.target.value)}
                placeholder="Add notes for the client..."
                rows={3}
              />
            </div>

            <div>
              <Label>Edit Duration (hours) - Only if approving</Label>
              <Input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 24)}
                min="1"
                max="168"
              />
              <p className="text-xs text-slate-500 mt-1">
                Document will be editable for this duration, then auto-lock
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => handleRequestAction('rejected')}
                disabled={processing}
              >
                {processing ? <Loader2 className="animate-spin mr-2" size={16} /> : <X size={16} className="mr-2" />}
                Reject
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleRequestAction('approved')}
                disabled={processing}
              >
                {processing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check size={16} className="mr-2" />}
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              {selectedDocument?.document_name}
            </DialogDescription>
          </DialogHeader>
          {loadingVersions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-violet-600" size={32} />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History size={48} className="mx-auto mb-3 text-slate-300" />
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={index === 0 ? "default" : "outline"}>
                          Version {version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge>
                        )}
                      </div>
                      {version.edit_summary && (
                        <h4 className="font-semibold text-slate-900 mb-1">{version.edit_summary}</h4>
                      )}
                      {version.changes_description && (
                        <p className="text-sm text-slate-600 mb-2">{version.changes_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{formatDate(version.created_at)}</span>
                        <span>{formatFileSize(version.file_size)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(version.file_url, '_blank')}
                    >
                      <Download size={14} className="mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
