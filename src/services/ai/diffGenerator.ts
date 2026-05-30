import { Goal, Article, Edit } from '../../types.ts'
import { SYSTEM_CONTEXT, TASK_TEMPLATE, RESPONSE_FORMAT } from './prompts'

interface GenerateDiffsOptions {
  goals: Goal[];
  articles: Article[];
}

export async function generateDiffs({ goals, articles }: GenerateDiffsOptions): Promise<Edit[]> {
  // For now, just return empty array since we're not making API calls here
  return []
} 