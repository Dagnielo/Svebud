import posthog from 'posthog-js'

let initialized = false

export function initPosthog() {
  if (typeof window === 'undefined' || initialized) return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  })
  ;(window as unknown as { posthog: typeof posthog }).posthog = posthog
  initialized = true
}

export { posthog }
