import { useState, useEffect } from "react"
import "./App.css"
import { mockArticles, mockGoals, mockEdits } from "./mockData"
import type { Change, TranscriptEntry, Goal, Edit } from "./types"
import { DiffView } from "./components/DiffView"
import { useAIDiffs } from './hooks/useAIDiffs'
import { TranscriptInput } from "./components/TranscriptInput"
import { useRecall } from './context/RecallContext'
import type { ProcessedTranscriptEntry } from "./types"
import { PromptModal } from "./components/PromptModal"
import { generateHelpCenterPrompt, generateGoalsPrompt } from "./services/ai/prompts"

function App() {
  const { transcript, isConnected, botId, botStatus, botStatusMessage, error: recallError } = useRecall()
  
  const [currentChange, setCurrentChange] = useState<Change>({
    id: '123',
    name: 'Omar Mohamed | Payroll updates',
    goals: mockGoals,
    edits: [],
    transcript: [],
    status: 'draft',
    createdAt: new Date().toISOString()
  })

  const [selectedArticle, setSelectedArticle] = useState<string | null>(null)
  const [showNewGoalModal, setShowNewGoalModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGoalForDetail, setSelectedGoalForDetail] = useState<Goal | null>(null)

  const selectedEdit = mockEdits.find(e => e.articleId === selectedArticle)

  const { generateEdits, isGenerating, error: aiError } = useAIDiffs()

  useEffect(() => {
    if (transcript.length > 0) {
      console.log('Updating currentChange with transcript:', transcript.length)
      setCurrentChange(prev => ({
        ...prev,
        transcript: transcript
      }))
    }
  }, [transcript])

  const addGoal = (title: string, description: string) => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title,
      description,
      relatedArticles: []
    }
    setCurrentChange(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }))
    setShowNewGoalModal(false)
  }

  const removeGoal = (goalId: string) => {
    setCurrentChange(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId)
    }))
    setShowDeleteConfirm(null)
  }

  const getArticleStatus = (articleId: string) => {
    const edit = mockEdits.find(e => e.articleId === articleId)
    if (!edit) return 'unchanged'
    return edit.type
  }

  const organizeArticlesByCategory = (articles: Article[]) => {
    const categories: { [key: string]: Article[] } = {}
    
    articles.forEach(article => {
      const categoryPath = article.category.path
      if (!categories[categoryPath]) {
        categories[categoryPath] = []
      }
      categories[categoryPath].push(article)
    })

    return categories
  }

  const parseUpdatedArticles = (text: string) => {
    const updates: Record<string, string> = {};
    const regex = /--- UPDATED ARTICLE: (\w+) ---\n([\s\S]*?)--- END UPDATED ARTICLE/g;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      const [_, articleId, content] = match;
      updates[articleId] = content.trim();
    }
    
    console.log(`Parsed ${Object.keys(updates).length} updated articles`);
    return updates;
  };

  const createEditsFromUpdates = (updatedArticles: Record<string, string>, originalArticles: Article[]) => {
    const edits: Edit[] = [];
    
    for (const [articleId, updatedContent] of Object.entries(updatedArticles)) {
      const originalArticle = originalArticles.find(a => a.id === articleId);
      
      if (originalArticle) {
        const edit: Edit = {
          id: `edit-${Date.now()}-${articleId}`,
          articleId,
          title: `Update to ${originalArticle.title}`,
          description: `AI-generated update based on conversation goals`,
          originalContent: originalArticle.content,
          revisedContent: updatedContent,
          type: 'modification',
          status: 'draft',
          goalId: currentChange.goals[0]?.id
        };
        
        edits.push(edit);
      }
    }
    
    return edits;
  };

  const handleGenerateChanges = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Sending data to generate changes:', {
        goalsCount: currentChange.goals.length,
        articlesCount: mockArticles.length
      });
      
      const response = await fetch('http://localhost:8000/api/generate-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: currentChange.goals,
          articles: mockArticles
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Generate changes response received');
      console.log('Raw response content:', result.content[0].text.substring(0, 500) + '...');
      
      // Extract updated articles from Claude's response
      const updatedArticles = parseUpdatedArticles(result.content[0].text);
      
      // Log the updated article ids and content preview
      console.log('Updated article IDs:', Object.keys(updatedArticles));
      for (const [id, content] of Object.entries(updatedArticles)) {
        console.log(`Article ${id} content preview:`, content.substring(0, 100) + '...');
      }
      
      // Create edits from the updated articles
      const newEdits = createEditsFromUpdates(updatedArticles, mockArticles);
      console.log(`Created ${newEdits.length} edits:`, newEdits.map(e => e.articleId));
      
      // Update state with the new edits
      setCurrentChange(prev => {
        const updatedChange = {
          ...prev,
          edits: [...(prev.edits || []), ...newEdits]
        };
        console.log('Updated currentChange with edits:', updatedChange.edits.length);
        return updatedChange;
      });
      
      // Select the first edit to show in the UI
      if (newEdits.length > 0) {
        const firstEditArticleId = newEdits[0].articleId;
        console.log('Setting selected article to:', firstEditArticleId);
        setSelectedArticle(firstEditArticleId);
      }
      
      // Force UI update if needed
      setTimeout(() => {
        console.log('Current selected article:', selectedArticle);
        console.log('Current edits in state:', currentChange.edits.length);
      }, 500);
      
    } catch (err) {
      console.error('Generate changes error:', err);
      setError(err instanceof Error ? err.message : 'Error generating changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Add this sample transcript for testing
  const sampleTranscript = [
    {
      speaker: "John",
      text: "We need to update our Australian payroll documentation. The tax rates changed last quarter and the setup guide is missing information about Single Touch Payroll reporting.",
      timestamp: 1620000000000
    },
    {
      speaker: "Sarah",
      text: "You're right. We're getting a lot of support tickets about this. The STP section needs to be more detailed, especially for new businesses.",
      timestamp: 1620000010000
    },
    {
      speaker: "John",
      text: "Also, the German employment law document doesn't mention the new remote work regulations that came into effect in January.",
      timestamp: 1620000020000
    },
    {
      speaker: "Sarah",
      text: "Good point. We should add a section on remote work compliance requirements for all EU countries, not just Germany.",
      timestamp: 1620000030000
    },
    {
      speaker: "John",
      text: "And one more thing - customers are asking for better security guidelines, especially around cross-border data transfers after the Privacy Shield framework changes.",
      timestamp: 1620000040000
    }
  ];

  // Modify the generateGoals function to use the sample transcript when there's no real transcript
  const generateGoals = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use sample transcript if the real transcript is empty
      const transcriptToUse = transcript.length > 0 ? transcript : sampleTranscript;
      
      // Prepare the data to send
      const data = {
        transcript: transcriptToUse,
        articles: mockArticles
      };
      
      console.log('Sending data to generate goals:', {
        transcriptLength: transcriptToUse.length,
        articlesLength: mockArticles.length
      });
      
      // Call the API
      const response = await fetch('http://localhost:8000/api/generate-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Generate goals response:', result);
      
      // Extract the goals from the response text
      if (result.content && Array.isArray(result.content) && result.content.length > 0) {
        const goalText = result.content[0].text;
        console.log('Raw goal text:', goalText);
        
        try {
          // The API might return a JSON array inside the text field
          // Try to parse it as a JSON array first
          let goalDataArray = JSON.parse(goalText);
          
          // Handle both array and single object formats
          if (!Array.isArray(goalDataArray)) {
            goalDataArray = [goalDataArray];
          }
          
          console.log('Parsed goals:', goalDataArray);
          
          // Add each goal that has a title
          let goalsAdded = 0;
          for (const goalData of goalDataArray) {
            if (goalData.title) {
              console.log('Adding goal:', goalData);
              addGoal(goalData.title, goalData.description || 'Generated from transcript');
              goalsAdded++;
            }
          }
          
          if (goalsAdded === 0) {
            setError('No valid goals found in the response');
          }
        } catch (parseError) {
          console.error('Failed to parse goal JSON:', parseError);
          console.error('Raw text was:', goalText);
          
          // As a fallback, try to extract goals using regex
          try {
            // Look for array pattern or individual goals
            const jsonArrayMatch = goalText.match(/\[\s*(\{[\s\S]*\})\s*\]/);
            
            if (jsonArrayMatch && jsonArrayMatch[1]) {
              // Try to parse as array again with some cleanup
              try {
                const cleanedJson = `[${jsonArrayMatch[1]}]`;
                const goalArray = JSON.parse(cleanedJson);
                for (const goal of goalArray) {
                  if (goal.title) {
                    addGoal(goal.title, goal.description || 'Generated from transcript');
                  }
                }
                return;
              } catch (e) {
                console.error('Failed to parse cleaned JSON array', e);
              }
            }
            
            // If array parsing failed, try to find individual goals
            const goalMatches = goalText.matchAll(/title[":]\s*["']?(.*?)["']?[,\n][\s\S]*?description[":]\s*["']?(.*?)["']?[,\n}]/gi);
            let foundGoals = false;
            
            for (const match of goalMatches) {
              if (match[1] && match[2]) {
                const title = match[1].trim();
                const description = match[2].trim();
                console.log('Extracted via regex:', { title, description });
                addGoal(title, description);
                foundGoals = true;
              }
            }
            
            if (!foundGoals) {
              setError('Could not extract goals from the response');
            }
          } catch (regexError) {
            console.error('Regex extraction failed:', regexError);
            setError('Failed to parse the generated goals');
          }
        }
      }
    } catch (err) {
      console.error('Generate goals error:', err);
      setError(err instanceof Error ? err.message : 'Error generating goals');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Change: {currentChange.name}</h1>
        <span className="change-status">{currentChange.status}</span>
      </div>

      <div className="content">
        <div className="top-section">
          <div className="left-panel">
            <div className="panel-header">Live Call transcript</div>
            <TranscriptInput />
            <div className="transcript">
              <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                {isConnected
                  ? `Bot ${botId} — ${botStatus ?? 'connecting'}${botStatusMessage ? `: ${botStatusMessage}` : ''}`
                  : 'Not connected'}
              </div>
              {recallError && <div className="error-message">{recallError}</div>}
              {transcript.map((entry, i) => (
                <div key={i} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                  <b>{entry.speaker}</b>: {entry.text}
                </div>
              ))}
            </div>
          </div>

          <div className="goals-section">
            <div className="panel-header">
              Goals
              <div className="button-group">
                <button 
                  className="generate-button"
                  onClick={generateGoals}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate Goals'}
                </button>
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="goals-grid">
              {currentChange.goals.map(goal => (
                <div 
                  key={goal.id} 
                  className="goal-card"
                  onClick={() => setSelectedGoalForDetail(goal)}
                >
                  <div className="goal-header">
                    <h3>{goal.title}</h3>
                    <button 
                      className="remove-goal-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the card click from firing
                        setShowDeleteConfirm(goal.id);
                      }}
                    >×</button>
                  </div>
                  <p className="goal-description">
                    {goal.description.length > 120 
                      ? `${goal.description.substring(0, 120)}...` 
                      : goal.description}
                  </p>
                </div>
              ))}
              <button className="add-goal-btn" onClick={() => setShowNewGoalModal(true)}>
                + Add Goal
              </button>
            </div>
          </div>
        </div>

        <div className="main-section">
          <div className="articles-list">
            <div className="panel-header">
              Articles
              <button 
                className="generate-button"
                onClick={handleGenerateChanges}
                disabled={currentChange.goals.length === 0}
              >
                Generate Changes
              </button>
            </div>
            {Object.entries(organizeArticlesByCategory(mockArticles)).map(([categoryPath, articles]) => (
              <div key={categoryPath} className="category-group">
                <div className="category-header">
                  <span className="folder-icon">📁</span>
                  {articles[0].category.name}
                </div>
                <div className="category-articles">
                  {articles.map(article => {
                    const status = getArticleStatus(article.id)
                    const statusIcon = status === 'modification' ? '🔸' : 
                                      status === 'addition' ? '🟢' : 
                                      null

                    return (
                      <div 
                        key={article.id} 
                        className={`article-item ${status} ${selectedArticle === article.id ? 'selected' : ''}`}
                        onClick={() => setSelectedArticle(article.id)}
                      >
                        <span className="file-icon">📄</span>
                        {statusIcon && <span className="status-icon">{statusIcon}</span>}
                        <div className="article-title">{article.title}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="document-view">
            <div className="document-content">
              {selectedArticle ? (
                <>
                  {(() => {
                    const article = mockArticles.find(a => a.id === selectedArticle);
                    const edit = currentChange.edits.find(e => e.articleId === selectedArticle);
                    
                    if (!article) {
                      return <div className="empty-state">Article not found</div>;
                    }
                    
                    return (
                      <>
                        <div className="document-header">
                          <h2>{article.title}</h2>
                          {edit && (
                            <span className={`status-badge status-${edit.status}`}>
                              {edit.status}
                            </span>
                          )}
                        </div>
                        
                        {edit && (
                          <div className="edit-description">
                            {edit.description}
                          </div>
                        )}
                        
                        <DiffView 
                          edit={edit} 
                          originalContent={article.content} 
                        />
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="empty-state">Select an article to view</div>
              )}
            </div>
          </div>

          <div className="debug-panel">
            <h3>Generated Edits ({currentChange.edits.length})</h3>
            {currentChange.edits.length > 0 ? (
              <div className="edit-list">
                {currentChange.edits.map(edit => (
                  <div 
                    key={edit.id} 
                    className={`edit-item ${selectedArticle === edit.articleId ? 'selected' : ''}`}
                    onClick={() => setSelectedArticle(edit.articleId)}
                  >
                    <div>
                      <strong>{edit.title}</strong> 
                      <span className="edit-size">
                        ({edit.originalContent.length}→{edit.revisedContent.length} chars)
                      </span>
                    </div>
                    <div className="edit-description">{edit.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No edits generated yet</p>
            )}
          </div>
        </div>
      </div>

      {showNewGoalModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>New Goal</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const title = (form.elements.namedItem('title') as HTMLInputElement).value
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value
              addGoal(title, description)
            }}>
              <input name="title" placeholder="Goal title" required />
              <textarea name="description" placeholder="Goal description" required />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowNewGoalModal(false)}>Cancel</button>
                <button type="submit">Add Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <h2>Delete Goal</h2>
            <p>Are you sure you want to delete this goal?</p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="secondary-button" 
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="danger-button"
                onClick={() => removeGoal(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showPromptModal && (
        <PromptModal
          prompt={generateHelpCenterPrompt(currentChange.goals, mockArticles)}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      {showGoalsModal && (
        <PromptModal
          prompt={generateGoalsPrompt(transcript, mockArticles)}
          onClose={() => setShowGoalsModal(false)}
        />
      )}

      {selectedGoalForDetail && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedGoalForDetail.title}</h2>
              <button onClick={() => setSelectedGoalForDetail(null)}>×</button>
            </div>
            <div className="modal-content">
              <p className="goal-detail-description">{selectedGoalForDetail.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App 