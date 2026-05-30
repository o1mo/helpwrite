import React from 'react'

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
}

export function PromptModal({ prompt, onClose }: PromptModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal prompt-modal">
        <div className="modal-header">
          <h2>AI Prompt Preview</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <textarea 
            readOnly 
            value={prompt}
            className="prompt-preview"
          />
        </div>
      </div>
    </div>
  )
} 