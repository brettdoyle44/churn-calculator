import type { CalculatorResults, LeadCapturePayload } from '../types/calculator.types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'
const HUBSPOT_FORMS_BASE = 'https://api.hsforms.com'
const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 500

const isDevelopment = Boolean(import.meta.env.DEV)

type HubSpotLifecycleStage =
  | 'subscriber'
  | 'lead'
  | 'marketingqualifiedlead'
  | 'salesqualifiedlead'
  | 'opportunity'
  | 'customer'
  | 'evangelist'
  | 'other'

type HubSpotContactProperties = Record<string, string | undefined>

type HubSpotRequestMethod = 'GET' | 'POST' | 'PATCH'

type HubSpotQueryParams = Record<string, string | number | boolean | undefined>

type HubSpotRequestInit = {
  method?: HubSpotRequestMethod
  body?: unknown
  query?: HubSpotQueryParams
}

export interface HubSpotFormData extends LeadCapturePayload {
  storeName?: string
  totalCustomers?: number
  averageOrderValue?: number
  churnRate?: number
  lifecycleStage?: HubSpotLifecycleStage
}

export interface SubmitToHubSpotResult {
  success: boolean
  contactId?: string
  fallbackUsed: boolean
  message: string
}

export interface CreateDealResult {
  success: boolean
  dealId?: string
  message: string
}

export interface TriggerEmailSequenceResult {
  success: boolean
  message: string
}

class HubSpotApiError extends Error {
  public readonly status: number

  public readonly code?: string

  public readonly data?: unknown

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message)
    this.name = 'HubSpotApiError'
    this.status = status
    this.data = data
    this.code = code
  }
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const shouldRetry = (error: unknown): boolean => {
  if (error instanceof HubSpotApiError) {
    return error.status === 429 || error.status >= 500
  }

  if (error instanceof TypeError) {
    // Fetch throws TypeError on network failures.
    return true
  }

  return false
}

const withRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  maxAttempts: number = MAX_ATTEMPTS,
): Promise<T> => {
  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    attempt += 1
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (!shouldRetry(error) || attempt >= maxAttempts) {
        throw error
      }

      const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1)
      await sleep(backoff)
    }
  }

  throw lastError
}

const logDev = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error('[HubSpot]', ...args)
  }
}

const getAccessToken = (): string => {
  const token = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN
  if (!token) {
    throw new Error('HubSpot access token is not configured.')
  }
  return token
}

const hubspotRequest = async <T>(
  path: string,
  init: HubSpotRequestInit = {},
): Promise<T> => {
  const token = getAccessToken()
  const url = new URL(`${HUBSPOT_API_BASE}${path}`)

  if (init.query) {
    Object.entries(init.query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  const text = await response.text()
  const payload = text ? (() => { try { return JSON.parse(text) } catch { return text } })() : undefined

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : undefined) ?? `HubSpot request failed with status ${response.status}`

    throw new HubSpotApiError(errorMessage, response.status, payload, (payload as { category?: string })?.category)
  }

  return payload as T
}

const calculateLeadScore = (annualRevenueLost: number): number => {
  if (!Number.isFinite(annualRevenueLost) || annualRevenueLost <= 0) {
    return 10
  }

  const capped = Math.min(annualRevenueLost, 1_000_000)
  return Math.min(100, Math.round((capped / 1_000_000) * 100))
}

const determineLifecycleStage = (
  leadScore: number,
  explicitStage?: HubSpotLifecycleStage,
): HubSpotLifecycleStage => {
  if (explicitStage) {
    return explicitStage
  }

  if (leadScore >= 80) {
    return 'salesqualifiedlead'
  }
  if (leadScore >= 60) {
    return 'marketingqualifiedlead'
  }
  if (leadScore >= 40) {
    return 'lead'
  }
  return 'subscriber'
}

const buildContactProperties = (
  formData: HubSpotFormData,
  calculatorResults: CalculatorResults,
): HubSpotContactProperties => {
  const leadScore = calculateLeadScore(calculatorResults.annualRevenueLost)
  const lifecycleStage = determineLifecycleStage(leadScore, formData.lifecycleStage)
  const formattedDate = new Date().toISOString()

  return {
    email: formData.email,
    firstname: formData.firstName,
    lastname: formData.lastName,
    company: formData.company ?? formData.storeName,
    annual_revenue_lost: calculatorResults.annualRevenueLost.toFixed(2),
    churn_rate:
      formData.churnRate !== undefined ? formData.churnRate.toString() : undefined,
    total_customers:
      formData.totalCustomers !== undefined ? formData.totalCustomers.toString() : undefined,
    average_order_value:
      formData.averageOrderValue !== undefined
        ? formData.averageOrderValue.toFixed(2)
        : undefined,
    calculator_completed_date: formattedDate,
    lead_score: leadScore.toString(),
    lifecyclestage: lifecycleStage,
  }
}

