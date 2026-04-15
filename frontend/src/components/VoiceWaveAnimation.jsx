// Voice Wave Animation Component
import React from 'react';
import { motion } from 'framer-motion';
import '@/styles/voice-wave.css';

const VoiceWaveAnimation = () => {
  const bars = Array.from({ length: 5 });

  return (
    <div className="voice-wave-container" data-testid="voice-wave-animation">
      {bars.map((_, index) => (
        <motion.div
          key={index}
          className="voice-wave-bar"
          animate={{
            scaleY: [1, 2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default VoiceWaveAnimation;