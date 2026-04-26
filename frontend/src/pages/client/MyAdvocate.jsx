import React, { useState, useEffect } from 'react';
import { caseAPI, advocateAPI, messageAPI, ratingAPI, dashboardAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Star, MapPin, Award, Briefcase, Phone, Mail, MessageSquare, FileText, Calendar, Loader2, Send } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import RatingDialog from '../../components/RatingDialog';

const MyAdvocate = () => {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [advocate, setAdvocate] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
    const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const casesRes = await caseAPI.list();
      const casesData = casesRes.data || [];
      setCases(casesData);

      // Get advocate from first case
      if (casesData.length > 0 && casesData[0].advocate_id) {
        const advocateRes = await advocateAPI.getById(casesData[0].advocate_id);
        setAdvocate(advocateRes.data);
        
        // Load ratings for this advocate
        const ratingsRes = await ratingAPI.getByAdvocateId(casesData[0].advocate_id);
        setRatings(ratingsRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: "Error", description: "Failed to load advocate data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRateAdvocate = (caseItem) => {
    setSelectedCase(caseItem);
    setShowRatingDialog(true);
  };

  const handleRatingSuccess = () => {
    loadData();
  };


  const handleSendMessage = async () => {
    if (!messageContent.trim() || !advocate || cases.length === 0) {
      toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      await messageAPI.send({
        case_id: cases[0].id, // Use first case
        content: messageContent,
        message_type: 'text'
      });
      toast({ title: "Success", description: "Message sent to advocate" });
      setShowMessageDialog(false);
      setMessageContent('');
    } catch (error) {
      toast({ title: "Error", description: error.response?.data?.detail || "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim() || !advocate) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      await dashboardAPI.sendAdvocateEmail({
        advocate_id: advocate.id,
        subject: emailData.subject,
        message: emailData.message
      });
      toast({ title: "Success", description: "Email sent to advocate" });
      setShowEmailDialog(false);
      setEmailData({ subject: '', message: '' });
    } catch (error) {
      toast({ title: "Error", description: error.response?.data?.detail || "Failed to send email", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="my-advocate-page">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      </div>
    );
  }

  if (!advocate) {
    return (
      <div className="p-6 space-y-6" data-testid="my-advocate-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Advocate</h1>
          <p className="text-slate-600 mt-1">View and communicate with your assigned advocate</p>
        </div>
        <Card className="p-12 text-center">
          <Award className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Advocate Assigned</h3>
          <p className="text-slate-500 mb-6">
            You don't have an advocate assigned to any of your cases yet
          </p>
          <p className="text-sm text-slate-600">
            Start by finding an advocate and requesting a meeting
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="my-advocate-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Advocate</h1>
        <p className="text-slate-600 mt-1">Your legal representative's profile and case details</p>
      </div>

      {/* Advocate Profile Card */}
      <Card className="p-8">
        <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full flex-shrink-0 overflow-hidden">
            <img 
              src={advocate.user?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advocate.user?.full_name || 'Advocate')}&size=96&background=724AE3&color=fff&font-size=0.4`}
              alt={advocate.user?.full_name || 'Advocate'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">
                {advocate.user?.full_name || 'Advocate'}
              </h2>
              <Badge className="bg-green-100 text-green-700">Verified</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-1">
                <Star className="text-amber-500" size={16} fill="currentColor" />
                <span className="font-medium">{advocate.rating || 0}/5.0</span>
              </div>
              <span>•</span>
              <span>{advocate.total_cases || 0} Total Cases</span>
              <span>•</span>
              <span>{advocate.active_cases || 0} Active Cases</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Award size={18} className="text-violet-600" />
                <span>{advocate.experience_years} years experience</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={18} className="text-violet-600" />
                <span>{advocate.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Briefcase size={18} className="text-violet-600" />
                <span>Bar ID: {advocate.bar_council_id}</span>
              </div>
            </div>

            {advocate.bio && (
              <p className="text-slate-700 mt-4 leading-relaxed">{advocate.bio}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {advocate.specialization?.map((spec, idx) => (
                <Badge key={idx} className="bg-violet-100 text-violet-700">
                  {spec.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button 
            className="bg-violet-600 hover:bg-violet-700"
            onClick={() => setShowMessageDialog(true)}
            data-testid="send-message-button"
          >
            <MessageSquare size={16} className="mr-2" />
            Send Message
          </Button>
               <Button 
            variant="outline"
            onClick={() => setShowEmailDialog(true)}
            data-testid="email-button"
          >
            <Mail size={16} className="mr-2" />
            Email
          </Button>
        </div>
      </Card>

      {/* Cases with this Advocate */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Cases Handled</h3>
        <div className="space-y-4">
          {cases.filter(c => c.advocate_id === advocate.id).map(caseItem => (
            <div key={caseItem.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg" data-testid={`case-item-${caseItem.id}`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="text-violet-600" size={20} />
                  <h4 className="font-semibold text-slate-900">{caseItem.title}</h4>
                  <Badge className="bg-violet-100 text-violet-700">
                    {caseItem.current_stage?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 ml-8">
                  {caseItem.case_type} • {caseItem.location}
                </p>
              </div>
              {caseItem.current_stage === 'CLOSED' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRateAdvocate(caseItem)}
                >
                  <Star size={14} className="mr-1" />
                  Rate Advocate
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Reviews & Ratings */}
      {ratings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Client Reviews</h3>
          <div className="space-y-4">
            {ratings.slice(0, 5).map((rating, idx) => (
              <div key={rating.id || idx} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={14} 
                        className={i < rating.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">
                    {new Date(rating.created_at).toLocaleDateString('en-IN', {
                      month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                {rating.review && (
                  <p className="text-sm text-slate-700">{rating.review}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rating Dialog */}
      {selectedCase && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          caseData={selectedCase}
          onSuccess={handleRatingSuccess}
        />
      )}
        {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {advocate?.user?.full_name}</DialogTitle>
            <DialogDescription>
              Send a message to your advocate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Message</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email to {advocate?.user?.full_name}</DialogTitle>
            <DialogDescription>
              Email: {advocate?.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject..."
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                placeholder="Type your message here..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={16} className="mr-2" />
                    Send Email
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

export default MyAdvocate;