const upsertContact = async (
  formData: HubSpotFormData,
  calculatorResults: CalculatorResults,
): Promise<string> => {
  const email = formData.email.trim().toLowerCase()
  if (!email) {
    throw new Error('Email is required to create or update a HubSpot contact.')
  }

  const properties = buildContactProperties(formData, calculatorResults)

  const existingContact = await withRetry(
    async () => {
      try {
        return await hubspotRequest<{ id: string }>(`/crm/v3/objects/contacts/${encodeURIComponent(email)}`, {
          query: { idProperty: 'email', properties: 'firstname,lastname,company' },
        })
      } catch (error) {
        if (error instanceof HubSpotApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
  )

  if (existingContact?.id) {
    await withRetry(async () =>
      hubspotRequest(`/crm/v3/objects/contacts/${existingContact.id}`, {
        method: 'PATCH',
        body: { properties },
      }),
    )
    return existingContact.id
  }

  const createdContact = await withRetry(async () =>
    hubspotRequest<{ id: string }>('/crm/v3/objects/contacts', {
      method: 'POST',
      body: { properties },
    }),
  )

  return createdContact.id
}

const addContactToList = async (contactId: string, email: string) => {
  const listId = import.meta.env.VITE_HUBSPOT_CALCULATOR_LIST_ID

  if (!listId) {
    logDev(
      'HubSpot calculator list ID missing. Set VITE_HUBSPOT_CALCULATOR_LIST_ID to automatically maintain the Calculator Users list.',
    )
    return
  }

  await withRetry(async () =>
    hubspotRequest(`/crm/v3/lists/${listId}/memberships/batch/add`, {
      method: 'POST',
      body: {
        inputs: [{ id: contactId }],
      },
    }),
  ).catch((error) => {
    logDev('Failed to add contact to Calculator Users list', { email, error })
  })
}

const submitFormSubmission = async (
  formData: HubSpotFormData,
  calculatorResults: CalculatorResults,
) => {
  const portalId = import.meta.env.VITE_HUBSPOT_PORTAL_ID
  const formId = import.meta.env.VITE_HUBSPOT_FORM_ID

  if (!portalId || !formId) {
    logDev(
      'HubSpot portal or form ID is not configured. Set VITE_HUBSPOT_PORTAL_ID and VITE_HUBSPOT_FORM_ID to submit form data.',
    )
    return
  }

  const fields = [
    { name: 'email', value: formData.email },
    { name: 'firstname', value: formData.firstName },
    { name: 'lastname', value: formData.lastName },
    { name: 'company', value: formData.company ?? formData.storeName },
    { name: 'annual_revenue_lost', value: calculatorResults.annualRevenueLost.toFixed(2) },
    {
      name: 'average_order_value',
      value:
        formData.averageOrderValue !== undefined
          ? formData.averageOrderValue.toFixed(2)
          : undefined,
    },
    {
      name: 'total_customers',
      value: formData.totalCustomers !== undefined ? formData.totalCustomers.toString() : undefined,
    },
    {
      name: 'churn_rate',
      value: formData.churnRate !== undefined ? formData.churnRate.toString() : undefined,
    },
  ].filter(
    (field): field is { name: string; value: string } =>
      Boolean(field.value && field.value.toString().trim()),
  )

  const context = formData.metadata && 'pageUri' in formData.metadata
    ? { pageUri: formData.metadata.pageUri as string }
    : undefined

  await withRetry(async () => {
    const response = await fetch(
      `${HUBSPOT_FORMS_BASE}/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields,
          context,
          legalConsentOptions: {
            consent: {
              consentToProcess: true,
              text: 'User consented via Churn Calculator submission.',
              communications: [
                {
                  value: true,
                  subscriptionTypeId: 999,
                  text: 'Marketing communications',
                },
              ],
            },
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new HubSpotApiError(
        `Form submission failed with status ${response.status}`,
        response.status,
        errorText,
      )
    }
  })
}

const submitEmailOnlyFallback = async (formData: HubSpotFormData): Promise<boolean> => {
  const portalId = import.meta.env.VITE_HUBSPOT_PORTAL_ID
  const formId = import.meta.env.VITE_HUBSPOT_FORM_ID

  if (!portalId || !formId) {
    return false
  }

  try {
    const response = await fetch(`${HUBSPOT_FORMS_BASE}/submissions/v3/integration/submit/${portalId}/${formId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: [
          { name: 'email', value: formData.email },
          { name: 'company', value: formData.company ?? formData.storeName },
        ].filter((field) => Boolean(field.value)),
      }),
    })
    return response.ok
  } catch (error) {
    logDev('Email-only fallback submission failed', error)
    return false
  }
}

/**
 * Create or update a HubSpot contact, capture calculator metrics, and submit form data.
 *
 * @param formData - Contact and calculator metadata captured from the UI.
 * @param calculatorResults - Detailed results produced by the churn calculator.
 * @returns Status of the HubSpot submission sequence, including fallback behaviour.
 */
export const submitToHubSpot = async (
  formData: HubSpotFormData,
  calculatorResults: CalculatorResults,
): Promise<SubmitToHubSpotResult> => {
  try {
    const contactId = await upsertContact(formData, calculatorResults)
    await addContactToList(contactId, formData.email)
    await submitFormSubmission(formData, calculatorResults)

    return {
      success: true,
      contactId,
      fallbackUsed: false,
      message: 'Contact saved to HubSpot successfully.',
    }
  } catch (error) {
    logDev('HubSpot submission failed', error)
    const fallbackSucceeded = await submitEmailOnlyFallback(formData)

    return {
      success: false,
      fallbackUsed: fallbackSucceeded,
      message: fallbackSucceeded
        ? 'We saved your email while we resolve a HubSpot connection hiccup.'
        : 'We could not save your details. Please try again later or reach out to hello@churnguard.ai.',
    }
  }
}

const fetchContactDetails = async (contactId: string) =>
  withRetry(async () =>
    hubspotRequest<{
      id: string
      properties: { company?: string; firstname?: string; lastname?: string }
    }>(`/crm/v3/objects/contacts/${contactId}`, {
      query: {
        properties: 'company,firstname,lastname',
      },
    }),
  )

/**
 * Create a HubSpot deal for high-value calculator submissions.
 *
 * @param contactId - HubSpot contact identifier returned from {@link submitToHubSpot}.
 * @param calculatorResults - Calculator output used to derive deal amount.
 * @returns Deal creation status, skipping creation if revenue threshold not met.
 */
export const createHubSpotDeal = async (
  contactId: string,
  calculatorResults: CalculatorResults,
): Promise<CreateDealResult> => {
  if (calculatorResults.annualRevenueLost <= 50_000) {
    return {
      success: false,
      message: 'Annual revenue lost below threshold. Deal creation skipped.',
    }
  }

  try {
    const contact = await fetchContactDetails(contactId)

    const storeName =
      contact.properties?.company ||
      [contact.properties?.firstname, contact.properties?.lastname].filter(Boolean).join(' ') ||
      'ChurnGuard Prospect'

    const potentialSavings = calculatorResults.annualRevenueLost * 0.25 * 3

    const body = {
      properties: {
        dealname: `${storeName} - ChurnGuard Opportunity`,
        amount: potentialSavings.toFixed(2),
        pipeline: 'Sales Pipeline',
        dealstage: 'appointmentscheduled',
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 3,
            },
          ],
        },
      ],
    }

    const response = await withRetry(async () =>
      hubspotRequest<{ id: string }>('/crm/v3/objects/deals', {
        method: 'POST',
        body,
      }),
    )

    return {
      success: true,
      dealId: response.id,
      message: 'Deal created successfully.',
    }
  } catch (error) {
    logDev('Failed to create HubSpot deal', error)
    return {
      success: false,
      message: 'Unable to create a HubSpot deal at this time.',
    }
  }
}

