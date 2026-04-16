// Voice Assistant Context with Web Speech API (STT + TTS)
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VoiceContext = createContext();

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

export const VoiceProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [language, setLanguage] = useState('english');
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [caseDraft, setCaseDraft] = useState(null);
  const [recommendedAdvocates, setRecommendedAdvocates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [error, setError] = useState(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [readyToAnalyze, setReadyToAnalyze] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const speechQueueRef = useRef([]);
  const isListeningRef = useRef(false);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (!SpeechRecognition || !speechSynthesis) {
      setBrowserSupported(false);
      console.warn('Web Speech API not supported in this browser');
    } else {
      console.log('✅ Web Speech API supported');
    }
  }, []);

  // Initialize Speech Recognition
  const initSpeechRecognition = useCallback((selectedLanguage) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Your browser does not support speech recognition. Please use Chrome or Edge.');
      return null;
    }

    const recognition = new SpeechRecognition();
    
    // Language mapping
    const langMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN',
      'bengali': 'bn-IN'
    };
    
    recognition.lang = langMap[selectedLanguage] || 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsRecording(true);
      setIsSpeaking(false);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
        setIsSpeaking(true);
      }

      if (finalTranscript) {
        console.log('📝 Final transcript:', finalTranscript);
        setIsSpeaking(false);
        handleUserSpeech(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing...');
        return;
      }
      
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setIsRecording(false);
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      // Auto-restart if still in recording mode
      if (isListeningRef.current && session) {
        console.log('🔄 Restarting speech recognition...');
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      } else {
        setIsRecording(false);
      }
    };

    return recognition;
  }, [session]);

  // Handle user speech - save and get AI response
  const handleUserSpeech = async (transcript) => {
    if (!session || !transcript) return;

    try {
      // Add user message to UI immediately
      const userMsg = {
        sender: 'user',
        message: transcript,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setCurrentTranscript('');
      setFullTranscript(prev => (prev + ' ' + transcript).trim());

      // Save user message to backend
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/voice/save-message`,
        {
          session_id: session.id,
          sender: 'user',
          message: transcript,
          message_type: 'text'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Get AI's next question
      const response = await axios.post(
        `${API}/voice/get-next-question`,
        {
          session_id: session.id,
          user_message: transcript,
          language
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const aiResponse = response.data.next_question;
        const ready = response.data.ready_to_analyze;
        
        setReadyToAnalyze(ready);

        // Add AI message to UI
        const aiMsg = {
          sender: 'ai',
          message: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);

        // Save AI message to backend
        await axios.post(
          `${API}/voice/save-message`,
          {
            session_id: session.id,
            sender: 'ai',
            message: aiResponse,
            message_type: 'text'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Speak the AI response
        speakText(aiResponse, language);
      }
    } catch (error) {
      console.error('Error handling user speech:', error);
      setError('Failed to process your message. Please try again.');
    }
  };

  // Text-to-Speech function
  const speakText = useCallback((text, lang) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Language mapping for voices
    const voiceLangMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN',
      'bengali': 'bn-IN'
    };
    utterance.lang = voiceLangMap[lang] || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Get available voices and select the best one
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.startsWith(utterance.lang.split('-')[0]));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      console.log('🔊 AI speaking...');
      setIsAISpeaking(true);
    };

    utterance.onend = () => {
      console.log('🔇 AI finished speaking');
      setIsAISpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsAISpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Start voice session
  const startSession = useCallback(async (selectedLanguage) => {
    try {
      console.log('🚀 Starting voice session with language:', selectedLanguage);
      const token = localStorage.getItem('token');
      
      if (!browserSupported) {
        setError('Your browser does not support Web Speech API. Please use Chrome or Edge, or use the \"Type instead\" option.');
        return null;
      }

      // Create session in backend
      const response = await axios.post(
        `${API}/voice/start-session`,
        { language: selectedLanguage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const sessionData = response.data;
      console.log('✅ Session created:', sessionData);
      
      setSession(sessionData);
      setLanguage(selectedLanguage);
      setFullTranscript('');
      setMessages([]);
      setReadyToAnalyze(false);
      
      // Get initial greeting message from backend
      const messagesResponse = await axios.get(
        `${API}/voice/session/${sessionData.id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (messagesResponse.data && messagesResponse.data.length > 0) {
        const greetingMsg = messagesResponse.data[0];
        setMessages([{
          sender: 'ai',
          message: greetingMsg.message,
          timestamp: new Date(greetingMsg.created_at)
        }]);
        
        // Speak greeting
        speakText(greetingMsg.message, selectedLanguage);
      }
      
      // Initialize and start speech recognition
      const recognition = initSpeechRecognition(selectedLanguage);
      if (recognition) {
        recognitionRef.current = recognition;
        isListeningRef.current = true;
        recognition.start();
      }
      
      return sessionData;
    } catch (error) {
      console.error('❌ Error starting session:', error);
      setError(error.response?.data?.detail || 'Failed to start voice session');
      throw error;
    }
  }, [browserSupported, initSpeechRecognition, speakText]);

  // Stop speech recognition
  const stopRecording = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsSpeaking(false);
    console.log('⏹️ Recording stopped');
  }, []);

  // Resume speech recognition
  const startRecording = useCallback(() => {
    if (recognitionRef.current && session) {
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        console.log('▶️ Recording resumed');
      } catch (e) {
        console.log('Already recording');
      }
    }
  }, [session]);

  // Stop TTS
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsAISpeaking(false);
    }
  }, []);

  // Process conversation (final analysis)
  const processConversation = useCallback(async (conversationTranscript) => {
    if (!session) {
      throw new Error('No active session');
    }
    
    try {
      setIsProcessing(true);
      console.log('🔄 Processing conversation...');
      
      // Stop recording
      stopRecording();
      stopSpeaking();
      
      const token = localStorage.getItem('token');
      const transcript = conversationTranscript || fullTranscript;
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No conversation to process. Please speak about your problem first.');
      }
      
      console.log('📝 Transcript to process:', transcript);
      
      const response = await axios.post(
        `${API}/voice/process-conversation`,
        {
          session_id: session.id,
          transcript: transcript,
          language
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Conversation processed:', response.data);
      
      setAnalysis(response.data.analysis);
      setCaseDraft(response.data.case_draft);
      setRecommendedAdvocates(response.data.recommended_advocates || []);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [session, language, fullTranscript, stopRecording, stopSpeaking]);

  // Confirm draft
  const confirmDraft = useCallback(async (draftId, advocateId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/voice/confirm-draft/${draftId}`,
        {
          draft_id: draftId,
          selected_advocate_id: advocateId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error confirming draft:', error);
      throw error;
    }
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    console.log('🔄 Resetting voice context');
    stopRecording();
    stopSpeaking();
    setSession(null);
    setMessages([]);
    setFullTranscript('');
    setCurrentTranscript('');
    setAnalysis(null);
    setCaseDraft(null);
    setRecommendedAdvocates([]);
    setIsRecording(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsAISpeaking(false);
    setError(null);
    setReadyToAnalyze(false);
  }, [stopRecording, stopSpeaking]);

  // Manual text input (fallback)
  const sendTextMessage = useCallback(async (text) => {
    if (!session || !text) return;
    
    return handleUserSpeech(text);
  }, [session]);

  const value = {
    isOpen,
    setIsOpen,
    session,
    messages,
    language,
    setLanguage,
    isRecording,
    isSpeaking,
    isAISpeaking,
    currentTranscript,
    analysis,
    caseDraft,
    recommendedAdvocates,
    isProcessing,
    fullTranscript,
    error,
    setError,
    browserSupported,
    readyToAnalyze,
    startSession,
    stopRecording,
    startRecording,
    stopSpeaking,
    processConversation,
    confirmDraft,
    reset,
    sendTextMessage
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};
