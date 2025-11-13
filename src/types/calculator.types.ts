/**
 * Core inputs used by the Shopify churn cost calculator.
 */
export interface CalculatorInputs {
  averageOrderValue: number
  numberOfCustomers: number
  purchaseFrequency: number
  churnRate: number
  customerAcquisitionCost?: number
  grossMargin?: number
}

/**
 * Projected savings for a specific churn reduction scenario.
 */
export interface ChurnScenario {
  reductionPercentage: number
  annualSavings: number
  threeYearSavings: number
}

/**
 * Result payload returned by the churn calculator utilities.
 */
export interface CalculatorResults {
  annualRevenueLost: number
  lifetimeValueLost: Record<number, number>
  replacementCost: number
  reducedChurnScenarios: ChurnScenario[]
}

export interface LeadCapturePayload {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  metadata?: Record<string, unknown>
}

