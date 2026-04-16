import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Download, FileText, File, Search, Calendar, Loader2, FolderOpen, ExternalLink } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Downloads = () => {
  const { toast } = useToast();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const response = await dashboardAPI.getDownloads();
      setDownloads(response.data.downloads || []);
    } catch (error) {
      console.error('Failed to load downloads:', error);
      toast({ title: "Error", description: "Failed to load downloads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (download) => {
    if (download.url) {
      window.open(download.url, '_blank');
      toast({ title: "Download Started", description: `Downloading ${download.name}` });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (type) => {
    const iconMap = {
      'pdf': FileText,
      'document': File,
      'image': File,
      'other': File
    };
    const IconComponent = iconMap[type] || File;
    return <IconComponent size={20} className="text-violet-600" />;
  };

  const filteredDownloads = downloads.filter(download =>
    download.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    download.case_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6" data-testid="downloads-page">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="downloads-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Downloads</h1>
        <p className="text-slate-600 mt-1">Access all your case documents and files</p>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="downloads-search"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="text-violet-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{downloads.length}</p>
              <p className="text-sm text-slate-600">Total Files</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {downloads.filter(d => d.type.includes('pdf')).length}
              </p>
              <p className="text-sm text-slate-600">PDF Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatFileSize(downloads.reduce((acc, d) => acc + (d.size || 0), 0))}
              </p>
              <p className="text-sm text-slate-600">Total Size</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Downloads List */}
      {filteredDownloads.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchQuery ? 'No Files Found' : 'No Downloads Available'}
          </h3>
          <p className="text-slate-500">
            {searchQuery ? 'Try adjusting your search query' : 'Documents will appear here once uploaded to your cases'}
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">All Documents</h3>
          <div className="space-y-3">
            {filteredDownloads.map((download) => (
              <div
                key={download.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                data-testid={`download-item-${download.id}`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                    {getFileIcon(download.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{download.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {download.case_title}
                        </Badge>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(download.uploaded_at)}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(download.size)}</span>
                    </div>
                    {download.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{download.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDownload(download)}
                  className="bg-violet-600 hover:bg-violet-700 ml-4"
                  data-testid={`download-btn-${download.id}`}
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Downloads;
