import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ClientSidebar from '../../components/client/Sidebar';
import ClientHeader from '../../components/client/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  DollarSign, Loader2, CheckCircle, Clock, AlertCircle,
  Calendar, CreditCard, FileText, Download, ExternalLink
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import '../../styles/client-dashboard.css';

const Payments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [paying, setPaying] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    loadPaymentRequests();
    loadRazorpayScript();
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  };

  const loadPaymentRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/payments/requests`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPaymentRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to load payment requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentRequest) => {
    if (!razorpayLoaded) {
      toast({
        title: "Payment Gateway Loading",
        description: "Please wait while we load the payment gateway...",
        variant: "destructive"
      });
      return;
    }

    setPaying(paymentRequest.id);

    try {
      // Get advocate's Razorpay key (we need to fetch this)
      const advocateId = paymentRequest.advocate_id;
      
      // For now, we'll use the order_id from the payment request
      // The advocate's public key should be fetched from backend
      
      const options = {
        key: paymentRequest.advocate?.razorpay_key_id || 'rzp_test_XXXXXXXXX', // This should come from backend
        amount: paymentRequest.amount * 100, // Amount in paise
        currency: 'INR',
        name: 'LFCAS Payment',
        description: paymentRequest.description,
        order_id: paymentRequest.razorpay_order_id,
        handler: async function (response) {
          // Payment successful, verify on backend
          try {
            const token = localStorage.getItem('access_token');
            await axios.post(
              `${process.env.REACT_APP_BACKEND_URL}/api/payments/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_request_id: paymentRequest.id
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            toast({
              title: "Payment Successful",
              description: "Your payment has been processed successfully",
            });

            loadPaymentRequests();
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast({
              title: "Verification Failed",
              description: "Payment completed but verification failed. Please contact support.",
              variant: "destructive"
            });
          } finally {
            setPaying(null);
          }
        },
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#815DF5'
        },
        modal: {
          ondismiss: function() {
            setPaying(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation failed:', error);
      toast({
        title: "Payment Failed",
        description: error.response?.data?.detail || "Failed to initiate payment",
        variant: "destructive"
      });
      setPaying(null);
    }
  };

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
    const config = {
      paid: { color: '#18B057', bg: '#E8F5EE', icon: CheckCircle, label: 'Paid' },
      pending: { color: '#F59E0B', bg: '#FFF7ED', icon: Clock, label: 'Pending' },
      failed: { color: '#EF4444', bg: '#FEE2E2', icon: AlertCircle, label: 'Failed' },
      refunded: { color: '#6B7280', bg: '#F3F4F6', icon: AlertCircle, label: 'Refunded' }
    };

    const statusConfig = config[status] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 12,
        background: statusConfig.bg,
        color: statusConfig.color,
        fontSize: 12,
        fontWeight: 600
      }}>
        <Icon size={12} />
        {statusConfig.label}
      </div>
    );
  };

  const calculateStats = () => {
    const totalPaid = paymentRequests
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalPending = paymentRequests
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    return { totalPaid, totalPending };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <ClientSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userName={user?.full_name}
      />

      <div className="client-main">
        <ClientHeader 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userName={user?.full_name}
        />

        <div className="client-content" style={{ padding: '24px 28px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>
              Payments
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Manage your case payments and invoices
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #18B057 0%, #0E8042 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={24} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Total Paid</p>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                      {formatCurrency(stats.totalPaid)}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Pending</p>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                      {formatCurrency(stats.totalPending)}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #724AE3 0%, #5835B0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={24} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>Total Requests</p>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1A0A3E', margin: 0 }}>
                      {paymentRequests.length}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <DollarSign size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>
                    No Payment Requests
                  </h3>
                  <p style={{ color: '#888', fontSize: 14 }}>
                    Payment requests from your advocate will appear here
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {paymentRequests.map((request) => (
                    <div
                      key={request.id}
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
                        background: request.status === 'paid' ? '#E8F5EE' : '#FFF7ED',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <DollarSign size={24} color={request.status === 'paid' ? '#18B057' : '#F59E0B'} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                            {request.case?.title || 'Case Payment'}
                          </h4>
                          {getStatusBadge(request.status)}
                        </div>
                        <p style={{ fontSize: 13, color: '#666', margin: '4px 0' }}>
                          {request.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#888', marginTop: 4 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} />
                            {request.due_date ? `Due: ${formatDate(request.due_date)}` : `Created: ${formatDate(request.created_at)}`}
                          </span>
                          {request.advocate?.user && (
                            <span>Advocate: {request.advocate.user.full_name}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', marginRight: 16 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A0A3E' }}>
                          {formatCurrency(request.amount)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {request.status === 'pending' && (
                          <Button
                            onClick={() => handlePayment(request)}
                            disabled={paying === request.id}
                            style={{ minWidth: 100 }}
                          >
                            {paying === request.id ? (
                              <>
                                <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard size={14} style={{ marginRight: 6 }} />
                                Pay Now
                              </>
                            )}
                          </Button>
                        )}
                        {request.status === 'paid' && (
                          <Button variant="outline" size="sm">
                            <Download size={14} style={{ marginRight: 6 }} />
                            Receipt
                          </Button>
                        )}
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
