import { Differ } from "@clearlylocal/diff-match-patch-unicode"

const differ = new Differ()

export function generateDiff(original: string, revised: string) {
  const diffs = differ.diff(original, revised)
  return differ.cleanupSemantic(diffs)
} 