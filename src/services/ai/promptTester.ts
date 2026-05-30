interface PromptVariation {
  name: string;
  systemContext: string;
  taskTemplate: string;
  responseFormat: string;
}

export async function testPromptVariations(
  variations: PromptVariation[],
  testGoals: Goal[],
  testArticles: Article[]
) {
  const results = []

  for (const variation of variations) {
    try {
      const startTime = Date.now()
      const edits = await generateDiffs({
        goals: testGoals,
        articles: testArticles,
        prompts: variation
      })
      const duration = Date.now() - startTime

      results.push({
        variation: variation.name,
        success: true,
        duration,
        editCount: edits.length,
        averageEditLength: edits.reduce((acc, edit) => 
          acc + edit.revisedContent.length, 0) / edits.length,
        edits
      })
    } catch (error) {
      results.push({
        variation: variation.name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
} 