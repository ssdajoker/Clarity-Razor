export interface ClarityTile {
  objective: string
  constraints: string[]
  deletion_pass: string[]
  five_step_flow: string[]
  single_next_action: string
  metrics: string[]
  feedback_loop: string
  assumptions: string[]
  followup_questions: string[]
}

export function exportAsMarkdown(tile: ClarityTile, mode: string): string {
  return `# Clarity Tile - ${mode}

## Objective
${tile.objective}

## Constraints
${tile.constraints?.map((c: string) => `- ${c}`).join('\n') || 'None'}

## Deletion Pass
${tile.deletion_pass?.map((d: string) => `- ${d}`).join('\n') || 'None'}

## 5-Step Flow
${tile.five_step_flow?.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || 'None'}

## Single Next Action
**${tile.single_next_action}**

## Metrics
${tile.metrics?.map((m: string) => `- ${m}`).join('\n') || 'None'}

## Feedback Loop
${tile.feedback_loop}

## Assumptions
${tile.assumptions?.map((a: string) => `- ${a}`).join('\n') || 'None'}

## Follow-up Questions
${tile.followup_questions?.map((q: string) => `- ${q}`).join('\n') || 'None'}
`
}

export function exportAsJSON(tile: ClarityTile): string {
  return JSON.stringify(tile, null, 2)
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
