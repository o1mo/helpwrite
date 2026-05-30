import React from "react"
import { Edit } from "../types"
import { generateDiff } from "../utils/diff"

interface DiffViewProps {
  edit?: Edit;
  originalContent: string;
}

export function DiffView({ edit, originalContent }: DiffViewProps) {
  // If no edit exists, just show the original markdown
  if (!edit) {
    return (
      <div className="markdown-content">
        {originalContent}
      </div>
    )
  }

  // If there's an edit, show the diff version
  const diffs = generateDiff(originalContent, edit.revisedContent)
  
  return (
    <div className="prose-diff">
      {diffs.map((diff, i) => {
        const [type, content] = diff
        if (type === 0) return <span key={i}>{content}</span>
        if (type === 1) return <ins key={i} className="diff-addition">{content}</ins>
        if (type === -1) return <del key={i} className="diff-deletion">{content}</del>
        return null
      })}
    </div>
  )
} 