// Voice Assistant Context for Managing State with Vapi Integration
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import Vapi from '@vapi-ai/web';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const VAPI_PUBLIC_KEY = '7cb3571b-a339-421c-96ab-c399521ad924'; // Your Vapi API key

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
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [caseDraft, setCaseDraft] = useState(null);
  const [recommendedAdvocates, setRecommendedAdvocates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vapiCallActive, setVapiCallActive] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  
  const vapiRef = useRef(null);

  // Initialize Vapi on mount
  useEffect(() => {
    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);
    
    // Set up Vapi event listeners
    vapiRef.current.on('call-start', () => {
      console.log('Vapi call started');
      setVapiCallActive(true);
      setIsRecording(true);
    });

    vapiRef.current.on('call-end', () => {
      console.log('Vapi call ended');
      setVapiCallActive(false);
      setIsRecording(false);
    });

    vapiRef.current.on('speech-start', () => {
      console.log('User started speaking');
    });

    vapiRef.current.on('speech-end', () => {
      console.log('User stopped speaking');
    });

    vapiRef.current.on('message', (message) => {
      console.log('Vapi message:', message);
      
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const text = message.transcript;
        const sender = message.role === 'user' ? 'user' : 'ai';
        
        // Add message to chat
        setMessages(prev => [...prev, {
          sender,
          message: text,
          timestamp: new Date()
        }]);
        
        // Update full transcript
        if (sender === 'user') {
          setFullTranscript(prev => prev + ' ' + text);
        }
        
        // Save to backend
        if (session) {
          saveMessageToBackend(sender, text);
        }
      }
    });

    vapiRef.current.on('error', (error) => {
      console.error('Vapi error:', error);
    });

    return () => {
      if (vapiRef.current) {
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
      const token = localStorage.getItem('token');
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
      setSession(sessionData);
      setLanguage(selectedLanguage);
      setFullTranscript('');
      
      // Start Vapi call with the assistant
      if (sessionData.vapi_assistant_id && vapiRef.current) {
        try {
          await vapiRef.current.start(sessionData.vapi_assistant_id);
          console.log('Vapi call started with assistant:', sessionData.vapi_assistant_id);
        } catch (vapiError) {
          console.error('Error starting Vapi call:', vapiError);
          // Fallback: show initial message
          setMessages([{
            sender: 'ai',
            message: selectedLanguage === 'english' 
              ? "Hello! I'm your AI legal assistant. Please tell me about your legal problem."
              : selectedLanguage === 'hindi'
              ? 'नमस्ते! मैं आपका AI कानूनी सहायक हूं। कृपया मुझे अपनी कानूनी समस्या के बारे में बताएं।'
              : 'নমস্কার! আমি আপনার AI আইনি সহায়ক। আপনার আইনি সমস্যা সম্পর্কে আমাকে বলুন।',
            timestamp: new Date()
          }]);
        }
      }
      
      return sessionData;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }, []);

  const saveMessage = useCallback(async (sender, message) => {
    // Messages are now handled by Vapi events
    // This function is kept for compatibility
    await saveMessageToBackend(sender, message);
  }, [session]);

  const toggleRecording = useCallback(() => {
    if (!vapiRef.current) return;
    
    if (vapiCallActive) {
      // Mute/unmute the call
      vapiRef.current.setMuted(!isRecording);
      setIsRecording(!isRecording);
    }
  }, [vapiCallActive, isRecording]);

  const stopVapiCall = useCallback(async () => {
    if (vapiRef.current && vapiCallActive) {
      await vapiRef.current.stop();
      setVapiCallActive(false);
      setIsRecording(false);
    }
  }, [vapiCallActive]);

  const processConversation = useCallback(async (conversationTranscript) => {
    if (!session) return;
    
    try {
      setIsProcessing(true);
      
      // Stop Vapi call first
      await stopVapiCall();
      
      const token = localStorage.getItem('token');
      const transcript = conversationTranscript || fullTranscript;
      
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
      
      setAnalysis(response.data.analysis);
      setCaseDraft(response.data.case_draft);
      setRecommendedAdvocates(response.data.recommended_advocates || []);
      
      return response.data;
    } catch (error) {
      console.error('Error processing conversation:', error);
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
    await stopVapiCall();
    setSession(null);
    setMessages([]);
    setTranscript('');
    setFullTranscript('');
    setAnalysis(null);
    setCaseDraft(null);
    setRecommendedAdvocates([]);
    setIsRecording(false);
    setIsProcessing(false);
    setVapiCallActive(false);
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
    transcript,
    setTranscript,
    analysis,
    caseDraft,
    recommendedAdvocates,
    isProcessing,
    vapiCallActive,
    startSession,
    saveMessage,
    toggleRecording,
    stopVapiCall,
    processConversation,
    confirmDraft,
    reset
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};