// Floating Voice Assistant Button with Animation
import React from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '@/contexts/VoiceContext';
import '@/styles/voice-button.css';

const VoiceAssistantButton = () => {
  const { setIsOpen } = useVoice();

  return (
    <motion.button
      data-testid="voice-assistant-button"
      onClick={() => setIsOpen(true)}
      className="voice-assistant-button"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
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
        <Mic className="voice-button-icon" size={28} />
      </motion.div>
      <span className="voice-button-text">Tell Your Problem</span>
    </motion.button>
  );
};

export default VoiceAssistantButton;
