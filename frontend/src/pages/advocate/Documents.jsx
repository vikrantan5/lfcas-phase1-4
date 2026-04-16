import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { documentAPI, caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { 
  FileText, Upload, Loader2, X, Check, Download, Eye, Filter,
  Search, Calendar, File, CheckCircle, AlertCircle, Clock, Briefcase
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
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
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    case_id: '',
    document_name: '',
    document_type: '',
    description: ''
  });

  const documentTypes = [
    'Legal Notice',
    'Petition',
    'Affidavit',
    'Evidence',
    'Court Order',
    'Agreement',
    'Power of Attorney',
    'Other'
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, selectedCase, statusFilter]);

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
      docsResults.forEach((result, index) => {
        if (result.data) {
          result.data.forEach(doc => {
            allDocs.push({
              ...doc,
              case: casesData[index]
            });
          });
        }
      });

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

  const filterDocuments = () => {
    let filtered = [...documents];

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.document_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.case?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCase && selectedCase !== 'all') {
      filtered = filtered.filter(doc => doc.case_id === selectedCase);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.verification_status === statusFilter);
    }

    setFilteredDocuments(filtered);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Document must be less than 10MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      if (!uploadData.document_name) {
        setUploadData({
          ...uploadData,
          document_name: file.name.split('.')[0]
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.case_id || !uploadData.document_name || !uploadData.document_type) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `case-documents/${uploadData.case_id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('case-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('case-documents')
        .getPublicUrl(filePath);

      // Create form data for API
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('case_id', uploadData.case_id);
      formData.append('document_name', uploadData.document_name);
      formData.append('document_type', uploadData.document_type);
      if (uploadData.description) {
        formData.append('description', uploadData.description);
      }

      // Save to backend
      await documentAPI.upload(formData);

      toast({
        title: "Upload Successful",
        description: "Document has been uploaded successfully",
      });

      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadData({
        case_id: '',
        document_name: '',
        document_type: '',
        description: ''
      });
      
      loadData();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      verified: { color: '#18B057', bg: '#E8F5EE', icon: CheckCircle, label: 'Verified' },
      pending: { color: '#F59E0B', bg: '#FFF7ED', icon: Clock, label: 'Pending' },
      rejected: { color: '#EF4444', bg: '#FEE2E2', icon: AlertCircle, label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 12,
        background: config.bg,
        color: config.color,
        fontSize: 12,
        fontWeight: 600
      }}>
        <Icon size={12} />
        {config.label}
      </div>
    );
  };

  const getFileIcon = (type) => {
    return <FileText size={40} color="#724AE3" />;
  };

  if (loading) {
    return (
      <div className="adv-dashboard">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
        <div className="dash-main">
          <DashboardHeader userName={user?.full_name} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="dash-content" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Loader2 className="animate-spin" size={48} color="#724AE3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adv-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="dash-main">
        <DashboardHeader userName={user?.full_name} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="dash-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>
                Documents
              </h1>
              <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
                Manage and organize all case documents
              </p>
            </div>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload size={16} style={{ marginRight: 8 }} />
              Upload Document
            </Button>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Total Documents</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>{documents.length}</h3>
                  </div>
                  <File size={24} color="#724AE3" style={{ opacity: 0.6 }} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Verified</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: '#18B057', margin: 0 }}>
                      {documents.filter(d => d.verification_status === 'verified').length}
                    </h3>
                  </div>
                  <CheckCircle size={24} color="#18B057" style={{ opacity: 0.6 }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Pending</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B', margin: 0 }}>
                      {documents.filter(d => d.verification_status === 'pending' || !d.verification_status).length}
                    </h3>
                  </div>
                  <Clock size={24} color="#F59E0B" style={{ opacity: 0.6 }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Active Cases</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: '#724AE3', margin: 0 }}>{cases.length}</h3>
                  </div>
                  <Briefcase size={24} color="#724AE3" style={{ opacity: 0.6 }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 40 }}
                  />
                </div>
                <select
                  value={selectedCase}
                  onChange={(e) => setSelectedCase(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #E0E0E0',
                    fontSize: 14,
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Cases</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #E0E0E0',
                    fontSize: 14,
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDocuments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <FileText size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>
                    No Documents Found
                  </h3>
                  <p style={{ color: '#888', fontSize: 14, marginBottom: 20 }}>
                    {documents.length === 0 
                      ? "Upload your first document to get started" 
                      : "Try adjusting your filters"}
                  </p>
                  {documents.length === 0 && (
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload size={16} style={{ marginRight: 8 }} />
                      Upload Document
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: 16,
                        background: '#FAFAFE',
                        borderRadius: 12,
                        border: '1px solid #F0F0F0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16
                      }}
                    >
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: 10,
                        background: '#F5F3FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getFileIcon(doc.document_type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: '0 0 4px' }}>
                          {doc.document_name}
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#888' }}>
                          <span>{doc.document_type}</span>
                          <span>•</span>
                          <span>{doc.case?.title || 'Unknown Case'}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        {getStatusBadge(doc.verification_status || 'pending')}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.cloudinary_url, '_blank')}
                        >
                          <Eye size={14} style={{ marginRight: 6 }} />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.cloudinary_url, '_blank')}
                        >
                          <Download size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a new document for a case</DialogDescription>
          </DialogHeader>
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            <div>
              <Label htmlFor="case">Select Case *</Label>
              <select
                id="case"
                value={uploadData.case_id}
                onChange={(e) => setUploadData({ ...uploadData, case_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #E0E0E0',
                  marginTop: 8,
                  fontSize: 14
                }}
              >
                <option value="">Choose a case...</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="doc-file">Select File *</Label>
              <div style={{ marginTop: 8 }}>
                <input
                  id="doc-file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="doc-file"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 16,
                    border: '2px dashed #E0E0E0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: '#FAFAFA'
                  }}
                >
                  <Upload size={20} color="#888" />
                  <span style={{ color: '#888' }}>
                    {selectedFile ? selectedFile.name : 'Click to select file (PDF, DOC, Image)'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="doc-name">Document Name *</Label>
              <Input
                id="doc-name"
                value={uploadData.document_name}
                onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                placeholder="e.g., Marriage Certificate"
                style={{ marginTop: 8 }}
              />
            </div>

            <div>
              <Label htmlFor="doc-type">Document Type *</Label>
              <select
                id="doc-type"
                value={uploadData.document_type}
                onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #E0E0E0',
                  marginTop: 8,
                  fontSize: 14
                }}
              >
                <option value="">Choose type...</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="doc-desc">Description (Optional)</Label>
              <Textarea
                id="doc-desc"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Add any notes about this document..."
                rows={3}
                style={{ marginTop: 8 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFile(null);
                  setUploadData({
                    case_id: '',
                    document_name: '',
                    document_type: '',
                    description: ''
                  });
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} style={{ marginRight: 8 }} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} style={{ marginRight: 8 }} />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;