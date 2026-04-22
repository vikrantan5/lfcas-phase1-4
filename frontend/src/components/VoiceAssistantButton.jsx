// Floating Voice Assistant Button with Animation
import React from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '@/contexts/VoiceContext';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/voice-button.css';

const VoiceAssistantButton = () => {
  const { setIsOpen, isOpen } = useVoice();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Hide button when:
  // 1. Not authenticated
  // 2. User is not a client (only show for clients, not advocates or admins)
  // 3. On login/register pages
  // 4. When modal already open
  const shouldHideButton = !isAuthenticated ||
    (user && user.role !== 'client') ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    isOpen;

  if (shouldHideButton) {
    return null;
  }
  return (
<>
<Bot className="voice-button-icon" size={28} />
    {/* <motion.button
      data-testid="voice-assistant-button"
      onClick={() => setIsOpen(true)}
      className="voice-assistant-button"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, d amping: 20 }}
      aria-label="Open AI Legal Assistant"
    >
      <motion.div
        className="voice-button-icon-container"
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(139, 92, 246, 0.7)',
            '0 0 0 20px rgba(139, 92, 246, 0)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      >
        
      </motion.div>
      <span className="voice-button-text">Chat with AI</span>
    </motion.button> */}

</>
  );
};

export default VoiceAssistantButton;

