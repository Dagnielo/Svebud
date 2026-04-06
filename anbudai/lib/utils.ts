import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extraherar JSON från Claude-svar som kan vara wrappade i ```json ... ```
 * eller ha ledande/trailing text.
 */
export function parseClaudeJSON<T>(raw: string): T {
  let text = raw.trim()
  // Ta bort markdown code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) text = match[1].trim()
  // Hitta första { och sista }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) {
    text = text.slice(first, last + 1)
  }
  return JSON.parse(text)
}
