import React, { useState, useEffect } from 'react';
import { documentAPI, caseAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { FileText, Upload, Download, Eye, Trash2, Filter, Search, Clock, CheckCircle, AlertCircle, Loader2, Edit } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Documents = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedCase, setSelectedCase] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    case_id: '',
    document_name: '',
    document_type: '',
    description: ''
  });
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

    // Edit request states
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [requestingEdit, setRequestingEdit] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadDocuments(selectedCase);
    }
  }, [selectedCase]);

  const loadCases = async () => {
    try {
      const response = await caseAPI.list();
      setCases(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedCase(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
      toast({ title: "Error", description: "Failed to load cases", variant: "destructive" });
    }
  };

  const loadDocuments = async (caseId) => {
    setLoading(true);
    try {
      const response = await documentAPI.getByCaseId(caseId);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast({ title: "Error", description: "Failed to load documents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({ ...uploadData, file, document_name: file.name });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file || !selectedCase) {
      toast({ title: "Error", description: "Please select a file and case", variant: "destructive" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('case_id', selectedCase);
    formData.append('document_name', uploadData.document_name);
    formData.append('document_type', uploadData.document_type);
    formData.append('description', uploadData.description || '');

    try {
      await documentAPI.upload(formData);
      toast({ title: "Success", description: "Document uploaded successfully" });
      setShowUploadDialog(false);
      setUploadData({ file: null, case_id: '', document_name: '', document_type: '', description: '' });
      loadDocuments(selectedCase);
    } catch (error) {
      toast({ title: "Upload Failed", description: error.response?.data?.detail || "Failed to upload document", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    const matchesSearch = doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

    const handleRequestEdit = async (doc) => {
    setSelectedDocument(doc);
    setShowEditRequestDialog(true);
  };

  const submitEditRequest = async (e) => {
    e.preventDefault();
    if (!editRequestReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for editing", variant: "destructive" });
      return;
    }

    setRequestingEdit(true);
    try {
      await documentAPI.createEditRequest({
        document_id: selectedDocument.id,
        reason: editRequestReason
      });

      toast({ title: "Success", description: "Edit request sent to advocate" });
      setShowEditRequestDialog(false);
      setEditRequestReason('');
      setSelectedDocument(null);
      loadDocuments(selectedCase);
    } catch (error) {
      toast({ 
        title: "Request Failed", 
        description: error.response?.data?.detail || "Failed to send edit request", 
        variant: "destructive" 
      });
    } finally {
      setRequestingEdit(false);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="documents-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-600 mt-1">Manage all your case documents in one place</p>
        </div>
        <Button 
          onClick={() => setShowUploadDialog(true)} 
          className="bg-violet-600 hover:bg-violet-700"
          data-testid="upload-document-btn"
        >
          <Upload size={18} className="mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Case Selector & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Select Case</Label>
          <Select value={selectedCase} onValueChange={setSelectedCase}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a case" />
            </SelectTrigger>
            <SelectContent>
              {cases.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title || c.case_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Filter by Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
              <SelectItem value="identity">Identity Proof</SelectItem>
              <SelectItem value="petition">Petition</SelectItem>
              <SelectItem value="evidence">Evidence</SelectItem>
              <SelectItem value="court_order">Court Order</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Search Documents</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search by name..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Documents Found</h3>
          <p className="text-slate-500 mb-6">
            {documents.length === 0 
              ? "Start by uploading your first document" 
              : "No documents match your filters"}
          </p>
          <Button onClick={() => setShowUploadDialog(true)} variant="outline">
            <Upload size={18} className="mr-2" />
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} className="p-5 hover:shadow-lg transition-shadow" data-testid={`document-card-${doc.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-violet-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">{doc.document_name}</h4>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {doc.document_type}
                    </span>
                  </div>
                </div>
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
                  data-testid={`view-document-${doc.id}`}
                >
                  <Eye size={14} className="mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = doc.cloudinary_url;
                    link.download = doc.document_name;
                    link.click();
                  }}
    data-testid={`download-document-${doc.id}`}
                >
                  <Download size={14} />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => handleRequestEdit(doc)}
                  data-testid={`request-edit-${doc.id}`}
                >
                  <Edit size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md" data-testid="upload-dialog">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label>Document File *</Label>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
            </div>

            <div>
              <Label>Document Name *</Label>
              <Input
                value={uploadData.document_name}
                onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                placeholder="e.g. Marriage Certificate"
                required
              />
            </div>

            <div>
              <Label>Document Type *</Label>
              <Select 
                value={uploadData.document_type} 
                onValueChange={(v) => setUploadData({ ...uploadData, document_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="identity">Identity Proof</SelectItem>
                  <SelectItem value="petition">Petition</SelectItem>
                  <SelectItem value="evidence">Evidence</SelectItem>
                  <SelectItem value="court_order">Court Order</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Input
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={uploading} className="flex-1 bg-violet-600 hover:bg-violet-700">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

       {/* Edit Request Dialog */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent className="max-w-md" data-testid="edit-request-dialog">
          <DialogHeader>
            <DialogTitle>Request Document Edit Permission</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditRequest} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded">
              <p className="text-sm font-semibold text-slate-700 mb-1">Document:</p>
              <p className="text-slate-900">{selectedDocument?.document_name}</p>
            </div>

            <div>
              <Label>Reason for Edit Request *</Label>
              <Textarea
                value={editRequestReason}
                onChange={(e) => setEditRequestReason(e.target.value)}
                placeholder="Please explain why you need to edit this document..."
                rows={4}
                required
                data-testid="edit-request-reason"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your advocate will review and approve your request
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditRequestDialog(false);
                  setEditRequestReason('');
                  setSelectedDocument(null);
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={requestingEdit} 
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                data-testid="submit-edit-request"
              >
                {requestingEdit ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
