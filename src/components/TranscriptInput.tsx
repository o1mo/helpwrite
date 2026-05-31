import React, { useState } from 'react'
import { useRecall } from '../context/RecallContext'

export function TranscriptInput() {
  const [meetingUrl, setMeetingUrl] = useState('')
  const { createBot, isConnected, error, isLoading } = useRecall()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createBot(meetingUrl)
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="Enter meeting URL"
          style={{ width: '300px' }}
          disabled={isConnected || isLoading}
        />
        <button type="submit" disabled={isConnected || isLoading}>
          {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Connect'}
        </button>
      </form>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  )
} 