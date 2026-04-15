// Voice Assistant Context for Managing State with Vapi Integration
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import Vapi from '@vapi-ai/web';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const VAPI_PUBLIC_KEY = process.env.REACT_APP_VAPI_PUBLIC_KEY || '7cb3571b-a339-421c-96ab-c399521ad924'; // Your Vapi API key

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
  const [vapiCallActive, setVapiCallActive] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const vapiRef = useRef(null);

  // Initialize Vapi on mount
  useEffect(() => {
    console.log('Initializing Vapi with public key:', VAPI_PUBLIC_KEY);
    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
    
    // Set up Vapi event listeners
    vapiRef.current.on('call-start', () => {
      console.log('✅ Vapi call started');
      setVapiCallActive(true);
      setIsRecording(true);
    });

    vapiRef.current.on('call-end', () => {
      console.log('❌ Vapi call ended');
      setVapiCallActive(false);
      setIsRecording(false);
      setIsSpeaking(false);
    });

    vapiRef.current.on('speech-start', () => {
      console.log('🎤 User started speaking');
      setIsSpeaking(true);
    });

    vapiRef.current.on('speech-end', () => {
      console.log('🎤 User stopped speaking');
      setIsSpeaking(false);
    });

    vapiRef.current.on('message', (message) => {
      console.log('📨 Vapi message:', message);
      
      // Handle different message types
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const text = message.transcript;
        const sender = message.role === 'user' ? 'user' : 'ai';
        
        console.log(`💬 ${sender}: ${text}`);
        
        // Add message to chat
        setMessages(prev => [...prev, {
          sender,
          message: text,
          timestamp: new Date()
        }]);
        
        // Update full transcript with user messages
        if (sender === 'user') {
          setFullTranscript(prev => (prev + ' ' + text).trim());
        }
        
        // Save to backend
        if (session) {
          saveMessageToBackend(sender, text);
        }
      }
      
      // Handle function calls from Vapi
      if (message.type === 'function-call') {
        console.log('📞 Function call:', message.functionCall);
      }
    });

    vapiRef.current.on('error', (error) => {
      console.error('❌ Vapi error:', error);
      setVapiCallActive(false);
      setIsRecording(false);
    });

    vapiRef.current.on('volume-level', (volume) => {
      // You can use this for visual feedback
      // console.log('Volume level:', volume);
    });

    return () => {
      if (vapiRef.current && vapiCallActive) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const saveMessageToBackend = async (sender, message) => {
    if (!session) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/voice/save-message`,
        {
          session_id: session.id,
          sender,
          message,
          message_type: 'text'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Error saving message to backend:', error);
    }
  };

  const startSession = useCallback(async (selectedLanguage) => {
    try {
      console.log('🚀 Starting voice session with language:', selectedLanguage);
      const token = localStorage.getItem('token');
      
      // Call backend to create session and Vapi assistant
      const response = await axios.post(
        `${API}/voice/start-session`,
        { language: selectedLanguage },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const sessionData = response.data;
      console.log('✅ Session created:', sessionData);
      
      setSession(sessionData);
      setLanguage(selectedLanguage);
      setFullTranscript('');
      setMessages([]);
      
      // Start Vapi call with the assistant ID
      if (sessionData.vapi_assistant_id && vapiRef.current) {
        try {
          console.log('📞 Starting Vapi call with assistant:', sessionData.vapi_assistant_id);
          await vapiRef.current.start(sessionData.vapi_assistant_id);
          console.log('✅ Vapi call started successfully');
        } catch (vapiError) {
          console.error('❌ Error starting Vapi call:', vapiError);
          throw new Error(`Failed to start voice call: ${vapiError.message}`);
        }
      } else {
        throw new Error('No assistant ID received from backend');
      }
      
      return sessionData;
    } catch (error) {
      console.error('❌ Error starting session:', error);
      throw error;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (!vapiRef.current || !vapiCallActive) {
      console.warn('Cannot toggle recording: Vapi call not active');
      return;
    }
    
    try {
      // Toggle mute state
      vapiRef.current.setMuted(!isRecording);
      setIsRecording(!isRecording);
      console.log(isRecording ? '🔇 Muted' : '🔊 Unmuted');
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  }, [vapiCallActive, isRecording]);

  const stopVapiCall = useCallback(async () => {
    if (vapiRef.current && vapiCallActive) {
      try {
        console.log('⏹️ Stopping Vapi call');
        await vapiRef.current.stop();
        setVapiCallActive(false);
        setIsRecording(false);
        setIsSpeaking(false);
        console.log('✅ Vapi call stopped');
      } catch (error) {
        console.error('Error stopping Vapi call:', error);
      }
    }
  }, [vapiCallActive]);

  const processConversation = useCallback(async (conversationTranscript) => {
    if (!session) {
      throw new Error('No active session');
    }
    
    try {
      setIsProcessing(true);
      console.log('🔄 Processing conversation...');
      
      // Stop Vapi call first
      await stopVapiCall();
      
      const token = localStorage.getItem('token');
      const transcript = conversationTranscript || fullTranscript;
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No conversation to process. Please speak or type your problem first.');
      }
      
      console.log('📝 Transcript to process:', transcript);
      
      const response = await axios.post(
        `${API}/voice/process-conversation`,
        {
          session_id: session.id,
          transcript: transcript,
          language
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
  }, [session, language, fullTranscript, stopVapiCall]);

  const confirmDraft = useCallback(async (draftId, advocateId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/voice/confirm-draft/${draftId}`,
        {
          draft_id: draftId,
          selected_advocate_id: advocateId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error confirming draft:', error);
      throw error;
    }
  }, []);

  const reset = useCallback(async () => {
    console.log('🔄 Resetting voice context');
    await stopVapiCall();
    setSession(null);
    setMessages([]);
    setFullTranscript('');
    setAnalysis(null);
    setCaseDraft(null);
    setRecommendedAdvocates([]);
    setIsRecording(false);
    setIsProcessing(false);
    setVapiCallActive(false);
    setIsSpeaking(false);
  }, [stopVapiCall]);

  const value = {
    isOpen,
    setIsOpen,
    session,
    messages,
    language,
    setLanguage,
    isRecording,
    setIsRecording,
    analysis,
    caseDraft,
    recommendedAdvocates,
    isProcessing,
    vapiCallActive,
    isSpeaking,
    startSession,
    toggleRecording,
    stopVapiCall,
    processConversation,
    confirmDraft,
    reset,
    fullTranscript
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};
