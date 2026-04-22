// Language Selector Component
import React from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import '@/styles/language-selector.css';

const languages = [
  { code: 'english', name: 'English', flag: '🇬🇧', greeting: 'Hello' },
  { code: 'hindi', name: 'हिंदी (Hindi)', flag: '🇮🇳', greeting: 'नमस्ते' },
  // { code: 'bengali', name: 'বাংলা (Bengali)', flag: '🇧🇩', greeting: 'নমস্কার' },
];

const LanguageSelector = ({ onSelect }) => {
  return (
    <div className="language-selector-container" data-testid="language-selector">
      <div className="language-selector-icon">
        <Globe size={48} />
      </div>
      <h3 className="language-selector-title">Choose Your Preferred Language</h3>
      <p className="language-selector-subtitle">Select the language you're most comfortable with</p>
      
      <div className="language-options">
        {languages.map((lang, index) => (
          <motion.button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className="language-option"
            data-testid={`language-${lang.code}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="language-flag">{lang.flag}</span>
            <div className="language-info">
              <span className="language-name">{lang.name}</span>
              <span className="language-greeting">{lang.greeting}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;