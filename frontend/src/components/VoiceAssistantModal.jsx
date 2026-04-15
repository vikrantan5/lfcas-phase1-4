// Voice Assistant Modal - Main Conversation Interface with Vapi
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
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
    analysis,
    isProcessing,
    vapiCallActive,
    isSpeaking,
    startSession,
    processConversation,
    stopVapiCall,
    reset
  } = useVoice();

  const [step, setStep] = useState('language'); // 'language', 'conversation', 'summary'
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
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

  const handleClose = async () => {
    try {
      await stopVapiCall();
    } catch (err) {
      console.error('Error stopping call:', err);
    }
    
    setIsOpen(false);
    reset();
    setStep('language');
    setError(null);
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
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="voice-modal-header">
            <h2 className="voice-modal-title">
              {step === 'language' && '🌐 Select Language'}
              {step === 'conversation' && '🤖 AI Legal Assistant'}
              {step === 'summary' && '📋 Case Summary'}
            </h2>
            <button onClick={handleClose} className="voice-modal-close" data-testid="close-modal-button">
              <X size={24} />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="error-alert" data-testid="error-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          <div className="voice-modal-content">
            {step === 'language' && (
              <LanguageSelector onSelect={handleLanguageSelect} />
            )}

            {step === 'conversation' && (
              <div className="conversation-container">
                {/* Status Bar */}
                <div className="status-bar" data-testid="status-bar">
                  {vapiCallActive && (
                    <div className="status-indicator active">
                      <span className="status-dot"></span>
                      <span>Voice call active</span>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className="status-indicator speaking">
                      <Mic size={16} />
                      <span>Listening...</span>
                    </div>
                  )}
                  {!vapiCallActive && (
                    <div className="status-indicator inactive">
                      <span className="status-dot inactive"></span>
                      <span>Call not connected</span>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="messages-container" data-testid="messages-container">
                  {messages.length === 0 && vapiCallActive && (
                    <div className="empty-state">
                      <Mic size={48} className="empty-icon" />
                      <p>Start speaking to share your legal problem...</p>
                      <p className="text-sm text-gray-500">The AI assistant is listening</p>
                    </div>
                  )}
                  
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`}
                      data-testid={`message-${msg.sender}-${index}`}
                    >
                      <div className="message-bubble">
                        {msg.message}
                      </div>
                      <div className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Voice Wave Animation */}
                {isSpeaking && <VoiceWaveAnimation />}

                {/* Instructions */}
                <div className="instructions" data-testid="instructions">
                  <p className="text-sm text-gray-600">
                    {language === 'english' && '💡 Speak naturally about your legal problem. The AI will ask follow-up questions.'}
                    {language === 'hindi' && '💡 अपनी कानूनी समस्या के बारे में स्वाभाविक रूप से बोलें। AI आपसे अतिरिक्त प्रश्न पूछेगा।'}
                    {language === 'bengali' && '💡 আপনার আইনি সমস্যা সম্পর্কে স্বাভাবিকভাবে কথা বলুন। AI অতিরিক্ত প্রশ্ন জিজ্ঞাসা করবে।'}
                  </p>
                </div>

                {/* Controls */}
                <div className="conversation-controls">
                  <button
                    onClick={handleFinishConversation}
                    className="finish-button"
                    disabled={isProcessing || !vapiCallActive && messages.length < 2}
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
                          {language === 'hindi' && 'समाप्त करें और विश्लेषण करें'}
                          {language === 'bengali' && 'শেষ করুন এবং বিশ্লেষণ করুন'}
                        </span>
                      </>
                    )}
                  </button>
                  
                  {vapiCallActive && (
                    <button
                      onClick={stopVapiCall}
                      className="stop-call-button"
                      data-testid="stop-call-button"
                    >
                      <MicOff size={20} />
                      <span>End Call</span>
                    </button>
                  )}
                </div>

                {/* Message Count */}
                <div className="message-count" data-testid="message-count">
                  {messages.length} messages
                </div>
              </div>
            )}

            {step === 'summary' && analysis && (
              <CaseSummaryScreen onClose={handleClose} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceAssistantModal;
