import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

export function getServerAnalytics() {
  if (posthogClient) {
    return posthogClient
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (apiKey) {
    posthogClient = new PostHog(apiKey, {
      host: host,
      flushAt: 1, // Flush immediately in serverless environments
      flushInterval: 0
    })
  } else {
    // Return a dummy client if PostHog isn't configured
    posthogClient = {
      capture: () => {},
      flush: async () => {},
      shutdown: async () => {},
      on: () => {},
    } as unknown as PostHog
  }

  return posthogClient
}
