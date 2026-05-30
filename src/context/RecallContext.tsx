import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ProcessedTranscriptEntry } from '../types'

interface RecallContextType {
  botId: string | null;
  botStatus: string | null;
  botStatusMessage: string | null;
  isConnected: boolean;
  transcript: ProcessedTranscriptEntry[];
  error: string | null;
  isLoading: boolean;
  createBot: (meetingUrl: string) => Promise<void>;
}

const RecallContext = createContext<RecallContextType | null>(null)

function formatRecallError(data: Record<string, unknown>): string {
  const parts: string[] = []

  for (const [field, value] of Object.entries(data)) {
    if (field === 'id') continue
    if (Array.isArray(value)) {
      parts.push(`${field}: ${value.join(' ')}`)
    } else if (typeof value === 'string') {
      parts.push(value)
    }
  }

  return parts.join(' ') || 'Failed to create bot'
}

export function RecallProvider({ children }: { children: React.ReactNode }) {
  const [botId, setBotId] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState<string | null>(null)
  const [botStatusMessage, setBotStatusMessage] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transcript, setTranscript] = useState<ProcessedTranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const createBot = async (meetingUrl: string) => {
    const trimmedUrl = meetingUrl.trim()
    if (!trimmedUrl) {
      setError('Please enter a meeting URL')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setTranscript([])

      const response = await fetch('http://localhost:8000/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_url: trimmedUrl })
      })

      const data = await response.json()

      if (!response.ok || !data.id) {
        throw new Error(formatRecallError(data))
      }

      console.log('Bot created:', data.id)
      setBotId(data.id)
      setBotStatus('ready')
      setBotStatusMessage(null)
      setIsConnected(true)
    } catch (err) {
      setBotId(null)
      setIsConnected(false)
      setError(err instanceof Error ? err.message : 'Failed to create bot')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!botId) return

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/bot/${botId}/transcript`)
        const data = await response.json()

        if (!response.ok) {
          console.error('Transcript poll error:', data)
          return
        }

        if (data.status) {
          setBotStatus(data.status)
        }
        if (data.status_message !== undefined) {
          setBotStatusMessage(data.status_message)
        }

        const entries = Array.isArray(data.entries) ? data.entries : []
        if (entries.length === 0) return

        setTranscript(prev => {
          const uniqueMessages = entries.filter((newMsg: ProcessedTranscriptEntry) =>
            !prev.some(existingMsg =>
              existingMsg.text === newMsg.text &&
              existingMsg.speaker === newMsg.speaker
            )
          )
          return [...prev, ...uniqueMessages].sort((a, b) => a.timestamp - b.timestamp)
        })
      } catch (err) {
        console.error('Transcript error:', err)
      }
    }, 2000)

    return () => clearInterval(intervalId)
  }, [botId])

  return (
    <RecallContext.Provider value={{
      botId,
      botStatus,
      botStatusMessage,
      isConnected,
      transcript,
      error,
      isLoading,
      createBot
    }}>
      {children}
    </RecallContext.Provider>
  )
}

export function useRecall() {
  const context = useContext(RecallContext)
  if (!context) {
    throw new Error('useRecall must be used within a RecallProvider')
  }
  return context
}
