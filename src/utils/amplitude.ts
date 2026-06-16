import * as amplitude from '@amplitude/analytics-browser'

let isInitialized = false

export const initAmplitude = () => {
  if (typeof window !== 'undefined' && !isInitialized && process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) {
    amplitude.init(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY, {
      defaultTracking: true,
    })
    isInitialized = true
  }
}

export const trackEvent = (eventName: string, eventProperties?: Record<string, any>) => {
  if (isInitialized) {
    amplitude.track(eventName, eventProperties)
  }
}
