import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Download, Loader2, FileText, MessageSquare, DollarSign, Users, Briefcase, Star } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const split = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  
  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows };
};
const ReportsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('cases');
  const [data, setData] = useState({ cases: null, feedback: null, revenue: null, users: null });
  const [loading, setLoading] = useState(false);

  const fetchCSV = async (path) => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_BASE}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text',
      transformResponse: [(d) => d],
    });
    return parseCSV(res.data);
  };

  const loadTab = async (tab) => {
    if (data[tab]) return;
    setLoading(true);
    try {
      if (tab === 'cases') {
        setData((d) => ({ ...d, cases: await fetchCSV('/admin/reports/cases') }));
      } else if (tab === 'feedback') {
        setData((d) => ({ ...d, feedback: await fetchCSV('/admin/reports/feedback') }));
      } else if (tab === 'revenue') {
        setData((d) => ({ ...d, revenue: await fetchCSV('/admin/reports/revenue') }));
      } else if (tab === 'advocates') {
        const res = await adminAPI.getAllAdvocates({});
        setData((d) => ({ ...d, users: res.data.advocates || [] }));
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const downloadReport = async (type) => {
    try {
      toast({ title: 'Downloading...', description: 'Preparing report' });
      let response, filename;
      if (type === 'cases') {
        response = await adminAPI.downloadCasesReport();
        filename = `cases_report_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'feedback') {
        response = await adminAPI.downloadFeedbackReport();
        filename = `feedback_report_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'revenue') {
        response = await adminAPI.downloadRevenueReport();
        filename = `revenue_report_${new Date().toISOString().split('T')[0]}.csv`;
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: 'Success', description: 'Downloaded' });
    } catch (e) {
      toast({ title: 'Error', description: 'Download failed', variant: 'destructive' });
    }
  };

  const renderCsvTable = (csv, testid) => {
    if (!csv || csv.headers.length === 0) {
      return <p className="text-center text-slate-500 py-12">No data</p>;
    }
    return (
      <div className="overflow-x-auto" data-testid={testid}>
        <Table>
          <TableHeader>
            <TableRow>
              {csv.headers.map((h, i) => (
                <TableHead key={i} className="font-semibold text-slate-700">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {csv.rows.map((r, ri) => (
              <TableRow key={ri}>
                {r.map((c, ci) => (
                  <TableCell key={ci} className="text-slate-700">{c}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-slate-500 mt-3">Showing {csv.rows.length} row{csv.rows.length !== 1 ? 's' : ''}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="reports-page">
      <header className="bg-[#3B4FAE] text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={() => navigate('/manager/dashboard')}
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">All Reports</h1>
              <p className="text-xs opacity-90">View and download platform data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="cases" data-testid="tab-cases"><Briefcase className="w-4 h-4 mr-2" />Cases</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback"><Star className="w-4 h-4 mr-2" />Reviews</TabsTrigger>
            <TabsTrigger value="revenue" data-testid="tab-revenue"><DollarSign className="w-4 h-4 mr-2" />Revenue</TabsTrigger>
            <TabsTrigger value="advocates" data-testid="tab-advocates"><Users className="w-4 h-4 mr-2" />Advocates</TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-[#3B4FAE]"><FileText className="w-5 h-5 mr-2" />Cases Report</CardTitle>
                <Button onClick={() => downloadReport('cases')} variant="outline" size="sm" data-testid="download-cases-tab">
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3B4FAE]" /></div> : renderCsvTable(data.cases, 'cases-table')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-[#3B4FAE]"><MessageSquare className="w-5 h-5 mr-2" />User Feedback (Ratings &amp; Reviews)</CardTitle>
                <Button onClick={() => downloadReport('feedback')} variant="outline" size="sm" data-testid="download-feedback-tab">
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3B4FAE]" /></div> : renderCsvTable(data.feedback, 'feedback-table')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-[#3B4FAE]"><DollarSign className="w-5 h-5 mr-2" />Revenue Report</CardTitle>
                <Button onClick={() => downloadReport('revenue')} variant="outline" size="sm" data-testid="download-revenue-tab">
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3B4FAE]" /></div> : renderCsvTable(data.revenue, 'revenue-table')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advocates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center text-[#3B4FAE]"><Users className="w-5 h-5 mr-2" />All Advocates</CardTitle>
                <Button onClick={() => navigate('/manager/advocates')} variant="outline" size="sm" data-testid="view-advocates-btn">
                  View Full Page
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3B4FAE]" /></div>
                ) : !data.users || data.users.length === 0 ? (
                  <p className="text-center text-slate-500 py-12">No advocates</p>
                ) : (
                  <div className="overflow-x-auto" data-testid="advocates-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Reviews</TableHead>
                          <TableHead>Warnings</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.users.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.users?.full_name || 'N/A'}</TableCell>
                            <TableCell>{a.users?.email || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={a.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {a.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{(a.rating || 0).toFixed(1)} / 5</TableCell>
                            <TableCell>{a.rating_count || 0}</TableCell>
                            <TableCell>
                              {(a.warning_count || 0) > 0 ? (
                                <Badge className="bg-red-100 text-red-700">{a.warning_count}</Badge>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </TableCell>
                            <TableCell>{a.experience_years} yrs</TableCell>
                            <TableCell>{a.location}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-slate-500 mt-3">Total: {data.users.length} advocate{data.users.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ReportsPage;
