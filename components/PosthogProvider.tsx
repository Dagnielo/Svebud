'use client'
import { useEffect } from 'react'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { posthog, initPosthog } from '@/lib/posthog'

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPosthog()
  }, [])
  return <PHProvider client={posthog}>{children}</PHProvider>
}
