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
    // Sync refs to prevent AI TTS being captured as user input
  const isAISpeakingRef = useRef(false);
  const userManuallyStoppedRef = useRef(false);

    // Silence-detection buffer: accumulate speech and flush after 2s of silence
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef('');
  const SILENCE_MS = 2000;

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
    
    // Language mapping (Bengali removed; only English & Hindi supported)
    const langMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN'
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
      // IGNORE any speech captured while AI is speaking (prevents TTS echo loop)
      if (isAISpeakingRef.current) {
        console.log('🚫 Ignoring mic input — AI is currently speaking');
        return;
      }

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

      // Show user speaking indicator + live interim preview
      if (interimTranscript || finalTranscript) {
        setIsSpeaking(true);
        setCurrentTranscript(
          (transcriptBufferRef.current + ' ' + (finalTranscript || interimTranscript)).trim()
        );
      }

      // When browser marks a chunk as final, append to buffer
      if (finalTranscript) {
        transcriptBufferRef.current = (
          transcriptBufferRef.current + ' ' + finalTranscript
        ).trim();
        console.log('📝 Buffered (final chunk):', transcriptBufferRef.current);
      }

      // Reset silence timer on every result — flush only after SILENCE_MS of quiet
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        // Prefer the finalized buffer; fall back to current interim if nothing was finalized
        const finalText = (transcriptBufferRef.current || interimTranscript || '').trim();
        if (!finalText) return;

        console.log('⏱️ 2s silence detected — flushing transcript to AI:', finalText);
        transcriptBufferRef.current = '';
        setCurrentTranscript('');
        setIsSpeaking(false);
        handleUserSpeech(finalText);
      }, SILENCE_MS);
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


           // SAFETY NET: if recognition ends with buffered user speech that hasn't
      // been sent yet, flush it now so the AI doesn't get stuck silent.
      const pending = transcriptBufferRef.current.trim();
      if (pending && !isAISpeakingRef.current) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        transcriptBufferRef.current = '';
        setCurrentTranscript('');
        setIsSpeaking(false);
        console.log('⚡ Flushing buffered transcript on recognition end:', pending);
        handleUserSpeech(pending);
      }
      // Do NOT auto-restart while AI is speaking — prevents TTS feedback loop
      if (isAISpeakingRef.current) {
        console.log('⏸️ Recognition ended while AI speaking — will restart after AI finishes');
        setIsRecording(false);
        return;
      }
      // Auto-restart if still in recording mode and user hasn't manually stopped
      if (isListeningRef.current && session && !userManuallyStoppedRef.current) {
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


       // Guard: ignore input captured while AI is speaking (TTS echo protection)
    if (isAISpeakingRef.current) {
      console.log('🚫 Dropping transcript — received while AI was speaking:', transcript);
      return;
    }
    // Guard: ignore trivially short transcripts (often noise or partial TTS bleed)
    if (transcript.trim().length < 2) {
      return;
    }

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
      
      console.log('💾 Saving user message...');
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
      console.log('✅ User message saved');

      // Get AI's next question
      console.log('🤖 Fetching AI response...');
      const response = await axios.post(
        `${API}/voice/get-next-question`,
        {
          session_id: session.id,
          user_message: transcript,
          language
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ AI response received:', response.data);

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
        console.log('💾 Saving AI response...');
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
        console.log('✅ AI response saved');

        // Speak AI response
        speakText(aiResponse, language);
      } else {
        throw new Error('AI response failed');
      }
    } catch (err) {
      console.error('❌ Error in handleUserSpeech:', err);
      setError(`Failed to get AI response: ${err.response?.data?.detail || err.message || 'Unknown error'}. Please try again or use text input.`);
      
      // Add error message to UI
      const errorMsg = {
        sender: 'ai',
        message: 'Sorry, I encountered an error. Please try again or rephrase your question.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
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

    // CRITICAL: Mark AI as speaking BEFORE starting TTS and stop the mic
    // so that speech recognition does not capture the AI's own voice.
    isAISpeakingRef.current = true;
    setIsAISpeaking(true);

       // Clear any pending silence-flush timer so we don't send stale input
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    transcriptBufferRef.current = '';
    try {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.log('Stop recognition before TTS failed:', e);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Language mapping for voices (Bengali removed)
    const voiceLangMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN'
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
      isAISpeakingRef.current = true;
      setIsAISpeaking(true);
    };

    const handleEnd = () => {
      console.log('🔇 AI finished speaking');
      isAISpeakingRef.current = false;
      setIsAISpeaking(false);
      // Small delay so TTS tail-off doesn't leak into mic, then resume listening
      setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current && !userManuallyStoppedRef.current) {
          try {
            recognitionRef.current.start();
            console.log('▶️ Recognition resumed after AI speech');
          } catch (e) {
            console.log('Recognition already running or failed to resume:', e?.message);
          }
        }
      }, 300);
    };

    utterance.onend = handleEnd;

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      handleEnd();
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
        userManuallyStoppedRef.current = false;
        // NOTE: recognition will auto-start AFTER the greeting TTS finishes
        // (speakText's onend handler restarts recognition). Do NOT start here
        // otherwise it will capture the AI greeting as user input.
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
    userManuallyStoppedRef.current = true;

     if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    transcriptBufferRef.current = '';
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsRecording(false);
    setIsSpeaking(false);
    console.log('⏹️ Recording stopped');
  }, []);

  // Resume speech recognition
  const startRecording = useCallback(() => {
    if (recognitionRef.current && session) {
      isListeningRef.current = true;
      userManuallyStoppedRef.current = false;
      // Don't try to start while AI is speaking — will resume on AI speech end
      if (isAISpeakingRef.current) {
        console.log('⏳ AI is speaking, recognition will start after it finishes');
        return;
      }
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
      isAISpeakingRef.current = false;
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
      
      console.log('✅ Conversation processed successfully');
      console.log('📊 Analysis data:', response.data.analysis);
      console.log('📄 Case draft:', response.data.case_draft);
      console.log('👥 Advocates:', response.data.recommended_advocates);
      
      // Set the analysis data directly from response
      setAnalysis(response.data.analysis);
      setCaseDraft(response.data.case_draft);
      setRecommendedAdvocates(response.data.recommended_advocates || []);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      console.error('Error details:', error.response?.data);
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
