import type {
  CalculatorInputs,
  CalculatorResults,
  ChurnScenario,
} from '../types/calculator.types'

/**
 * Normalises percentage inputs (e.g. churn rate, gross margin) into a decimal.
 *
 * @param percentage - A percentage expressed on a 0-100 scale.
 * @returns The decimal representation of the percentage.
 */
const toDecimal = (percentage: number): number => percentage / 100

/**
 * Applies an optional gross margin to a raw revenue figure. When no gross margin
 * is provided, the original value is returned untouched.
 *
 * @param value - The revenue or savings figure to adjust.
 * @param grossMargin - Optional gross margin percentage (0-100).
 * @returns Margin-adjusted value, or the original value when no margin is set.
 */
const applyGrossMargin = (value: number, grossMargin?: number): number => {
  if (grossMargin == null) return value
  return value * toDecimal(grossMargin)
}

/**
 * Calculates the annual revenue lost to churn. The formula multiplies the number
 * of customers lost in a year by the revenue each customer generates annually.
 *
 * Formula:
 * (numberOfCustomers * (churnRate / 100)) * (averageOrderValue * purchaseFrequency)
 *
 * @param inputs - Core calculator inputs.
 * @returns Margin-adjusted annual revenue lost due to churn.
 */
export const calculateAnnualRevenueLost = (inputs: CalculatorInputs): number => {
  const churnRateDecimal = toDecimal(inputs.churnRate)
  const lostCustomers = inputs.numberOfCustomers * churnRateDecimal
  const annualRevenuePerCustomer = inputs.averageOrderValue * inputs.purchaseFrequency
  const annualRevenueLost = lostCustomers * annualRevenuePerCustomer

  return applyGrossMargin(annualRevenueLost, inputs.grossMargin)
}

/**
 * Calculates the compounded lifetime value lost over multiple years. The model
 * assumes that lost customers do not return and therefore the remaining customer
 * base shrinks each year. This compounding effect is captured by iteratively
 * reducing the remaining customers before calculating the next year's loss.
 *
 * @param inputs - Core calculator inputs.
 * @param years - The projection horizons to evaluate (defaults to [1, 3, 5]).
 * @returns A mapping of projection horizon (in years) to cumulative LTV lost.
 */
export const calculateLifetimeValueLost = (
  inputs: CalculatorInputs,
  years: number[] = [1, 3, 5],
): Record<number, number> => {
  if (!years.length) {
    throw new Error('At least one projection horizon must be provided.')
  }

  const targets = new Set(years)
  const projections: Record<number, number> = {}
  const churnRateDecimal = toDecimal(inputs.churnRate)
  const annualRevenuePerCustomer = inputs.averageOrderValue * inputs.purchaseFrequency
  const margin = inputs.grossMargin

  let remainingCustomers = inputs.numberOfCustomers
  let cumulativeLoss = 0
  const maxYear = Math.max(...years)

  for (let year = 1; year <= maxYear; year += 1) {
    const lostCustomersThisYear = remainingCustomers * churnRateDecimal
    const revenueLostThisYear = lostCustomersThisYear * annualRevenuePerCustomer
    cumulativeLoss += applyGrossMargin(revenueLostThisYear, margin)

    if (targets.has(year)) {
      projections[year] = cumulativeLoss
    }

    // Reduce the customer base by the number of customers who churned this year.
    remainingCustomers -= lostCustomersThisYear
  }

  return projections
}

/**
 * Calculates the cost to replace churned customers based on the provided
 * customer acquisition cost (CAC). When no CAC is supplied, the replacement
 * cost is assumed to be zero.
 *
 * @param inputs - Core calculator inputs.
 * @returns Estimated cost required to replace churned customers.
 */
export const calculateReplacementCost = (inputs: CalculatorInputs): number => {
  if (inputs.customerAcquisitionCost == null) return 0

  const churnRateDecimal = toDecimal(inputs.churnRate)
  const lostCustomers = inputs.numberOfCustomers * churnRateDecimal
  return lostCustomers * inputs.customerAcquisitionCost
}

/**
 * Generates churn reduction scenarios (10%, 25%, 50%) and estimates the
 * associated annual and three-year savings when compared to the baseline churn.
 *
 * @param inputs - Core calculator inputs.
 * @returns An array of churn reduction scenarios with projected savings.
 */
export const calculateChurnReductionScenarios = (inputs: CalculatorInputs): ChurnScenario[] => {
  const baseAnnualLoss = calculateAnnualRevenueLost(inputs)
  const projectionHorizonYears = 3
  const reductions = [10, 25, 50]

  return reductions.map((reductionPercentage) => {
    const reductionDecimal = toDecimal(reductionPercentage)
    const adjustedInputs: CalculatorInputs = {
      ...inputs,
      churnRate: inputs.churnRate * (1 - reductionDecimal),
    }

    const adjustedAnnualLoss = calculateAnnualRevenueLost(adjustedInputs)
    const annualSavings = baseAnnualLoss - adjustedAnnualLoss

    const baseLtv = calculateLifetimeValueLost(inputs, [projectionHorizonYears])[projectionHorizonYears]
    const adjustedLtv =
      calculateLifetimeValueLost(adjustedInputs, [projectionHorizonYears])[projectionHorizonYears]
    const threeYearSavings = baseLtv - adjustedLtv

    return {
      reductionPercentage,
      annualSavings,
      threeYearSavings,
    }
  })
}

/**
 * Estimates the average customer lifespan (in years) given a churn rate.
 * Derived from the standard SaaS formula: 1 / churn rate (expressed as a decimal).
 *
 * @param churnRate - Annual churn rate as a percentage.
 * @returns The average customer lifespan in years. Returns Infinity when churn is zero.
 */
export const calculateCustomerLifespan = (churnRate: number): number => {
  const churnRateDecimal = toDecimal(churnRate)
  if (churnRateDecimal === 0) return Number.POSITIVE_INFINITY
  return 1 / churnRateDecimal
}

/**
 * Convenience function that bundles the individual calculations into a single
 * result payload compatible with the `CalculatorResults` interface.
 *
 * @param inputs - Core calculator inputs.
 * @returns Complete calculator output bundle.
 */
export const calculateCalculatorResults = (inputs: CalculatorInputs): CalculatorResults => ({
  annualRevenueLost: calculateAnnualRevenueLost(inputs),
  lifetimeValueLost: calculateLifetimeValueLost(inputs),
  replacementCost: calculateReplacementCost(inputs),
  reducedChurnScenarios: calculateChurnReductionScenarios(inputs),
})

