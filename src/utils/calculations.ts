import type { CalculatorInputs, CalculatorResults } from '../types/calculator.types'

export const calculateChurnImpact = (inputs: CalculatorInputs): CalculatorResults => {
  const {
    averageOrderValue,
    subscriptionsPerMonth,
    activeCustomers,
    churnRatePercentage,
    retentionLiftPercentage = 0,
  } = inputs

  const churnRate = churnRatePercentage / 100
  const retentionLift = retentionLiftPercentage / 100

  const lostCustomersPerMonth = activeCustomers * churnRate
  const recoveredCustomersPerMonth = lostCustomersPerMonth * retentionLift

  const monthlyLostRevenue = lostCustomersPerMonth * averageOrderValue * subscriptionsPerMonth
  const monthlyRecoveredRevenue = recoveredCustomersPerMonth * averageOrderValue * subscriptionsPerMonth

  return {
    monthlyLostRevenue,
    annualLostRevenue: monthlyLostRevenue * 12,
    monthlyRecoveredRevenue,
    annualRecoveredRevenue: monthlyRecoveredRevenue * 12,
    recoveredCustomersPerMonth,
  }
}

