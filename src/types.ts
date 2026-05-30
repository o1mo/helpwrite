export interface Article {
  id: string;
  title: string;
  content: string;
  path: string;
  lastModified: string;
  category: {
    name: string;
    path: string;
  };
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: number;
  isHighlighted?: boolean; // For when we detect goal-related conversation
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  relatedArticles?: string[];
}

export interface DocumentRevision {
  id: string;
  content: string;
  timestamp: number;
}

export interface Edit {
  id: string;
  articleId: string;
  title: string;
  description: string;
  originalContent: string;
  revisedContent: string;
  type: 'addition' | 'modification' | 'deletion';
  status: 'draft' | 'approved' | 'rejected';
  goalId?: string;
}

export interface Change {
  id: string;
  name: string;
  goals: Goal[];
  edits: Edit[];
  transcript: TranscriptEntry[];
  status: 'draft' | 'review' | 'approved';
  createdAt: string;
}

export interface ProcessedTranscriptEntry {
  text: string;
  timestamp: number;
  speaker: string;
} 