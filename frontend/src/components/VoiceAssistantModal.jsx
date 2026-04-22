// Enhanced Voice Assistant Modal with Web Speech API and improved UI
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, CheckCircle, Loader2, AlertCircle, Keyboard, Send, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoice } from '@/contexts/VoiceContext';
import LanguageSelector from './LanguageSelector';
import VoiceWaveAnimation from './VoiceWaveAnimation';
import CaseSummaryScreen from './CaseSummaryScreen';
import '@/styles/voice-modal.css';

const VoiceAssistantModal = () => {
  const {
    isOpen,
    setIsOpen,
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
    readyToAnalyze,
        silenceMs,
    setSilenceMs,
    startSession,
    stopRecording,
    startRecording,
    stopSpeaking,
    processConversation,
    sendTextMessage,
    reset
  } = useVoice();

  const [step, setStep] = useState('language'); // 'language', 'conversation', 'summary'
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLanguageSelect = async (selectedLanguage) => {
    try {
      setError(null);
      console.log('Language selected:', selectedLanguage);
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
        setError('Please have a conversation first before finishing. Share your legal problem with the AI assistant.');
        return;
      }
      
      await processConversation();
      setStep('summary');
    } catch (err) {
      console.error('Error processing conversation:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to process conversation');
    }
  };

  const handleClose = () => {
    stopRecording();
    stopSpeaking();
    setIsOpen(false);
    reset();
    setStep('language');
    setError(null);
    setShowTextInput(false);
    setTextInput('');
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="voice-assistant-modal"
        className="voice-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="voice-modal-container"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="voice-modal-header">
            <div className="flex items-center gap-3">
              <div className="voice-header-icon">
                {step === 'language' && '🌐'}
                {step === 'conversation' && '🤖'}
                {step === 'summary' && '📋'}
              </div>
              <h2 className="voice-modal-title">
                {step === 'language' && 'Select Language'}
                {step === 'conversation' && 'AI Legal Assistant'}
                {step === 'summary' && 'Case Summary'}
              </h2>
            </div>
            <button 
              onClick={handleClose} 
              className="voice-modal-close" 
              data-testid="close-modal-button"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className="error-alert" 
                data-testid="error-alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="voice-modal-content">
            {step === 'language' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LanguageSelector onSelect={handleLanguageSelect} />
              </motion.div>
            )}

            {step === 'conversation' && (
              <div className="conversation-container">
                {/* Status Bar */}
                <div className="status-bar" data-testid="status-bar">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Recording Status */}
                    {isRecording ? (
                      <div className="status-indicator active">
                        <motion.span 
                          className="status-dot"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <Mic size={16} />
                        <span>Listening</span>
                      </div>
                    ) : (
                      <div className="status-indicator inactive">
                        <span className="status-dot inactive" />
                        <MicOff size={16} />
                        <span>Mic Off</span>
                      </div>
                    )}

                    {/* Speaking Status */}
                    {isSpeaking && (
                      <div className="status-indicator speaking">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Mic size={16} />
                        </motion.div>
                        <span>You're speaking...</span>
                      </div>
                    )}

                    {/* AI Speaking Status */}
                    {isAISpeaking && (
                      <div className="status-indicator ai-speaking">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Volume2 size={16} />
                        </motion.div>
                        <span>AI is speaking...</span>
                      </div>
                    )}
                  </div>

                  {/* Browser Not Supported Warning */}
                  {!browserSupported && (
                    <div className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>Voice not supported in this browser. Use text input below.</span>
                    </div>
                  )}


                         {/* Silence threshold selector */}
                  {browserSupported && (
                    <div
                      className="flex items-center gap-2 text-xs ml-auto"
                      data-testid="silence-threshold-container"
                      title="Auto-send your speech to AI after this much quiet"
                    >
                      <label
                        htmlFor="silence-ms-select"
                        className="text-gray-600 font-medium whitespace-nowrap"
                      >
                        Auto-send after
                      </label>
                      <select
                        id="silence-ms-select"
                        data-testid="silence-threshold-select"
                        value={silenceMs}
                        onChange={(e) => setSilenceMs(parseInt(e.target.value, 10))}
                        className="border border-gray-300 bg-white text-gray-800 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value={1000}>1.0s</option>
                        <option value={1500}>1.5s</option>
                        <option value={2000}>2.0s</option>
                        <option value={2500}>2.5s</option>
                        <option value={3000}>3.0s</option>
                        <option value={4000}>4.0s</option>
                        <option value={5000}>5.0s</option>
                      </select>
                      <span className="text-gray-500 hidden sm:inline">of silence</span>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="messages-container" data-testid="messages-container">
                  {messages.length === 0 && (
                    <div className="empty-state">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Mic size={48} className="empty-icon" />
                      </motion.div>
                      <p className="text-lg font-medium">Start speaking to share your legal problem</p>
                      <p className="text-sm text-gray-500">The AI assistant will ask follow-up questions</p>
                      {browserSupported && (
                        <p className="text-xs text-gray-400 mt-2">Or click "Type instead" to use text input</p>
                      )}
                    </div>
                  )}
                  
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      className={`message ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`}
                      data-testid={`message-${msg.sender}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="message-avatar">
                        {msg.sender === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-content">
                        <div className="message-bubble">
                          {msg.message}
                        </div>
                        <div className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Current interim transcript */}
                  {currentTranscript && (
                    <motion.div
                      className="message message-user"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                    >
                      <div className="message-avatar">👤</div>
                      <div className="message-content">
                        <div className="message-bubble interim-transcript">
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
                  <VoiceWaveAnimation isUserSpeaking={isSpeaking} />
                )}

                {/* Instructions */}
                <div className="instructions" data-testid="instructions">
                  <p className="text-sm text-gray-600">
                    {language === 'english' && '💡 The AI will ask you questions one by one. Answer naturally and the AI will guide you.'}
                    {language === 'hindi' && '💡 AI आपसे एक-एक करके प्रश्न पूछेगा। स्वाभाविक रूप से उत्तर दें और AI आपका मार्गदर्शन करेगा।'}
                    {language === 'bengali' && '💡 AI আপনাকে একের পর এক প্রশ্ন জিজ্ঞাসা করবে। স্বাভাবিকভাবে উত্তর দিন এবং AI আপনাকে গাইড করবে।'}
                  </p>
                </div>

                {/* Text Input (Fallback) */}
                {showTextInput && (
                  <motion.div 
                    className="text-input-container"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        language === 'english' ? "Type your message..." :
                        language === 'hindi' ? "अपना संदेश टाइप करें..." :
                        "আপনার বার্তা টাইপ করুন..."
                      }
                      className="text-input-field"
                    />
                    <button
                      onClick={handleSendText}
                      disabled={!textInput.trim()}
                      className="text-input-send-btn"
                    >
                      <Send size={20} />
                    </button>
                  </motion.div>
                )}

                {/* Controls */}
                <div className="conversation-controls">
                  <div className="control-buttons-row">
                    {/* Mic Toggle */}
                    {browserSupported && (
                      <button
                        onClick={handleToggleMic}
                        className={`control-button ${isRecording ? 'active' : ''}`}
                        data-testid="toggle-mic-button"
                        title={isRecording ? 'Stop listening' : 'Start listening'}
                      >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                        <span className="hidden sm:inline">
                          {isRecording ? 'Stop' : 'Listen'}
                        </span>
                      </button>
                    )}

                    {/* Mute AI */}
                    {isAISpeaking && (
                      <button
                        onClick={stopSpeaking}
                        className="control-button"
                        data-testid="stop-speaking-button"
                        title="Stop AI voice"
                      >
                        <VolumeX size={20} />
                        <span className="hidden sm:inline">Mute AI</span>
                      </button>
                    )}

                    {/* Type Instead */}
                    <button
                      onClick={() => setShowTextInput(!showTextInput)}
                      className="control-button"
                      data-testid="toggle-text-input-button"
                      title="Type instead of speaking"
                    >
                      <Keyboard size={20} />
                      <span className="hidden sm:inline">
                        {showTextInput ? 'Hide Text' : 'Type Instead'}
                      </span>
                    </button>

                    {/* Finish Button */}
                    <button
                      onClick={handleFinishConversation}
                      className="finish-button"
                      disabled={isProcessing || messages.length < 2}
                      data-testid="finish-conversation-button"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="spinner" size={20} />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>
                            {language === 'english' && 'Finish & Analyze'}
                            {language === 'hindi' && 'समाप्त करें'}
                            {language === 'bengali' && 'শেষ করুন'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ready indicator */}
                  {readyToAnalyze && (
                    <motion.div
                      className="ready-indicator"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      ✅ Ready to analyze! Click "Finish & Analyze" above.
                    </motion.div>
                  )}

                  {/* Message Count */}
                  <div className="message-count" data-testid="message-count">
                    {messages.length} messages
                  </div>
                </div>
              </div>
            )}

            {step === 'summary' && analysis && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <CaseSummaryScreen onClose={handleClose} />
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceAssistantModal;
