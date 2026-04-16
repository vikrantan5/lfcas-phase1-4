import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messageAPI, caseAPI } from '../../services/api';
import Sidebar from '../../components/advocate/Sidebar';
import DashboardHeader from '../../components/advocate/DashboardHeader';
import { MessageSquare, Send, Loader2, User, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import '../../styles/advocate-dashboard.css';

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (selectedCase) {
      loadMessages(selectedCase.id);
    }
  }, [selectedCase]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await caseAPI.list();
      const casesData = response.data || [];
      setCases(casesData);
      if (casesData.length > 0) {
        setSelectedCase(casesData[0]);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (caseId) => {
    try {
      const response = await messageAPI.getByCaseId(caseId);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCase) return;
    
    try {
      setSending(true);
      await messageAPI.send({
        case_id: selectedCase.id,
        content: newMessage,
        message_type: 'text'
      });
      
      setNewMessage('');
      loadMessages(selectedCase.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const filteredCases = cases.filter(c => 
    !searchQuery || 
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="advocate-dashboard">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userName={user?.full_name} />
      
      <div className="adv-main">
        <DashboardHeader 
          userName={user?.full_name} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <div className="adv-content" style={{ padding: '24px' }}>
          {/* Page Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A0A3E', margin: 0, marginBottom: 4 }}>Messages</h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Communicate with your clients</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Loader2 className="animate-spin" size={48} color="#724AE3" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 16, color: '#888' }}>Loading messages...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="dash-card" style={{ textAlign: 'center', padding: 60 }}>
              <MessageSquare size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A0A3E', marginBottom: 8 }}>No Cases Yet</h3>
              <p style={{ color: '#888', fontSize: 14 }}>You need active cases to start messaging clients.</p>
            </div>
          ) : (
            <div className="dash-card" style={{ height: 'calc(100vh - 220px)', display: 'flex', overflow: 'hidden' }}>
              {/* Cases List Sidebar */}
              <div style={{
                width: 320,
                borderRight: '1px solid #F0F0F0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <div style={{ padding: 16, borderBottom: '1px solid #F0F0F0' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                    <Input
                      placeholder="Search cases..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredCases.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      style={{
                        padding: 16,
                        borderBottom: '1px solid #F0F0F0',
                        cursor: 'pointer',
                        background: selectedCase?.id === c.id ? '#F7F4FC' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#724AE3',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                          flexShrink: 0
                        }}>
                          {c.client?.full_name?.charAt(0) || 'C'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1A0A3E',
                            margin: '0 0 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {c.client?.full_name || 'Client'}
                          </h4>
                          <p style={{
                            fontSize: 12,
                            color: '#888',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {c.title || c.case_type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedCase ? (
                  <>
                    {/* Chat Header */}
                    <div style={{
                      padding: 16,
                      borderBottom: '1px solid #F0F0F0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: '#724AE3',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 600
                      }}>
                        {selectedCase.client?.full_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A0A3E', margin: 0 }}>
                          {selectedCase.client?.full_name || 'Client'}
                        </h3>
                        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
                          {selectedCase.title || selectedCase.case_type}
                        </p>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                      {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <MessageSquare size={48} color="#DDD" style={{ margin: '0 auto 12px' }} />
                          <p style={{ color: '#888', fontSize: 14 }}>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {messages.map(msg => {
                            const isSent = msg.sender_id === user.id;
                            return (
                              <div key={msg.id} style={{
                                display: 'flex',
                                justifyContent: isSent ? 'flex-end' : 'flex-start'
                              }}>
                                <div style={{
                                  maxWidth: '70%',
                                  background: isSent ? '#724AE3' : '#F7F4FC',
                                  color: isSent ? '#fff' : '#1A0A3E',
                                  padding: '12px 16px',
                                  borderRadius: 12,
                                  borderTopRightRadius: isSent ? 0 : 12,
                                  borderTopLeftRadius: isSent ? 12 : 0
                                }}>
                                  <p style={{ fontSize: 14, margin: 0, marginBottom: 6 }}>{msg.content}</p>
                                  <p style={{
                                    fontSize: 11,
                                    margin: 0,
                                    opacity: 0.7,
                                    textAlign: 'right'
                                  }}>
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <div style={{ padding: 16, borderTop: '1px solid #F0F0F0' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          style={{ flex: 1 }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sending}
                          style={{ width: 100 }}
                        >
                          {sending ? <Loader2 className="animate-spin" size={16} /> : (
                            <><Send size={16} style={{ marginRight: 6 }} /> Send</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <User size={64} color="#DDD" style={{ margin: '0 auto 16px' }} />
                      <p style={{ color: '#888', fontSize: 14 }}>Select a case to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;