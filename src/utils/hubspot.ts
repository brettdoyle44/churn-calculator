import type { Client } from '@hubspot/api-client'
import type { LeadCapturePayload } from '../types/calculator.types'

let cachedClient: Client | null = null
let clientPromise: Promise<Client | null> | null = null

const createClient = async (): Promise<Client | null> => {
  const accessToken = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN

  if (!accessToken) {
    console.warn(
      'HubSpot access token is not configured. Set VITE_HUBSPOT_ACCESS_TOKEN to enable lead capture.',
    )
    return null
  }

  const hubspotModule = await import('@hubspot/api-client')
  const HubspotClient = hubspotModule.Client

  return new HubspotClient({ accessToken })
}

export const getHubspotClient = async (): Promise<Client | null> => {
  if (cachedClient) {
    return cachedClient
  }

  if (!clientPromise) {
    clientPromise = createClient().then((client) => {
      cachedClient = client
      return client
    })
  }

  return clientPromise
}

export const submitLeadCapture = async (
  payload: LeadCapturePayload,
): Promise<void> => {
  const client = await getHubspotClient()

  if (!client) {
    throw new Error('HubSpot client unavailable – missing configuration.')
  }

  // Placeholder implementation. Replace with actual HubSpot CRM API calls.
  if (import.meta.env.DEV) {
    console.info('Simulating HubSpot lead capture:', payload)
  }

  await Promise.resolve()
}

