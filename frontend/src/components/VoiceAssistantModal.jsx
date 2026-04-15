// Voice Assistant Modal - Main Conversation Interface
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Send, Loader, CheckCircle } from 'lucide-react';
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
    setLanguage,
    isRecording,
    setIsRecording,
    transcript,
    setTranscript,
    analysis,
    isProcessing,
    startSession,
    saveMessage,
    processConversation,
    reset
  } = useVoice();

  const [step, setStep] = useState('language'); // 'language', 'conversation', 'summary'
  const [userInput, setUserInput] = useState('');
  const [fullConversation, setFullConversation] = useState('');
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API for voice recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      if (language === 'hindi') {
        recognitionRef.current.lang = 'hi-IN';
      } else if (language === 'bengali') {
        recognitionRef.current.lang = 'bn-IN';
      } else {
        recognitionRef.current.lang = 'en-US';
      }

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          setFullConversation(prev => prev + ' ' + finalTranscript);
          saveMessage('user', finalTranscript.trim());
          
          // Simulate AI response
          setTimeout(() => {
            const aiResponses = {
              english: [
                'I understand. Can you tell me more about the location and timeline?',
                'Thank you for sharing. Do you have any relevant documents?',
                'I see. How urgent is your situation?',
              ],
              hindi: [
                'मैं समझ गया। क्या आप स्थान और समय-सीमा के बारे में अधिक बता सकते हैं?',
                'साझा करने के लिए धन्यवाद। क्या आपके पास कोई प्रासंगिक दस्तावेज हैं?',
                'मैं देख रहा हूं। आपकी स्थिति कितनी जरूरी है?',
              ],
              bengali: [
                'আমি বুঝতে পারছি। আপনি কি অবস্থান এবং সময়রেখা সম্পর্কে আরও বলতে পারেন?',
                'শেয়ার করার জন্য ধন্যবাদ। আপনার কি কোন প্রাসঙ্গিক নথি আছে?',
                'আমি দেখছি। আপনার পরিস্থিতি কতটা জরুরি?',
              ]
            };
            
            const responses = aiResponses[language] || aiResponses['english'];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            saveMessage('ai', randomResponse);
          }, 1000);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, saveMessage, setIsRecording, setTranscript]);

  const handleLanguageSelect = async (selectedLanguage) => {
    setLanguage(selectedLanguage);
    await startSession(selectedLanguage);
    setStep('conversation');
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      setFullConversation(prev => prev + ' ' + userInput);
      saveMessage('user', userInput.trim());
      setUserInput('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponses = {
          english: "Thank you for sharing. I'm analyzing your situation...",
          hindi: 'साझा करने के लिए धन्यवाद। मैं आपकी स्थिति का विश्लेषण कर रहा हूं...',
          bengali: 'শেয়ার করার জন্য ধন্যবাদ। আমি আপনার পরিস্থিতি বিশ্লেষণ করছি...'
        };
        saveMessage('ai', aiResponses[language] || aiResponses['english']);
      }, 500);
    }
  };

  const handleFinishConversation = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    // Process the conversation
    try {
      await processConversation(fullConversation || transcript);
      setStep('summary');
    } catch (error) {
      console.error('Error processing conversation:', error);
      alert('Failed to process conversation. Please try again.');
    }
  };

  const handleClose = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsOpen(false);
    reset();
    setStep('language');
    setFullConversation('');
    setUserInput('');
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
              {step === 'language' && 'Select Language'}
              {step === 'conversation' && 'AI Legal Assistant'}
              {step === 'summary' && 'Case Summary'}
            </h2>
            <button onClick={handleClose} className="voice-modal-close">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="voice-modal-content">
            {step === 'language' && (
              <LanguageSelector onSelect={handleLanguageSelect} />
            )}

            {step === 'conversation' && (
              <div className="conversation-container">
                {/* Messages */}
                <div className="messages-container">
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
                {isRecording && <VoiceWaveAnimation />}

                {/* Live Transcript */}
                {transcript && (
                  <div className="live-transcript" data-testid="live-transcript">
                    <p className="transcript-label">Live Transcript:</p>
                    <p className="transcript-text">{transcript}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="conversation-controls">
                  <button
                    onClick={toggleRecording}
                    className={`voice-record-button ${isRecording ? 'recording' : ''}`}
                    data-testid="voice-record-button"
                  >
                    {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                    <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                  </button>

                  <form onSubmit={handleTextSubmit} className="text-input-form">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Or type your message..."
                      className="text-input"
                      data-testid="text-input"
                    />
                    <button type="submit" className="send-button" data-testid="send-button">
                      <Send size={20} />
                    </button>
                  </form>

                  <button
                    onClick={handleFinishConversation}
                    className="finish-button"
                    disabled={isProcessing || messages.length < 3}
                    data-testid="finish-conversation-button"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="spinner" size={20} />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        <span>Finish & Analyze</span>
                      </>
                    )}
                  </button>
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
