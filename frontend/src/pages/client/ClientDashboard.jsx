import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { caseAPI, aiAPI, meetingRequestAPI, meetingAPI, dashboardAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  Scale, Plus, FileText, Users, Loader2, Briefcase, Clock, CheckCircle,
  Calendar, AlertCircle, UserCheck, Star, Sparkles, ArrowRight, ChevronRight, Zap,
  Home, Bot, FolderOpen, ClipboardCheck, Bell, Search, UserPlus, MessageSquare,
  Download, BookOpen, Settings, Crown, Send, Upload, FileDown, ChevronDown,
 MapPin, Gavel, Eye, CreditCard, Mic
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import NotificationPanel from '../../components/NotificationPanel';
import RatingDialog from '../../components/RatingDialog';
import '../../styles/client-dashboard.css';
import Documents from './Documents';
import CaseTracker from './CaseTracker';
import MyCases from './MyCases';
import FindAdvocates from './FindAdvocates';
import MyAdvocate from './MyAdvocate';
import MeetingRequests from './MeetingRequests';
import HearingsReminders from './HearingsReminders';
import Downloads from './Downloads';
import LegalResources from './LegalResources';
import SettingsPage from './Settings';

import PaymentsPage from './Payments';
import { getAvatarUrl, handleAvatarError } from '../../lib/utils';


// ============ SIDEBAR COMPONENT ============
const Sidebar = ({ activeItem, setActiveItem, onStartAI }) => {
  const sidebarSections = [
    {
      title: 'CASE MANAGEMENT',
      items: [
        { id: 'my-cases', label: 'My Cases', icon: Briefcase, hasDropdown: true },
        { id: 'ai-assistant', label: 'AI Legal Assistant', icon: Bot },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'case-tracker', label: 'Case Tracker', icon: ClipboardCheck },
        { id: 'hearings', label: 'Hearings & Reminders', icon: Calendar },
      ]
    },
    {
      title: 'ADVOCATES',
      items: [
        { id: 'find-advocates', label: 'Find Advocates', icon: Search, badge: '7' },
        { id: 'my-advocate', label: 'My Advocate', icon: UserCheck },
        { id: 'meeting-requests', label: 'Meeting Requests', icon: MessageSquare },
           { id: 'payments', label: 'Payments', icon: CreditCard },

      ]
    },
    {
      title: 'MORE',
      items: [
        { id: 'downloads', label: 'Downloads', icon: Download },
        { id: 'legal-resources', label: 'Legal Resources', icon: BookOpen },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="lfcas-sidebar" data-testid="sidebar-navigation">
      <div className="sidebar-header" data-testid="sidebar-header">
        <button
          className={`sidebar-item ${activeItem === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveItem('dashboard')}
          data-testid="sidebar-dashboard-btn"
        >
          <Home size={20} />
          <span>Dashboard</span>
          {activeItem === 'dashboard' && <span className="sidebar-close-x">×</span>}
        </button>
      </div>

      <div className="sidebar-sections">
        {sidebarSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <p className="sidebar-section-title">{section.title}</p>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveItem(item.id);
                  if (item.id === 'ai-assistant') onStartAI();
                }}
                data-testid={`sidebar-${item.id}-btn`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                {item.hasDropdown && <ChevronDown size={14} className="sidebar-dropdown-icon" />}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        {/* <button className="premium-btn" data-testid="get-premium-btn">
          <Crown size={18} />
          <span>Get Premium</span>
        </button> */}
      </div>
    </aside>
  );
};

// ============ CIRCULAR PROGRESS ============
const CircularProgress = ({ percentage, size = 100 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circular-progress-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8e0f5" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#progressGradient)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="circular-progress-text">
        <span className="progress-value">{percentage}%</span>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [dynamicRecommendedAdvocates, setDynamicRecommendedAdvocates] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    total_cases: 0,
    active_cases: 0,
    completed_cases: 0,
    upcoming_meetings: 0,
    total_documents: 0,
    case_score: 7.5,
    unread_notifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState('dashboard');

   // NEW: State for real data
  const [caseTimeline, setCaseTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // AI Query State
  const [showAIQuery, setShowAIQuery] = useState(false);
  const [aiQueryData, setAIQueryData] = useState({ case_type: '', description: '', location: '' });
  const [aiAnalyzing, setAIAnalyzing] = useState(false);
  const [aiResult, setAIResult] = useState(null);
  const [recommendedAdvocates, setRecommendedAdvocates] = useState([]);
  const [aiQuickInput, setAiQuickInput] = useState('');

  // Meeting Request State
  const [showMeetingRequest, setShowMeetingRequest] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [requestingMeeting, setRequestingMeeting] = useState(false);

  // Rating Dialog State
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedCaseForRating, setSelectedCaseForRating] = useState(null);

 // Auto Bot Popup State
  const [showBotPopup, setShowBotPopup] = useState(false);

  useEffect(() => { 
    loadAllData(); 
    
    // Check if we should show the bot popup
    checkAndShowBotPopup();
  }, []);


    // NEW: Load timeline and insights when primary case changes
  useEffect(() => {
    if (cases.length > 0 && cases[0].id) {
      const primaryCaseId = cases[0].id;
      loadCaseTimeline(primaryCaseId);
      loadAIInsights(primaryCaseId);
    } else {
      setCaseTimeline([]);
      setAiInsights(null);
    }
  }, [cases]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDashboardSummary(),
        loadCases(),
        loadMeetingRequests(),
        loadMeetings(),
        loadReminders(),
        loadRecommendedAdvocates()
      ]);
    } catch (error) { console.error('Failed to load data:', error); }
    finally { setLoading(false); }
  };

  const loadDashboardSummary = async () => {
    try {
      const response = await dashboardAPI.getSummary();
      setDashboardSummary(response.data);
    } catch (error) {
      console.error('Failed to load dashboard summary:', error);
    }
  };

  const loadCases = async () => {
    try { 
      const response = await caseAPI.list(); 
      setCases(response.data || []); 
    }
    catch (error) { 
      console.error('Failed to load cases:', error); 
      setCases([]);
    }
  };
  
  const loadMeetingRequests = async () => {
    try { 
      const response = await meetingRequestAPI.list(); 
      setMeetingRequests(response.data || []); 
    }
    catch (error) { 
      console.error('Failed to load meeting requests:', error); 
      setMeetingRequests([]);
    }
  };
  
  const loadMeetings = async () => {
    try { 
      const response = await meetingAPI.list(); 
      setMeetings(response.data || []); 
    }
    catch (error) { 
      console.error('Failed to load meetings:', error); 
      setMeetings([]);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await dashboardAPI.getReminders();
      setReminders(response.data.reminders || []);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
    }
  };

  const loadRecommendedAdvocates = async () => {
    try {
      const response = await dashboardAPI.getRecommendedAdvocates();
      setDynamicRecommendedAdvocates(response.data.advocates || []);
    } catch (error) {
      console.error('Failed to load recommended advocates:', error);
      setDynamicRecommendedAdvocates([]);
    }
  };


   // NEW: Load case timeline (stage history)
  const loadCaseTimeline = async (caseId) => {
    if (!caseId) {
      setCaseTimeline([]);
      return;
    }
    
    try {
      setTimelineLoading(true);
      const response = await caseAPI.getStageHistory(caseId);
      
      // Map backend stages to timeline format
      const stageMapping = {
        'INITIATED': { label: 'Petition Filed', icon: 'check' },
        'PETITION_FILED': { label: 'Court Response', icon: 'check' },
        'COURT_REVIEW': { label: 'Court Review', icon: 'check' },
        'HEARING_SCHEDULED': { label: 'Hearing', icon: 'scale' },
        'HEARING_DONE': { label: 'Hearing Done', icon: 'check' },
        'JUDGMENT_PENDING': { label: 'Judgment', icon: 'gavel' },
        'CLOSED': { label: 'Closure', icon: 'file' }
      };
      
      const allStages = ['INITIATED', 'PETITION_FILED', 'COURT_REVIEW', 'HEARING_SCHEDULED', 'HEARING_DONE', 'JUDGMENT_PENDING', 'CLOSED'];
      
      // Create timeline based on stage history
      const timeline = allStages.map(stage => {
        const historyEntry = response.data.find(h => h.to_stage === stage);
        const mapping = stageMapping[stage] || { label: stage, icon: 'file' };
        
        if (historyEntry) {
          return {
            stage: mapping.label,
            status: 'completed',
            date: new Date(historyEntry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            icon: mapping.icon
          };
        } else {
          // Check if this is the next upcoming stage
          const completedStages = response.data.map(h => h.to_stage);
          const lastCompletedIndex = allStages.findIndex(s => s === completedStages[completedStages.length - 1]);
          const currentStageIndex = allStages.indexOf(stage);
          
          if (currentStageIndex === lastCompletedIndex + 1) {
            return {
              stage: mapping.label,
              status: 'upcoming',
              date: null,
              icon: mapping.icon
            };
          } else {
            return {
              stage: mapping.label,
              status: 'pending',
              date: null,
              icon: mapping.icon
            };
          }
        }
      });
      
      setCaseTimeline(timeline);
    } catch (error) {
      console.error('Failed to load case timeline:', error);
      setCaseTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  // NEW: Load AI insights for primary case
  const loadAIInsights = async (caseId) => {
    if (!caseId) {
      setAiInsights(null);
      return;
    }
    
    try {
      setInsightsLoading(true);
      const response = await caseAPI.getAIInsights(caseId);
      
      if (response.data.success && response.data.insights) {
        setAiInsights(response.data.insights);
      } else {
        // Fallback to default values
        setAiInsights({
          strength: 7.5,
          duration: "6-12 months",
          cost: "₹20K - ₹50K"
        });
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      // Fallback to default values
      setAiInsights({
        strength: 7.5,
        duration: "6-12 months",
        cost: "₹20K - ₹50K"
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  
  const checkAndShowBotPopup = () => {
    try {
      // Check if bot was skipped today
      const botSkippedDate = localStorage.getItem('botSkippedDate');
      const today = new Date().toDateString();

      // If bot was not skipped today, show the bot popup
      if (botSkippedDate !== today) {
        // Show bot popup after a short delay for better UX
        setTimeout(() => {
          setShowBotPopup(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking bot popup:', error);
    }
  };

  const handleCloseBotPopup = () => {
    // Store today's date to prevent showing again today
    localStorage.setItem('botSkippedDate', new Date().toDateString());
    setShowBotPopup(false);
  };

  const handleStartBotConversation = () => {
    // Close the popup and navigate to AI onboarding
    setShowBotPopup(false);
    navigate('/client/ai-onboarding');
  };

  const handleAIAnalyze = async (e) => {
    e.preventDefault();
    setAIAnalyzing(true);
    try {
      const response = await aiAPI.analyze(aiQueryData);
      setAIResult(response.data.ai_analysis);
      setRecommendedAdvocates(response.data.recommended_advocates || []);
      toast({ title: "Analysis Complete", description: "AI has analyzed your case." });
    } catch (error) {
      toast({ title: "Analysis Failed", description: error.response?.data?.detail || "Failed to analyze.", variant: "destructive" });
    } finally { setAIAnalyzing(false); }
  };

  const handleRequestMeeting = (advocate) => {
    setSelectedAdvocate(advocate);
    setShowMeetingRequest(true);
  };
  
  const handleOpenRatingDialog = (caseItem) => {
    setSelectedCaseForRating(caseItem);
    setShowRatingDialog(true);
  };
  
  const handleRatingSuccess = () => { loadCases(); };

  const submitMeetingRequest = async () => {
    if (!selectedAdvocate || !aiResult) return;
    setRequestingMeeting(true);
    try {
      await meetingRequestAPI.create({
        advocate_id: selectedAdvocate.id, 
        case_type: aiQueryData.case_type,
        description: aiQueryData.description, 
        location: aiQueryData.location, 
        ai_analysis: aiResult
      });
      toast({ title: "Meeting Request Sent", description: `Request sent to ${selectedAdvocate.user?.full_name}.` });
      setShowMeetingRequest(false); 
      setShowAIQuery(false); 
      setAIResult(null); 
      setRecommendedAdvocates([]);
      loadMeetingRequests();
    } catch (error) {
      toast({ title: "Request Failed", description: "Failed to send request.", variant: "destructive" });
    } finally { setRequestingMeeting(false); }
  };

  const formatCaseType = (type) =>
    type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    
    const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700', 
      accepted: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-red-100 text-red-700', 
      scheduled: 'bg-blue-100 text-blue-700',
      completed: 'bg-violet-100 text-violet-700', 
      initiated: 'bg-sky-100 text-sky-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const handleQuickAI = (caseType) => {
    setAIQueryData({ ...aiQueryData, case_type: caseType });
    setShowAIQuery(true);
  };

  // Use first case data or mock for display
  const primaryCase = cases.length > 0 ? cases[0] : null;



    // NEW: Calculate real progress based on case stage
  const calculateCaseProgress = (currentStage) => {
    const stageProgressMap = {
      'INITIATED': 10,
      'PETITION_FILED': 25,
      'COURT_REVIEW': 40,
      'HEARING_SCHEDULED': 55,
      'HEARING_DONE': 70,
      'JUDGMENT_PENDING': 85,
      'CLOSED': 100
    };
    return stageProgressMap[currentStage] || 10;
  };

  // Get real data for primary case
  const caseProgress = primaryCase ? calculateCaseProgress(primaryCase.current_stage) : 65;
  const caseNumber = primaryCase ? `LFC${String(primaryCase.id).slice(0, 3).toUpperCase()}` : 'LFC300';
  const caseTypeDisplay = primaryCase ? formatCaseType(primaryCase.case_type) : 'Divorce';
  const caseStatus = primaryCase?.current_stage ? primaryCase.current_stage.replace('_', ' ') : 'INITIATED';
  
  // Get advocate info from primary case
  const advocateName = primaryCase?.advocate?.user?.full_name || 'Not Assigned';
  
  // Get next hearing info - need to fetch from hearings
  const nextHearingDisplay = 'Not Scheduled'; // Will be updated with real hearing data
  const courtDisplay = 'Not Assigned'; // Will be updated with real court data
  return (
    <div className="lfcas-layout" data-testid="client-dashboard">
      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} onStartAI={() => setShowAIQuery(true)} />

      <div className="lfcas-main">
        {/* ===== TOP HEADER ===== */}
        <header className="lfcas-topbar" data-testid="dashboard-header">
          <div className="topbar-left">
            <h1 className="topbar-greeting">Hi, {user?.full_name?.split(' ')[0] || 'User'}</h1>
            <p className="topbar-subtitle">We're here to guide you through your legal journey</p>
          </div>
          <div className="topbar-right">
            <NotificationPanel />
            <div className="topbar-user">
              <span className="topbar-username">{user?.full_name}</span>
              <Button variant="outline" size="sm" onClick={logout} data-testid="logout-btn">Logout</Button>
            </div>
          </div>
        </header>

        {/* ===== CONDITIONAL PAGE RENDERING ===== */}
        {activeItem === 'documents' && <Documents />}
        {activeItem === 'case-tracker' && <CaseTracker />}
        {activeItem === 'my-cases' && <MyCases />}
        {activeItem === 'find-advocates' && <FindAdvocates />}
        {activeItem === 'my-advocate' && <MyAdvocate />}
        {activeItem === 'meeting-requests' && <MeetingRequests />}
         {activeItem === 'payments' && <PaymentsPage />}
        {activeItem === 'hearings' && <HearingsReminders />}
          {activeItem === 'downloads' && <Downloads />}
        {activeItem === 'legal-resources' && <LegalResources />}
        {activeItem === 'settings' && <SettingsPage />}

        {/* ===== MAIN DASHBOARD VIEW (DEFAULT) ===== */}
           {(activeItem === 'dashboard' || activeItem === 'ai-assistant') && (
          <>

        {/* ===== STATS ROW ===== */}
        <div className="stats-row" data-testid="stats-row">
          <div className="stat-card stat-cases" data-testid="stat-active-cases">
            <div className="stat-icon-wrap blue"><Briefcase size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{dashboardSummary.active_cases || cases.length}</span>
              <span className="stat-label">Active Cases</span>
            </div>
            <ArrowRight size={16} className="stat-arrow" />
          </div>
          <div className="stat-card stat-meetings" data-testid="stat-meetings">
            <div className="stat-icon-wrap purple"><Calendar size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{dashboardSummary.upcoming_meetings || meetings.length}</span>
              <span className="stat-label">This Week</span>
            </div>
          </div>
          <div className="stat-card stat-docs" data-testid="stat-documents">
            <div className="stat-icon-wrap teal"><Upload size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{dashboardSummary.total_documents || 0}</span>
              <span className="stat-label">Uploaded</span>
            </div>
          </div>
          <div className="stat-card stat-score" data-testid="stat-case-score">
            <div className="stat-icon-wrap amber"><Star size={22} /></div>
            <div className="stat-info">
              <span className="stat-value">{dashboardSummary.case_score || 7.5}<span className="stat-sub">/10</span></span>
              <span className="stat-label">Case Score</span>
            </div>
          </div>
        </div>

        {/* ===== MAIN GRID ===== */}
        <div className="dashboard-grid">
          {/* --- AI ASSISTANT CARD --- */}
          <div className="grid-ai-assistant" data-testid="ai-assistant-card">
            <div className="ai-card">
              <div className="ai-card-content">
                <div className="ai-card-left">
                  <h2 className="ai-card-title">Ask LFCAS AI Assistant</h2>
                  <p className="ai-card-desc">Describe your legal issue in your own words...</p>
                  <div className="ai-input-row">
                    <input
                      type="text"
                      placeholder="Type your question here..."
                      className="ai-input"
                      value={aiQuickInput}
                      onChange={(e) => setAiQuickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aiQuickInput.trim()) {
                          setAIQueryData({ ...aiQueryData, description: aiQuickInput });
                          setShowAIQuery(true);
                        }
                      }}
                      data-testid="ai-quick-input"
                    />
                    <button
                      className="ai-send-btn"
                      onClick={() => {
                        if (aiQuickInput.trim()) {
                          setAIQueryData({ ...aiQueryData, description: aiQuickInput });
                          setShowAIQuery(true);
                        }
                      }}
                      data-testid="ai-send-btn"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div className="ai-quick-tags">
                    {['Divorce', 'Child Custody', 'Alimony', 'Domestic Violence'].map(tag => (
                      <button
                        key={tag}
                        className="ai-tag"
                        onClick={() => handleQuickAI(tag.toLowerCase().replace(' ', '_'))}
                        data-testid={`ai-tag-${tag.toLowerCase().replace(' ', '-')}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ai-card-illustration">
                  <div className="ai-robot">
                    <Bot size={52} />
                    <Scale size={28} className="robot-scale" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- CASE PROGRESS TIMELINE --- */}
          <div className="grid-timeline" data-testid="case-progress-timeline">
            <div className="section-header">
              <h3 className="section-title">Case Progress Timeline</h3>
             <button 
                className="section-link" 
                onClick={() => setActiveItem('case-tracker')}
                data-testid="timeline-view-details"
              >
                View Details <ArrowRight size={14} />
              </button>
            </div>
            {timelineLoading ? (
              <div className="loading-center"><Loader2 className="animate-spin" size={24} /></div>
            ) : caseTimeline.length > 0 ? (
              <div className="timeline-track">
                {caseTimeline.map((step, i) => (
                  <div key={i} className={`timeline-step ${step.status}`} data-testid={`timeline-step-${i}`}>
                    <div className="timeline-icon-wrap">
                      {step.status === 'completed' ? (
                        <CheckCircle size={28} />
                      ) : step.status === 'upcoming' ? (
                        <Scale size={24} />
                      ) : (
                        <div className="timeline-pending-icon">
                          {step.icon === 'gavel' ? <Gavel size={20} /> : <FileText size={20} />}
                        </div>
                      )}
                    </div>
                    {i < caseTimeline.length - 1 && <div className={`timeline-connector ${step.status}`} />}
                    <p className="timeline-label">{step.stage}</p>
                    <p className="timeline-status">
                      {step.status === 'completed' ? 'Completed' : step.status === 'upcoming' ? 'Upcoming' : 'Pending'}
                    </p>
                    {step.date && <p className="timeline-date">{step.date}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No case timeline available</p>
              </div>
            )}
          </div>

          {/* --- YOUR CASES OVERVIEW --- */}
          <div className="grid-cases-overview" data-testid="cases-overview">
            <div className="section-header">
              <h3 className="section-title">Your Cases Overview</h3>
                <button 
                className="section-link" 
                onClick={() => setActiveItem('my-cases')}
                data-testid="cases-see-all"
              >
                See All <ArrowRight size={14} />
              </button>
            </div>
            {loading ? (
              <div className="loading-center"><Loader2 className="animate-spin" size={32} /></div>
            ) : primaryCase ? (
              <div className="case-overview-card" data-testid="primary-case-card">
                <div className="case-card-top">
                  <div className="case-card-left-info">
                    <span className="case-id">{caseNumber}</span>
                    <h4 className="case-title">
                      {caseTypeDisplay} Case
                    </h4>
                    <Badge className="case-status-badge">
                      <Gavel size={12} />
                      {caseStatus}
                    </Badge>
                  </div>
                  <div className="case-card-right-progress">
                    <div className="case-illustration">
                      <Gavel size={40} className="gavel-icon" />
                    </div>
                    <CircularProgress percentage={caseProgress} size={90} />
                    <span className="progress-label">Progress</span>
                  </div>
                </div>
                <div className="case-card-details">
                  <p><UserCheck size={14} /> <strong>Advocate:</strong> {advocateName}</p>
                  <p><Clock size={14} /> <strong>Next Hearing:</strong> {nextHearingDisplay}</p>
                  <p><MapPin size={14} /> <strong>Court:</strong> {courtDisplay}</p>
                </div>
                <div className="case-card-actions">
                  <Button
                    className="btn-open-dashboard"
                    onClick={() => navigate(`/client/cases/${primaryCase.id}`)}
                    data-testid="open-case-dashboard-btn"
                  >
                    Open Dashboard
                  </Button>
                  <Button variant="outline" className="btn-download-summary" data-testid="download-summary-btn">
                    <Download size={14} /> Download Summary <ChevronDown size={14} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No cases found</p>
                <Button 
                  onClick={() => setShowAIQuery(true)} 
                  className="mt-4"
                  data-testid="start-new-case-btn"
                >
                  <Plus size={16} className="mr-2" />
                  Start New Case
                </Button>
              </div>
            )}
          </div>

          {/* --- UPCOMING REMINDERS --- */}
          <div className="grid-reminders" data-testid="upcoming-reminders">
            <div className="section-header">
              <h3 className="section-title">Upcoming Reminders</h3>
               <button 
                className="section-link" 
                onClick={() => setActiveItem('hearings')}
                data-testid="reminders-view-all"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="reminders-list">
              {(reminders.length > 0 ? reminders : []).slice(0, 3).map((rem, i) => (
                <div key={i} className={`reminder-item ${rem.color || 'blue'}`} data-testid={`reminder-item-${i}`}>
                  <div className={`reminder-icon ${rem.color || 'blue'}`}>
                    {rem.icon === 'calendar' ? <Calendar size={18} /> :
                     rem.icon === 'alert' ? <AlertCircle size={18} /> :
                     <CheckCircle size={18} />}
                  </div>
                  <div className="reminder-info">
                    <p className="reminder-type">{rem.type}</p>
                    <p className="reminder-detail"><Star size={10} /> {rem.detail}</p>
                  </div>
                  <span className={`reminder-time ${rem.color || 'blue'}`}>{formatDateTime(rem.time)}</span>
                </div>
              ))}
              {reminders.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No upcoming reminders</p>
              )}
            </div>
          </div>

          {/* --- QUICK ACTIONS --- */}
          <div className="grid-quick-actions" data-testid="quick-actions">
            <div className="quick-actions-row">
              {[
                { label: 'Start New Case', desc: 'Create a new case with AI guidance', icon: FileText, color: 'green', action: () => setShowAIQuery(true) },
                { label: 'Upload Documents', desc: 'Secure & advocate controlled', icon: Upload, color: 'blue', action: () => setActiveItem('documents') },
                { label: 'Find Advocate', desc: 'Get matched with verified experts', icon: Search, color: 'purple', action: () => setActiveItem('find-advocates') },
                { label: 'Download Report', desc: 'Get PDF summary of your case', icon: FileDown, color: 'teal', action: () => setActiveItem('downloads') },
              ].map((item, i) => (
                <button key={i} className={`quick-action-card ${item.color}`} onClick={item.action} data-testid={`quick-action-${item.label.toLowerCase().replace(/ /g, '-')}`}>
                  <div className={`qa-icon ${item.color}`}><item.icon size={24} /></div>
                  <p className="qa-label">{item.label}</p>
                  <p className="qa-desc">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* --- RECOMMENDED ADVOCATES --- */}
          <div className="grid-advocates" data-testid="recommended-advocates">
            <div className="section-header">
              <h3 className="section-title">Recommended Advocates</h3>
              <button 
                className="section-link" 
                onClick={() => setActiveItem('find-advocates')}
                data-testid="advocates-see-all"
              >
                See All <ArrowRight size={14} />
              </button>
            </div>
            <div className="advocates-list">
              {(dynamicRecommendedAdvocates.length > 0 ? dynamicRecommendedAdvocates : []).slice(0, 3).map((adv, i) => (
                <div key={i} className="advocate-row" data-testid={`advocate-item-${i}`}>
                  <div className="advocate-avatar">
                    <img
                      src={getAvatarUrl(adv, { size: 80 })}
                      alt={adv.name}
                      onError={handleAvatarError(adv)}
                      data-testid={`advocate-avatar-${i}`}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #F0EBF9',
                        background: '#F5F3FF'
                      }}
                    />
                  </div>
                  <div className="advocate-info">
                    <p className="advocate-name">
                      {adv.name}
                      {adv.verified && <CheckCircle size={14} className="verified-badge" />}
                    </p>
                    <p className="advocate-specialty">{adv.specialty} &bull; {adv.experience}</p>
                  </div>
                  <div className="advocate-rating">
                    <Star size={14} className="star-icon" /> {adv.rating?.toFixed(1) || adv.rating}
                  </div>
                  <Button size="sm" className="advocate-request-btn" data-testid={`request-advocate-${i}`}>Request</Button>
                </div>
              ))}
              {dynamicRecommendedAdvocates.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No advocates available</p>
              )}
            </div>
          </div>

          {/* --- LEGAL INSIGHTS --- */}
          <div className="grid-insights" data-testid="legal-insights">
            <div className="insights-card">
              <div className="insights-header">
                <div className="insights-icon-wrap"><Sparkles size={20} /></div>
                <h3 className="insights-title">Legal Insights for You</h3>
              </div>
              {insightsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : aiInsights ? (
                <>
                  <div className="insights-metrics">
                    <div className="insight-metric" data-testid="insight-case-strength">
                      <div className="metric-icon purple"><Scale size={16} /></div>
                      <div className="metric-info">
                        <span className="metric-label">Case Strength</span>
                        <div className="metric-bar-wrap">
                          <div className="metric-bar" style={{ width: `${(aiInsights.strength || 7.5) * 10}%` }} />
                        </div>
                      </div>
                      <span className="metric-value">{(aiInsights.strength || 7.5).toFixed(1)}/10</span>
                    </div>
                    <div className="insight-metric" data-testid="insight-duration">
                      <div className="metric-icon blue"><Clock size={16} /></div>
                      <span className="metric-label">Est. Duration</span>
                      <span className="metric-value">{aiInsights.duration || '6-12 Months'}</span>
                    </div>
                    <div className="insight-metric" data-testid="insight-cost">
                      <div className="metric-icon orange"><AlertCircle size={16} /></div>
                      <span className="metric-label">Cost Range</span>
                      <span className="metric-value">{aiInsights.cost || '₹20K - ₹50K'}</span>
                    </div>
                  </div>
                  <button 
                    className="insights-cta" 
                    data-testid="get-detailed-analysis-btn"
                    onClick={() => primaryCase && navigate(`/client/cases/${primaryCase.id}`)}
                  >
                    Get Detailed Analysis <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No insights available</p>
                  {primaryCase && (
                    <Button 
                      onClick={() => loadAIInsights(primaryCase.id)} 
                      className="mt-3"
                      size="sm"
                    >
                      Generate Insights
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
         </>
        )}
      </div>

      {/* ========== DIALOGS ========== */}

      {/* AI Analysis Dialog */}
      <Dialog open={showAIQuery} onOpenChange={setShowAIQuery}>
        <DialogContent className="max-w-4xl bg-white border-slate-200 rounded-3xl max-h-[90vh] overflow-y-auto" data-testid="ai-analysis-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="text-violet-600" /> AI Legal Analysis
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Tell us about your case and get instant insights with advocate recommendations.
            </DialogDescription>
          </DialogHeader>

          {!aiResult ? (
            <form onSubmit={handleAIAnalyze} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Case Type</Label>
                <Select value={aiQueryData.case_type} onValueChange={(v) => setAIQueryData({ ...aiQueryData, case_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select case type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="alimony">Alimony</SelectItem>
                    <SelectItem value="child_custody">Child Custody</SelectItem>
                    <SelectItem value="dowry">Dowry</SelectItem>
                    <SelectItem value="domestic_violence">Domestic Violence</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={aiQueryData.location} onChange={(e) => setAIQueryData({ ...aiQueryData, location: e.target.value })} placeholder="e.g. Kolkata, West Bengal" />
              </div>
              <div className="space-y-2">
                <Label>Describe Your Situation</Label>
                <Textarea value={aiQueryData.description} onChange={(e) => setAIQueryData({ ...aiQueryData, description: e.target.value })} rows={6} placeholder="Please provide details about your legal issue..." />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAIQuery(false)}>Cancel</Button>
                <Button type="submit" disabled={aiAnalyzing} className="bg-gradient-to-r from-violet-600 to-purple-600">
                  {aiAnalyzing ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="py-4 space-y-8">
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-8">
                <h3 className="font-semibold text-violet-700 mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> AI Analysis Summary
                </h3>
                {aiResult?.success && aiResult?.data ? (
                  <div className="space-y-6">
                    {aiResult.data.case_classification && (
                      <div className="bg-white rounded-xl p-5 border border-violet-100">
                        <h4 className="font-semibold text-slate-800 mb-2">Case Type</h4>
                        <p className="text-slate-700">{formatCaseType(aiResult.data.case_classification)}</p>
                      </div>
                    )}
                    {aiResult.data.legal_sections?.length > 0 && (
                      <div className="bg-white rounded-xl p-5 border border-violet-100">
                        <h4 className="font-semibold text-slate-800 mb-3">Applicable Legal Sections</h4>
                        <ul className="space-y-2">{aiResult.data.legal_sections.map((s, idx) => (
                          <li key={idx} className="text-slate-700"><span className="text-violet-600 font-bold mr-2">•</span>{s}</li>
                        ))}</ul>
                      </div>
                    )}
                    {aiResult.data.required_documents?.length > 0 && (
                      <div className="bg-white rounded-xl p-5 border border-violet-100">
                        <h4 className="font-semibold text-slate-800 mb-3">Required Documents</h4>
                        <ul className="space-y-2">{aiResult.data.required_documents.map((d, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700"><CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />{d}</li>
                        ))}</ul>
                      </div>
                    )}
                    {aiResult.data.procedural_guidance && (
                      <div className="bg-white rounded-xl p-5 border border-violet-100">
                        <h4 className="font-semibold text-slate-800 mb-3">Procedural Guidance</h4>
                        <p className="text-slate-700 whitespace-pre-line">{aiResult.data.procedural_guidance}</p>
                      </div>
                    )}
                    <Button variant="outline" onClick={() => { setAIResult(null); setRecommendedAdvocates([]); }} className="w-full">Start New Query</Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No analysis data available.</p>
                    <Button variant="outline" onClick={() => { setAIResult(null); setRecommendedAdvocates([]); }} className="mt-4">Start New Query</Button>
                  </div>
                )}
              </div>
              {recommendedAdvocates.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <UserCheck className="text-amber-500 w-6 h-6" /> Recommended Advocates
                  </h3>
                  <div className="space-y-4">
                    {recommendedAdvocates.map((adv) => (
                      <Card key={adv.id} className="p-6 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 flex-1">
                            <img
                              src={getAvatarUrl({ profile_image_url: adv.user?.profile_image_url, full_name: adv.user?.full_name }, { size: 80 })}
                              alt={adv.user?.full_name || 'Advocate'}
                              onError={handleAvatarError({ full_name: adv.user?.full_name })}
                              className="w-14 h-14 rounded-full object-cover border-2 border-violet-100"
                              data-testid={`ai-recommended-avatar-${adv.id}`}
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-xl text-slate-900 mb-1">{adv.user?.full_name || 'Advocate'}</h4>
                              <p className="text-sm text-slate-600">{adv.location} &bull; {adv.experience_years} yrs &bull; Rating: {adv.rating}/5.0</p>
                            </div>
                          </div>
                          <Button onClick={() => handleRequestMeeting(adv)} className="bg-gradient-to-r from-violet-600 to-purple-600">
                            Request Meeting
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Request Confirmation */}
      <Dialog open={showMeetingRequest} onOpenChange={setShowMeetingRequest}>
        <DialogContent className="bg-white border-slate-200 rounded-3xl" data-testid="meeting-request-dialog">
          <DialogHeader>
            <DialogTitle>Confirm Meeting Request</DialogTitle>
            <DialogDescription>Send request to {selectedAdvocate?.user?.full_name}?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowMeetingRequest(false)}>Cancel</Button>
            <Button onClick={submitMeetingRequest} disabled={requestingMeeting}>
              {requestingMeeting ? "Sending..." : "Confirm Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      {selectedCaseForRating && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          caseData={selectedCaseForRating}
          onSuccess={handleRatingSuccess}
        />
      )}

       {/* Auto Bot Popup Dialog */}
      <Dialog open={showBotPopup} onOpenChange={setShowBotPopup}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 border-purple-200 rounded-3xl" data-testid="bot-popup-dialog">
          <DialogHeader>
            <div className="flex flex-col items-center text-center mb-4">
              {/* AI Robot Icon */}
              <div className="relative mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-xl">
                  <Bot size={48} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
              </div>
              <DialogTitle className="text-3xl font-bold text-gray-900">
                Welcome to Your AI Legal Assistant
              </DialogTitle>
              <DialogDescription className="text-lg text-gray-600 mt-3 leading-relaxed">
                I can help you understand your legal problem and guide you step-by-step.
                Let's have a conversation about your case.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Features Grid */}
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mic size={24} className="text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Voice Enabled</h4>
              <p className="text-sm text-gray-600">Speak naturally in multiple languages</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot size={24} className="text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">AI Analysis</h4>
              <p className="text-sm text-gray-600">Get instant legal insights</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Case Ready</h4>
              <p className="text-sm text-gray-600">Prepared automatically</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <Button
              size="lg"
              onClick={handleStartBotConversation}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
              data-testid="bot-popup-start-btn"
            >
              <Sparkles className="mr-2" size={20} />
              Start Conversation
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleCloseBotPopup}
              className="flex-1 text-lg py-6"
              data-testid="bot-popup-skip-btn"
            >
              Skip for Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

         {/* Floating AI Bot Reopen Button */}
      <button
        onClick={() => setShowBotPopup(true)}
        data-testid="floating-ai-bot-btn"
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center group"
        aria-label="Open AI Assistant"
      >
        <Bot size={28} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
        <span className="absolute right-full mr-3 px-3 py-2 rounded-lg bg-zinc-900 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Ask AI Assistant
        </span>
      </button>
    </div>
  );
};

export default ClientDashboard;