import React, { useState, useEffect } from 'react';
import { paymentAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loader2, CreditCard, FileText, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const Payments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.getRequests();
      setPayments(response.data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast({
        title: "Error",
        description: "Failed to load payment requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (payment) => {
    setProcessingPayment(payment.id);

    try {
      // Get advocate's Razorpay key
      const keyResponse = await paymentAPI.getAdvocateKey(payment.advocate_id);
      const razorpayKey = keyResponse.data.razorpay_key_id;

      if (!razorpayKey) {
        toast({
          title: "Error",
          description: "Advocate's payment settings not configured",
          variant: "destructive"
        });
        setProcessingPayment(null);
        return;
      }

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: razorpayKey,
          amount: Math.round(payment.amount * 100), // Amount in paise
          currency: 'INR',
          name: 'LFCAS Payment',
          description: payment.description,
          order_id: payment.razorpay_order_id,
          handler: async function (response) {
            try {
              // Verify payment
              await paymentAPI.verify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_request_id: payment.id
              });

              toast({
                title: "Payment Successful",
                description: `Payment of ₹${payment.amount.toFixed(2)} completed successfully`
              });

              loadPayments();
            } catch (error) {
              toast({
                title: "Verification Failed",
                description: error.response?.data?.detail || "Payment verification failed",
                variant: "destructive"
              });
            } finally {
              setProcessingPayment(null);
            }
          },
          prefill: {
            email: 'client@example.com',
          },
          theme: {
            color: '#724AE3'
          },
          modal: {
            ondismiss: function() {
              setProcessingPayment(null);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      script.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to load payment gateway",
          variant: "destructive"
        });
        setProcessingPayment(null);
      };

    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to initialize payment",
        variant: "destructive"
      });
      setProcessingPayment(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      paid: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
      refunded: { color: 'bg-blue-100 text-blue-700', icon: CreditCard }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon size={12} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center" data-testid="payments-page">
        <Loader2 className="animate-spin text-violet-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="payments-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payment Requests</h1>
        <p className="text-slate-600 mt-1">Manage your payment requests from advocates</p>
      </div>

      {payments.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Payment Requests</h3>
          <p className="text-slate-500">You don't have any payment requests at the moment</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-6" data-testid={`payment-card-${payment.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      ₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    {getStatusBadge(payment.status)}
                  </div>

                  <p className="text-slate-700 mb-3">{payment.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText size={16} className="text-violet-600" />
                      <span>Case: {payment.case?.title || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={16} className="text-violet-600" />
                      <span>
                        {new Date(payment.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {payment.due_date && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={16} className="text-violet-600" />
                        <span>
                          Due: {new Date(payment.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {payment.status === 'pending' && (
                    <Button
                      onClick={() => handlePay(payment)}
                      disabled={processingPayment === payment.id}
                      className="bg-violet-600 hover:bg-violet-700"
                      data-testid={`pay-button-${payment.id}`}
                    >
                      {processingPayment === payment.id ? (
                        <>
                          <Loader2 className="animate-spin mr-2" size={16} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} className="mr-2" />
                          Pay Now
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;
