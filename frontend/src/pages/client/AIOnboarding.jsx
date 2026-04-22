import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useVoice } from '../../contexts/VoiceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Mic, MicOff, Send, Loader2, CheckCircle, X, 
  Volume2, Keyboard, FileText, Sparkles, ArrowRight,
  AlertCircle, VolumeX, Scale
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { caseAPI, authAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import LanguageSelector from '../../components/LanguageSelector';
import VoiceWaveAnimation from '../../components/VoiceWaveAnimation';

const AIOnboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef(null);

  // Voice context
  const {
    session,
    messages,
    language,
    isRecording,
    isSpeaking,
    isAISpeaking,
    currentTranscript,
    analysis,
    isProcessing,
    error,
    setError,
    browserSupported,
    startSession,
    stopRecording,
    startRecording,
    stopSpeaking,
    processConversation,
    sendTextMessage,
    reset
  } = useVoice();

 // State - Start directly at language selection (skip intro since it shows in dashboard popup)
  const [step, setStep] = useState('language'); // 'intro', 'language', 'conversation', 'caseDraft'
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [caseDraft, setCaseDraft] = useState(null);
  const [creatingCase, setCreatingCase] = useState(false);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSkip = async () => {
    // Skip and go to dashboard (keep has_completed_onboarding = false)
    navigate('/client/dashboard');
  };

  const handleStartOnboarding = () => {
    setStep('language');
  };

  const handleLanguageSelect = async (selectedLanguage) => {
    try {
      setError(null);
      await startSession(selectedLanguage);
      setStep('conversation');
    } catch (err) {
      console.error('Error starting session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to start voice session');
    }
  };

  const handleFinishConversation = async () => {
    try {
      setError(null);
      
      if (messages.length < 2) {
        setError('Please have a conversation first. Share your legal problem with the AI assistant.');
        return;
      }
      
      await processConversation();
      
      // After processing, show case draft
      setStep('caseDraft');
    } catch (err) {
      console.error('Error processing conversation:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to process conversation');
    }
  };

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    
    try {
      await sendTextMessage(textInput.trim());
      setTextInput('');
    } catch (err) {
      console.error('Error sending text:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleFindAdvocates = async () => {
    // NEW FLOW: Don't create case directly
    // Instead, guide user to find advocates and request meeting
    

    if (!analysis) {
      toast({
        title: "Error",
        description: "No case analysis available",
        variant: "destructive"
      });
      return;
    }

    try {
      // Mark onboarding as completed
      await authAPI.updateOnboardingStatus(true);
      await updateUser();

      // Store analysis in localStorage for advocate selection page
      localStorage.setItem('pendingCaseAnalysis', JSON.stringify({
        analysis: analysis,
        conversationMessages: messages,
        timestamp: new Date().toISOString()
      }));

      toast({
        title: "Analysis Complete!",
        description: "Now let's find the right advocate for your case.",
      });

      // Navigate to Find Advocates page
      navigate('/client/find-advocates');
    } catch (error) {
      console.error('Failed to proceed:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCaseType = (type) =>
    type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || type;

  // INTRO SCREEN
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            {/* AI Robot Illustration */}
            <motion.div
              className="mb-8 inline-block"
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Bot size={64} className="text-white" />
                </div>
                <motion.div
                  className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={24} className="text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Your AI Legal Assistant
            </h1>
            
            {/* Subtext */}
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              I will help you understand your legal problem and guide you step-by-step. 
              Let's have a conversation about your case.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                  <Mic size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Voice Enabled</h3>
                {/* <p className="text-sm text-gray-600">Speak naturally in English, Hindi, or Bengali</p> */}
                 <p className="text-sm text-gray-600">Speak naturally in English or Hindi</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                  <Bot size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">AI Analysis</h3>
                <p className="text-sm text-gray-600">Get instant legal insights and guidance</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                  <FileText size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Auto Case Creation</h3>
                <p className="text-sm text-gray-600">Your case is prepared automatically</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleStartOnboarding}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg px-8 py-6"
                data-testid="start-conversation-btn"
              >
                <Sparkles className="mr-2" size={20} />
                Start Conversation
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleSkip}
                className="text-lg px-8 py-6"
                data-testid="skip-for-now-btn"
              >
                Skip for Now
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // LANGUAGE SELECTION SCREEN
  if (step === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl p-8"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Select Your Language</h2>
            <Button variant="ghost" onClick={handleSkip} data-testid="skip-language-btn">
              Skip
            </Button>
          </div>

          {/* Language Selector */}
          <LanguageSelector onSelect={handleLanguageSelect} />

          {/* Error */}
          {error && (
            <motion.div 
              className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // CONVERSATION SCREEN
  if (step === 'conversation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI Legal Assistant</h2>
                <p className="text-sm text-gray-600">Tell me about your legal problem</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleSkip} data-testid="skip-conversation-btn">
              Skip for Now
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="max-w-6xl mx-auto w-full mt-4 px-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex items-center gap-4 flex-wrap">
            {isRecording ? (
              <div className="flex items-center gap-2 text-green-600">
                <motion.div
                  className="w-2 h-2 bg-green-600 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <Mic size={16} />
                <span className="font-medium">Listening...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <MicOff size={16} />
                <span>Mic Off</span>
              </div>
            )}

            {isSpeaking && (
              <div className="flex items-center gap-2 text-blue-600">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Mic size={16} />
                </motion.div>
                <span>You're speaking...</span>
              </div>
            )}

            {isAISpeaking && (
              <div className="flex items-center gap-2 text-purple-600">
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Volume2 size={16} />
                </motion.div>
                <span>AI is speaking...</span>
              </div>
            )}

            {!browserSupported && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle size={16} />
                <span>Voice not supported. Use text input.</span>
              </div>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto mb-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Mic size={64} className="text-purple-300 mb-4" />
                </motion.div>
                <p className="text-xl font-medium text-gray-700 mb-2">Start speaking to share your legal problem</p>
                <p className="text-gray-500">The AI assistant will ask follow-up questions</p>
                {browserSupported && (
                  <p className="text-sm text-gray-400 mt-4">Or click "Type Instead" to use text input</p>
                )}
              </div>
            )}

            {messages.map((msg, index) => (
              <motion.div
                key={index}
                className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.sender === 'user' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {msg.sender === 'user' ? '👤' : '🤖'}
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.message}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {currentTranscript && (
              <motion.div
                className="mb-4 flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              >
                <div className="flex gap-3 max-w-[80%] flex-row-reverse">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100">
                    👤
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-blue-600 text-white opacity-60">
                    {currentTranscript}
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ...
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Wave Animation */}
          {(isSpeaking || isAISpeaking) && (
            <div className="mb-4">
              <VoiceWaveAnimation isUserSpeaking={isSpeaking} />
            </div>
          )}

          {/* Text Input */}
          {showTextInput && (
            <motion.div 
              className="mb-4 flex gap-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button
                onClick={handleSendText}
                disabled={!textInput.trim()}
                className="px-6"
              >
                <Send size={20} />
              </Button>
            </motion.div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {browserSupported && (
                <Button
                  onClick={handleToggleMic}
                  variant={isRecording ? 'destructive' : 'default'}
                  className="px-6"
                  data-testid="toggle-mic-btn"
                >
                  {isRecording ? <MicOff size={20} className="mr-2" /> : <Mic size={20} className="mr-2" />}
                  {isRecording ? 'Stop' : 'Listen'}
                </Button>
              )}

              {isAISpeaking && (
                <Button
                  onClick={stopSpeaking}
                  variant="outline"
                  data-testid="stop-ai-btn"
                >
                  <VolumeX size={20} className="mr-2" />
                  Mute AI
                </Button>
              )}

              <Button
                onClick={() => setShowTextInput(!showTextInput)}
                variant="outline"
                data-testid="toggle-text-btn"
              >
                <Keyboard size={20} className="mr-2" />
                {showTextInput ? 'Hide Text' : 'Type Instead'}
              </Button>

              <Button
                onClick={handleFinishConversation}
                disabled={isProcessing || messages.length < 2}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8"
                data-testid="finish-analyze-btn"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Finish & Analyze
                  </>
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-3">
              {messages.length} messages exchanged
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CASE DRAFT SCREEN
  if (step === 'caseDraft' && analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Your Case Summary</h2>
                  <p className="text-purple-100">AI has analyzed your situation</p>
                </div>
                <Sparkles size={48} className="opacity-50" />
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {analysis && analysis.structured_output ? (
                <div className="space-y-6">
                  {/* Case Type */}
                  {(analysis.case_type || analysis.structured_output.case_classification) && (
                    <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Scale size={20} className="text-white" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Case Type</h3>
                      </div>
                      <p className="text-lg text-gray-700 font-medium">
                        {formatCaseType(analysis.case_type || analysis.structured_output.case_classification)}
                      </p>
                    </div>
                  )}

                  {/* Legal Sections */}
                  {analysis.legal_sections?.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Applicable Legal Sections</h3>
                      <ul className="space-y-2">
                        {analysis.legal_sections.map((section, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-gray-700">
                            <CheckCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>{section}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Required Documents */}
                  {analysis.required_documents?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h3>
                      <ul className="space-y-2">
                        {analysis.required_documents.map((doc, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-gray-700">
                            <FileText size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Procedural Guidance */}
                  {analysis.procedural_guidance && (
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h3>
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {analysis.procedural_guidance}
                      </p>
                    </div>
                  )}
                  {/* Action Buttons - UPDATED FLOW */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ArrowRight size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Next Step: Find an Advocate</h3>
                        <p className="text-gray-600 leading-relaxed">
                          Based on your legal issue, we'll help you find experienced advocates who specialize in this area. 
                          You can review their profiles, request a meeting, and discuss your case before proceeding.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleFindAdvocates}
                        disabled={creatingCase}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
                        data-testid="find-advocates-btn"
                      >
                        {creatingCase ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={20} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} className="mr-2" />
                            Find Advocates Now
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleSkip}
                        variant="outline"
                        className="flex-1 text-lg py-6"
                        disabled={creatingCase}
                        data-testid="skip-case-btn"
                      >
                        Skip for Now
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                  <p className="text-lg text-gray-700 mb-6">No analysis data available.</p>
                  <Button onClick={() => setStep('intro')} variant="outline">
                    Start Over
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
};

export default AIOnboarding;
