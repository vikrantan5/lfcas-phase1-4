// Case Summary Screen Component
import React, { useState } from 'react';
import { CheckCircle, FileText, Scale, Clock, AlertTriangle, UserCheck, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '@/contexts/VoiceContext';
import '@/styles/case-summary.css';

const CaseSummaryScreen = ({ onClose }) => {
  const { analysis, caseDraft, recommendedAdvocates, confirmDraft } = useVoice();
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirmCase = async () => {
    if (!selectedAdvocate) {
      alert('Please select an advocate first');
      return;
    }

    try {
      setIsConfirming(true);
      await confirmDraft(caseDraft.id, selectedAdvocate);
      setConfirmed(true);
      
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error confirming case:', error);
      alert('Failed to create meeting request. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (confirmed) {
    return (
      <motion.div
        className="confirmation-success"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        data-testid="confirmation-success"
      >
        <CheckCircle size={64} className="success-icon" />
        <h2>Meeting Request Sent!</h2>
        <p>Your meeting request has been sent to the advocate.</p>
        <p className="success-note">You will be notified once the advocate responds.</p>
      </motion.div>
    );
  }

  return (
    <div className="case-summary-container" data-testid="case-summary-screen">
      {/* Case Overview */}
      <div className="summary-section">
        <div className="section-header">
          <FileText size={24} />
          <h3>Case Overview</h3>
        </div>
        <div className="section-content">
          <div className="summary-item">
            <label>Case Type:</label>
            <span className="case-type-badge">{caseDraft?.case_type?.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div className="summary-item">
            <label>Title:</label>
            <span>{caseDraft?.title}</span>
          </div>
          <div className="summary-item">
            <label>Location:</label>
            <span>{caseDraft?.location || 'Not specified'}</span>
          </div>
        </div>
      </div>

      {/* Legal Analysis */}
      {analysis && (
        <div className="summary-section">
          <div className="section-header">
            <Scale size={24} />
            <h3>Legal Analysis</h3>
          </div>
          <div className="section-content">
            {analysis.legal_sections && analysis.legal_sections.length > 0 && (
              <div className="summary-item-list">
                <label>Relevant Legal Sections:</label>
                <ul>
                  {analysis.legal_sections.map((section, index) => (
                    <li key={index}>{section}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.required_documents && analysis.required_documents.length > 0 && (
              <div className="summary-item-list">
                <label>Required Documents:</label>
                <ul>
                  {analysis.required_documents.map((doc, index) => (
                    <li key={index}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.procedural_guidance && (
              <div className="summary-item">
                <label>Procedural Guidance:</label>
                <p className="guidance-text">{analysis.procedural_guidance}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {analysis?.estimated_timeline && (
        <div className="summary-section">
          <div className="section-header">
            <Clock size={24} />
            <h3>Estimated Timeline</h3>
          </div>
          <div className="section-content">
            <p>{analysis.estimated_timeline}</p>
          </div>
        </div>
      )}

      {/* Important Notes */}
      {analysis?.important_notes && analysis.important_notes.length > 0 && (
        <div className="summary-section warning">
          <div className="section-header">
            <AlertTriangle size={24} />
            <h3>Important Notes</h3>
          </div>
          <div className="section-content">
            <ul>
              {analysis.important_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommended Advocates */}
      {recommendedAdvocates && recommendedAdvocates.length > 0 && (
        <div className="summary-section">
          <div className="section-header">
            <UserCheck size={24} />
            <h3>Recommended Advocates</h3>
          </div>
          <div className="advocates-grid">
            {recommendedAdvocates.map((advocate) => (
              <motion.div
                key={advocate.id}
                className={`advocate-card ${selectedAdvocate === advocate.id ? 'selected' : ''}`}
                onClick={() => setSelectedAdvocate(advocate.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`advocate-${advocate.id}`}
              >
                <div className="advocate-info">
                  <h4>{advocate.users?.full_name || 'Advocate'}</h4>
                  <p className="advocate-specialization">
                    {advocate.specialization?.join(', ') || 'General Practice'}
                  </p>
                  <div className="advocate-details">
                    <span>📍 {advocate.location}</span>
                    <span>⭐ {advocate.rating?.toFixed(1) || '0.0'}</span>
                    <span>📊 {advocate.experience_years} years</span>
                  </div>
                </div>
                {selectedAdvocate === advocate.id && (
                  <div className="selection-indicator">
                    <CheckCircle size={20} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="summary-actions">
        <button
          onClick={onClose}
          className="action-button secondary"
          data-testid="cancel-button"
        >
          <X size={20} />
          Cancel
        </button>
        <button
          onClick={handleConfirmCase}
          className="action-button primary"
          disabled={!selectedAdvocate || isConfirming}
          data-testid="confirm-case-button"
        >
          {isConfirming ? (
            <span>Creating Request...</span>
          ) : (
            <>
              <CheckCircle size={20} />
              <span>Confirm & Request Meeting</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CaseSummaryScreen;