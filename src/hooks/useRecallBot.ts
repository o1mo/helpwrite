import { useState, useEffect } from 'react'
import { ProcessedTranscriptEntry } from '../types'

interface BotResponse {
  id: string;
}

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

export function useRecallBot() {
  const [botId, setBotId] = useState<string | null>(null)
  const [botStatus, setBotStatus] = useState<string | null>(null)
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

      const data: BotResponse & Record<string, unknown> = await response.json()

      if (!response.ok || !data.id) {
        throw new Error(formatRecallError(data))
      }

      console.log('Bot created:', data.id)
      setBotId(data.id)
      setBotStatus('ready')
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

        if (!response.ok) return

        if (data.status) {
          setBotStatus(data.status)
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

  return { createBot, isConnected, transcript, error, isLoading, botId, botStatus }
}
