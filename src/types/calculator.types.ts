export interface CalculatorInputs {
  averageOrderValue: number
  subscriptionsPerMonth: number
  activeCustomers: number
  churnRatePercentage: number
  retentionLiftPercentage?: number
}

export interface CalculatorResults {
  monthlyLostRevenue: number
  annualLostRevenue: number
  monthlyRecoveredRevenue: number
  annualRecoveredRevenue: number
  recoveredCustomersPerMonth: number
}

export interface LeadCapturePayload {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  metadata?: Record<string, unknown>
}

