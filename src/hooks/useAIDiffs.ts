import { useState } from 'react'
import { Goal, Article, Edit } from '../types'
import { generateDiffs } from '../services/ai/diffGenerator'

export function useAIDiffs() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateEdits = async (goals: Goal[], articles: Article[]): Promise<Edit[]> => {
    setIsGenerating(true)
    setError(null)

    try {
      const edits = await generateDiffs({ goals, articles })
      return edits
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating edits')
      return []
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateEdits,
    isGenerating,
    error
  }
} 