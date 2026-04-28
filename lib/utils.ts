import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extraherar JSON från Claude-svar som kan vara wrappade i ```json ... ```
 * eller ha ledande/trailing text.
 *
 * Hanterar BÅDE JSON-objekt (`{...}`) och JSON-arrays (`[...]`):
 * vi detekterar vilken typ svaret är genom att jämföra positionen för
 * första `[` mot första `{`. Originalversionen sökte bara efter `{`/`}`,
 * vilket gjorde att arrays parsades sönder eftersom omslutande `[` `]`
 * ströks bort.
 */
export function parseClaudeJSON<T>(raw: string): T {
  let text = raw.trim()
  // Ta bort markdown code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) text = match[1].trim()

  const firstBracket = text.indexOf('[')
  const firstBrace = text.indexOf('{')
  const ärArray = firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)

  if (ärArray) {
    const last = text.lastIndexOf(']')
    if (last > firstBracket) text = text.slice(firstBracket, last + 1)
  } else if (firstBrace >= 0) {
    const last = text.lastIndexOf('}')
    if (last > firstBrace) text = text.slice(firstBrace, last + 1)
  }
  return JSON.parse(text)
}
