// Voice Assistant Context for Managing State
import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [caseDraft, setCaseDraft] = useState(null);
  const [recommendedAdvocates, setRecommendedAdvocates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

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
      setSession(response.data);
      setLanguage(selectedLanguage);
      setMessages([{
        sender: 'ai',
        message: selectedLanguage === 'english' 
          ? "Hello! I'm your AI legal assistant. Please tell me about your legal problem."
          : selectedLanguage === 'hindi'
          ? 'नमस्ते! मैं आपका AI कानूनी सहायक हूं। कृपया मुझे अपनी कानूनी समस्या के बारे में बताएं।'
          : 'নমস্কার! আমি আপনার AI আইনি সহায়ক। আপনার আইনি সমস্যা সম্পর্কে আমাকে বলুন।',
        timestamp: new Date()
      }]);
      return response.data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }, []);

  const saveMessage = useCallback(async (sender, message) => {
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
      
      setMessages(prev => [...prev, { sender, message, timestamp: new Date() }]);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [session]);

  const processConversation = useCallback(async (fullTranscript) => {
    if (!session) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/voice/process-conversation`,
        {
          session_id: session.id,
          transcript: fullTranscript,
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
  }, [session, language]);

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

  const reset = useCallback(() => {
    setSession(null);
    setMessages([]);
    setTranscript('');
    setAnalysis(null);
    setCaseDraft(null);
    setRecommendedAdvocates([]);
    setIsRecording(false);
    setIsProcessing(false);
  }, []);

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
    startSession,
    saveMessage,
    processConversation,
    confirmDraft,
    reset
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};
