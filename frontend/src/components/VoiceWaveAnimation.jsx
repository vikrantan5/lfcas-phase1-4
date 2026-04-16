// Enhanced Voice Wave Animation Component
import React from 'react';
import { motion } from 'framer-motion';
import '@/styles/voice-wave.css';

const VoiceWaveAnimation = ({ isUserSpeaking = true }) => {
  const bars = Array.from({ length: 7 });

  // Different animation patterns for user vs AI
  const userAnimation = {
    scaleY: [1, 2.5, 1.2, 2, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    }
  };

  const aiAnimation = {
    scaleY: [1, 1.8, 1.3, 1.5, 1],
    transition: {
      duration: 0.7,
      repeat: Infinity,
      ease: 'easeInOut',
    }
  };

  return (
    <div 
      className={`voice-wave-container ${isUserSpeaking ? 'user-wave' : 'ai-wave'}`} 
      data-testid="voice-wave-animation"
    >
      <div className="wave-label">
        {isUserSpeaking ? '🎤 You' : '🤖 AI'}
      </div>
      <div className="wave-bars">
        {bars.map((_, index) => (
          <motion.div
            key={index}
            className={`voice-wave-bar ${isUserSpeaking ? 'user-bar' : 'ai-bar'}`}
            animate={isUserSpeaking ? {
              scaleY: [1, 2.5, 1.2, 2, 1],
            } : {
              scaleY: [1, 1.8, 1.3, 1.5, 1],
            }}
            transition={{
              duration: isUserSpeaking ? 0.5 : 0.7,
              repeat: Infinity,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default VoiceWaveAnimation;
