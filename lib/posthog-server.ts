import { PostHog } from 'posthog-node'

let client: PostHog | null = null

export function getPosthog(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}