/**
 * Enroll a contact into the configured HubSpot workflow email sequence.
 *
 * @param email - Contact email address.
 * @returns Enrollment result including errors suitable for user messaging.
 */
export const triggerEmailSequence = async (
  email: string,
): Promise<TriggerEmailSequenceResult> => {
  const workflowId = import.meta.env.VITE_HUBSPOT_WORKFLOW_ID

  if (!workflowId) {
    logDev('HubSpot workflow ID missing. Set VITE_HUBSPOT_WORKFLOW_ID to enroll contacts.')
    return {
      success: false,
      message: 'Workflow enrollment is not configured.',
    }
  }

  try {
    await withRetry(async () =>
      hubspotRequest(`/automation/v3/workflows/${workflowId}/enrollments/contacts/${encodeURIComponent(email)}`, {
        method: 'POST',
      }),
    )

    return {
      success: true,
      message: 'Workflow enrollment successful.',
    }
  } catch (error) {
    logDev('Failed to enroll contact in workflow', error)
    return {
      success: false,
      message: 'We could not enroll this contact in the email sequence.',
    }
  }
}

/**
 * Backwards-compatible helper for existing lead capture flows.
 *
 * @deprecated Prefer {@link submitToHubSpot} when calculator results are available.
 */
export const submitLeadCapture = async (
  payload: HubSpotFormData & { calculatorResults?: CalculatorResults },
): Promise<SubmitToHubSpotResult> => {
  const calculatorResults: CalculatorResults =
    payload.calculatorResults ??
    ({
      annualRevenueLost: 0,
      lifetimeValueLost: {},
      replacementCost: 0,
      reducedChurnScenarios: [],
    } satisfies CalculatorResults)

  return submitToHubSpot(payload, calculatorResults)
}

