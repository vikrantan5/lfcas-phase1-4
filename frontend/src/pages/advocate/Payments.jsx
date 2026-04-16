import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  DollarSign, Loader2, TrendingUp, Clock, CheckCircle, 
  Calendar, Filter, Search, Download, Eye, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const Payments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);

  useEffect(() => {
    loadPaymentData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter, timeFilter]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Get real payment requests from backend
      const response = await paymentAPI.getRequests();
      const requests = response.data || [];
      
      // Convert payment requests to payment format for display
      const paymentData = requests.map((request) => ({
        id: request.id,
        case_id: request.case_id,
        case_title: request.case?.title || 'Case Payment',
        client_name: request.client?.full_name || 'Client',
        amount: request.amount,
        status: request.status,
        due_date: request.due_date,
        paid_date: request.status === 'paid' ? request.updated_at : null,
        payment_method: 'Razorpay',
        invoice_number: `INV-${new Date(request.created_at).getFullYear()}${request.id.substring(0, 4).toUpperCase()}`,
        description: request.description,
        created_at: request.created_at
      }));

      setPayments(paymentData);
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Failed to load payment data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    if (searchQuery) {
      filtered = filtered.filter(payment =>
        payment.case_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    if (timeFilter && timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        const diffDays = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
        
        switch(timeFilter) {
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          case 'quarter':
            return diffDays <= 90;
          default:
            return true;
        }
      });
    }

    setFilteredPayments(filtered);
  };

  const calculateStats = () => {
    const totalEarned = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const failedAmount = payments
      .filter(p => p.status === 'failed')
      .reduce((sum, p) => sum + p.amount, 0);

    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const failedCount = payments.filter(p => p.status === 'failed').length;

    return {
      totalEarned,
      pendingAmount,
      overdueAmount: failedAmount,
      paidCount,
      pendingCount,
      overdueCount: failedCount
    };
  };

  const stats = calculateStats();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: '#18B057', bg: '#E8F5EE', icon: CheckCircle, label: 'Paid' },
      pending: { color: '#F59E0B', bg: '#FFF7ED', icon: Clock, label: 'Pending' },
      failed: { color: '#EF4444', bg: '#FEE2E2', icon: Clock, label: 'Failed' },
      refunded: { color: '#6B7280', bg: '#F3F4F6', icon: Clock, label: 'Refunded' }
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

  if (loading) {
    return (
      <div className="advocate-dashboard">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
        <div className="adv-main">
          <DashboardHeader userName={user?.full_name} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <div className="adv-content" style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Loader2 className="animate-spin" size={48} color="#724AE3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="advocate-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader userName={user?.full_name} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="adv-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>
              Payments & Earnings
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Track your earnings, invoices, and payment status
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #18B057 0%, #0E8042 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <DollarSign size={24} color="#fff" />
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#18B057',
                    fontWeight: 600
                  }}>
                    <ArrowUpRight size={14} />
                    +12.5%
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Total Earned</p>
                <h3 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  {formatCurrency(stats.totalEarned)}
                </h3>
                <p style={{ fontSize: 11, color: '#18B057', marginTop: 4 }}>{stats.paidCount} payments received</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={24} color="#fff" />
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Pending</p>
                <h3 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  {formatCurrency(stats.pendingAmount)}
                </h3>
                <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 4 }}>{stats.pendingCount} awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={24} color="#fff" />
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#EF4444',
                    fontWeight: 600
                  }}>
                    <ArrowDownRight size={14} />
                    Action needed
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Overdue</p>
                <h3 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  {formatCurrency(stats.overdueAmount)}
                </h3>
                <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{stats.overdueCount} overdue invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #724AE3 0%, #5835B0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <TrendingUp size={24} color="#fff" />
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Avg. Per Case</p>
                <h3 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                  {formatCurrency(stats.totalEarned / (stats.paidCount || 1))}
                </h3>
                <p style={{ fontSize: 11, color: '#724AE3', marginTop: 4 }}>Based on {stats.paidCount} cases</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card style={{ marginBottom: 24 }}>
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                  <Input
                    placeholder="Search payments, clients, invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 40 }}
                  />
                </div>
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
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #E0E0E0',
                    fontSize: 14,
                    background: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                </select>
                <Button variant="outline">
                  <Download size={16} style={{ marginRight: 8 }} />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History ({filteredPayments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <DollarSign size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>
                    No Payments Found
                  </h3>
                  <p style={{ color: '#888', fontSize: 14 }}>
                    {payments.length === 0 
                      ? "Payments will appear here once clients make payments" 
                      : "Try adjusting your filters"}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
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
                        background: payment.status === 'paid' ? '#E8F5EE' : payment.status === 'pending' ? '#FFF7ED' : '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <DollarSign size={24} color={payment.status === 'paid' ? '#18B057' : payment.status === 'pending' ? '#F59E0B' : '#EF4444'} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                            {payment.case_title}
                          </h4>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#888' }}>
                          <span>{payment.client_name}</span>
                          <span>•</span>
                          <span>{payment.invoice_number}</span>
                          <span>•</span>
                          <span>
                            {payment.status === 'paid' ? 'Paid on' : 'Due'} {formatDate(payment.status === 'paid' ? payment.paid_date : payment.due_date)}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', marginRight: 16 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A0A3E' }}>
                          {formatCurrency(payment.amount)}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                          {payment.payment_method}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye size={14} style={{ marginRight: 6 }} />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
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
    </div>
  );
};

export default Payments;