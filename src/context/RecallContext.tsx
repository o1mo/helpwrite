import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ProcessedTranscriptEntry } from '../types'

const API_BASE = 'http://localhost:8000'

interface RecallContextType {
  botId: string | null;
  botStatus: string | null;
  botStatusMessage: string | null;
  isConnected: boolean;
  liveTranscriptEnabled: boolean;
  liveTranscriptWarning: string | null;
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

function appendEntry(
  prev: ProcessedTranscriptEntry[],
  entry: ProcessedTranscriptEntry,
): ProcessedTranscriptEntry[] {
  if (prev.some((e) => e.id === entry.id)) return prev
  return [...prev, entry].sort((a, b) => a.timestamp - b.timestamp)
}

export function RecallProvider({ children }: { children: React.ReactNode }) {
  const [botId, setBotId] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState<string | null>(null)
  const [botStatusMessage, setBotStatusMessage] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveTranscriptEnabled, setLiveTranscriptEnabled] = useState(false)
  const [liveTranscriptWarning, setLiveTranscriptWarning] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<ProcessedTranscriptEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

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
      setLiveTranscriptWarning(null)

      const response = await fetch(`${API_BASE}/api/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_url: trimmedUrl })
      })

      const data = await response.json()

      if (!response.ok || !data.id) {
        throw new Error(formatRecallError(data))
      }

      const liveEnabled = data.live_transcript_enabled === true
      setLiveTranscriptEnabled(liveEnabled)
      if (!liveEnabled) {
        setLiveTranscriptWarning(
          'Live captions need RECALL_PUBLIC_URL in .env (your ngrok URL, no trailing slash). Transcript will only appear after the call ends until this is set.'
        )
      }

      setBotId(data.id)
      setBotStatus('ready')
      setBotStatusMessage(null)
      setIsConnected(true)
    } catch (err) {
      setBotId(null)
      setIsConnected(false)
      setLiveTranscriptEnabled(false)
      setError(err instanceof Error ? err.message : 'Failed to create bot')
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time transcript via Server-Sent Events
  useEffect(() => {
    if (!botId) return

    const es = new EventSource(`${API_BASE}/api/bot/${botId}/transcript/stream`)
    eventSourceRef.current = es

    const onEntry = (event: MessageEvent) => {
      try {
        const entry = JSON.parse(event.data) as ProcessedTranscriptEntry
        setTranscript((prev) => appendEntry(prev, entry))
      } catch (err) {
        console.error('Failed to parse transcript SSE:', err)
      }
    }

    es.addEventListener('entry', onEntry)
    es.onerror = () => {
      console.warn('Transcript stream disconnected, polling will backfill')
    }

    return () => {
      es.removeEventListener('entry', onEntry)
      es.close()
      eventSourceRef.current = null
    }
  }, [botId])

  // Bot status + fallback transcript poll (post-call download + reconnect)
  useEffect(() => {
    if (!botId) return

    const poll = async () => {
      try {
        const [statusRes, transcriptRes] = await Promise.all([
          fetch(`${API_BASE}/api/bot/${botId}`),
          fetch(`${API_BASE}/api/bot/${botId}/transcript`),
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.status) setBotStatus(statusData.status)
          if (statusData.status_message !== undefined) {
            setBotStatusMessage(statusData.status_message)
          }
          if (statusData.live_transcript_enabled !== undefined) {
            setLiveTranscriptEnabled(statusData.live_transcript_enabled)
          }
        }

        if (!transcriptRes.ok) return

        const data = await transcriptRes.json()
        const entries = Array.isArray(data.entries) ? data.entries : []
        if (entries.length === 0) return

        setTranscript((prev) => {
          let next = prev
          for (const entry of entries as ProcessedTranscriptEntry[]) {
            next = appendEntry(next, entry)
          }
          return next
        })
      } catch (err) {
        console.error('Transcript poll error:', err)
      }
    }

    poll()
    const intervalId = setInterval(poll, 3000)
    return () => clearInterval(intervalId)
  }, [botId])

  return (
    <RecallContext.Provider value={{
      botId,
      botStatus,
      botStatusMessage,
      isConnected,
      liveTranscriptEnabled,
      liveTranscriptWarning,
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
