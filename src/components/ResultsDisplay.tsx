import { Dialog, Transition } from '@headlessui/react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import type { FC, ReactNode } from 'react'
import CountUp from 'react-countup'
import { Fragment, useId, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import EmailCapture from './EmailCapture'
import type { CalculatorResults } from '../types/calculator.types'

type ResultsDisplayProps = {
  results?: CalculatorResults | null
}

const currencyFormatter = (digits: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
  })

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const marketingBudgetBenchmark = 750_000
const averageCostPerAcquisition = 450
const teamMemberCost = 85_000

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
}

type AnimatedNumberProps = {
  value: number
  formatter: (value: number) => string
  decimals?: number
  className?: string
  duration?: number
}

const AnimatedNumber: FC<AnimatedNumberProps> = ({
  value,
  formatter,
  decimals = 0,
  className,
  duration = 1.8,
}) => {
  const { ref, shouldAnimate, prefersReducedMotion } = useCountUpTrigger()

  if (prefersReducedMotion) {
    return (
      <span ref={ref} className={className}>
        {formatter(value)}
      </span>
    )
  }

  return (
    <span ref={ref} className={className}>
      {shouldAnimate ? (
        <CountUp
          key={value}
          start={0}
          end={value}
          duration={duration}
          decimals={decimals}
          formattingFn={formatter}
          separator=","
        >
          {({ countUpRef }) => <span ref={countUpRef} />}
        </CountUp>
      ) : (
        formatter(0)
      )}
    </span>
  )
}

const useCountUpTrigger = () => {
  const ref = useRef<HTMLSpanElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const isInView = useInView(ref, { once: true, amount: 0.6, margin: '-80px' })

  return {
    ref,
    shouldAnimate: !prefersReducedMotion && isInView,
    prefersReducedMotion,
  }
}

type ComparisonStat = {
  label: string
  value: number
  description: string
  isPercent?: boolean
}

const ResultsDisplay: FC<ResultsDisplayProps> = ({ results }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const lossGradientId = useId()

  const { annualLoss, monthlyLoss, scenarioCards, comparisonStats, breakdownData } = useMemo(() => {
    if (!results) {
      return {
        annualLoss: 0,
        monthlyLoss: 0,
        scenarioCards: [] as CalculatorResults['reducedChurnScenarios'],
        comparisonStats: [] as ComparisonStat[],
        breakdownData: [] as Array<{ label: string; value: number }>,
      }
    }

    const annual = results.annualRevenueLost
    const monthly = annual / 12
    const threeYear = results.lifetimeValueLost[3] ?? annual * 3
    const fiveYear = results.lifetimeValueLost[5] ?? annual * 5

    const marketingIncreaseRaw =
      marketingBudgetBenchmark > 0 ? (annual / marketingBudgetBenchmark) * 100 : 0
    const marketingIncrease = Math.min(400, Math.round(marketingIncreaseRaw))

    const newCustomerAcquisitions =
      results.replacementCost > 0
        ? Math.max(1, Math.round(results.replacementCost / averageCostPerAcquisition))
        : Math.max(1, Math.round(annual / averageCostPerAcquisition))

    const additionalTeamMembers = Math.max(1, Math.floor(annual / teamMemberCost))

    return {
      annualLoss: annual,
      monthlyLoss: monthly,
      scenarioCards: [...results.reducedChurnScenarios].sort(
        (a, b) => a.reductionPercentage - b.reductionPercentage,
      ),
      breakdownData: [
        { label: 'Annual revenue lost', value: annual },
        { label: '3-year compounded loss', value: threeYear },
        { label: '5-year compounded loss', value: fiveYear },
      ],
      comparisonStats: [
        {
          label: 'New customer acquisitions',
          value: newCustomerAcquisitions,
          description: 'Based on an average CAC of $450 per customer',
        },
        {
          label: 'Marketing budget increase',
          value: marketingIncrease,
          description: `Equivalent boost on a $${numberFormatter.format(
            marketingBudgetBenchmark,
          )} annual budget`,
          isPercent: true,
        },
        {
          label: 'Additional team members',
          value: additionalTeamMembers,
          description: 'Assuming $85K fully loaded annual compensation each',
        },
      ],
    }
  }, [results])

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <>
      <motion.section
        className="relative flex w-full flex-col gap-8 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/15 via-white/8 to-white/5 p-8 shadow-[0_25px_70px_-30px_rgba(15,23,42,0.65)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_rgba(15,23,42,0))]" />
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-8"
            >
              <motion.div
                className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-8 shadow-inner"
                {...sectionMotion}
              >
                <div className="space-y-2 text-sm font-medium uppercase tracking-[0.35em] text-rose-300/80">
                  Hero result
                </div>
                <div className="mt-4 space-y-4">
                  <p className="text-base text-rose-100/80">You&apos;re losing</p>
                  <motion.div
                    className="flex flex-wrap items-baseline gap-4"
                    animate={prefersReducedMotion ? undefined : { scale: [1, 1.04, 1] }}
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : { repeat: Infinity, repeatDelay: 1.2, duration: 1.8, ease: 'easeInOut' }
                    }
                  >
                    <AnimatedNumber
                      value={annualLoss}
                      formatter={currencyFormatter(0).format}
                      className="text-4xl font-bold tracking-tight text-rose-400 drop-shadow-[0_15px_35px_rgba(244,63,94,0.35)] sm:text-5xl"
                    />
                    <span className="text-lg font-semibold text-rose-100/70 sm:text-xl">
                      per year to customer churn
                    </span>
                  </motion.div>
                  <p className="text-sm text-rose-100/60 sm:text-base">
                    That&apos;s{' '}
                    <AnimatedNumber
                      value={monthlyLoss}
                      formatter={currencyFormatter(0).format}
                      className="font-semibold text-rose-100"
                    />{' '}
                    lost every month.
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="rounded-3xl border border-rose-500/20 bg-white/5 p-6 shadow-xl backdrop-blur"
                {...sectionMotion}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      Breakdown visualization
                    </h3>
                    <p className="text-sm text-slate-200/70">
                      Compounded view of your churn impact over time.
                    </p>
                  </div>
                </div>

                <div className="mt-6 h-60 w-full">
                  <ResponsiveContainer>
                    <BarChart data={breakdownData} barSize={36}>
                      <defs>
                        <linearGradient id={lossGradientId} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="rgba(248,113,113,0.9)" />
                          <stop offset="100%" stopColor="rgba(248,113,113,0.2)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 8" stroke="rgba(148,163,184,0.25)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'rgba(226,232,240,0.75)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          typeof value === 'number' ? currencyFormatter(0).format(value) : value
                        }
                        tick={{ fill: 'rgba(226,232,240,0.55)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: 'rgba(248,113,113,0.1)' }}
                        formatter={(value: number | string) =>
                          typeof value === 'number' ? currencyFormatter(0).format(value) : value
                        }
                        contentStyle={{
                          backgroundColor: 'rgba(15,23,42,0.95)',
                          borderRadius: 16,
                          border: '1px solid rgba(248,113,113,0.35)',
                        }}
                        labelStyle={{ color: 'rgba(248,250,252,0.8)' }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} fill={`url(#${lossGradientId})`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-xl backdrop-blur"
                {...sectionMotion}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      What if you reduced churn?
                    </h3>
                    <p className="text-sm text-emerald-100/70">
                      Modeled savings based on 10%, 25%, and 50% churn improvements.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {scenarioCards.map((scenario) => (
                    <motion.div
                      key={scenario.reductionPercentage}
                      whileHover={
                        prefersReducedMotion
                          ? undefined
                          : {
                              y: -6,
                              scale: 1.02,
                              boxShadow: '0px 25px 45px -25px rgba(16,185,129,0.45)',
                            }
                      }
                      className="group relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-white/10 p-5 transition-transform"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="relative flex flex-col gap-3">
                        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200/90">
                          {scenario.reductionPercentage}% reduction
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
                            Annual savings
                          </p>
                          <AnimatedNumber
                            value={scenario.annualSavings}
                            formatter={currencyFormatter(0).format}
                            className="text-2xl font-bold text-emerald-200 drop-shadow-[0_12px_30px_rgba(16,185,129,0.35)]"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
                            3-year savings
                          </p>
                          <AnimatedNumber
                            value={scenario.threeYearSavings}
                            formatter={currencyFormatter(0).format}
                            className="text-lg font-semibold text-emerald-100"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="rounded-3xl border border-white/15 bg-white/8 p-6 shadow-2xl backdrop-blur"
                {...sectionMotion}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      Your annual churn loss could fund
                    </h3>
                    <p className="text-sm text-slate-200/70">
                      Put the loss into perspective across growth initiatives.
      </p>
    </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {comparisonStats.map((stat) => (
                    <motion.div
                      key={stat.label}
                      whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.015 }}
                      className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur transition-transform"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                        {stat.label}
                      </p>
                      <div className="mt-3 text-3xl font-semibold text-white">
                        <AnimatedNumber
                          value={stat.value}
                          formatter={(value) =>
                            stat.isPercent
                              ? `${Math.round(value)}%`
                              : numberFormatter.format(Math.round(value))
                          }
                        />
                      </div>
                      <p className="mt-3 text-sm text-white/70">{stat.description}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-transparent p-8 text-center shadow-[0_25px_50px_-25px_rgba(14,165,233,0.45)]"
                {...sectionMotion}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.25),_rgba(14,116,233,0))]" />
                <div className="relative space-y-4">
                  <h3 className="text-2xl font-semibold text-white">Want to stop this revenue leak?</h3>
                  <p className="text-sm text-sky-100/75 sm:text-base">
                    Get a tailored churn reduction roadmap delivered straight to your inbox.
                  </p>
                  <motion.button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-10 py-4 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 hover:scale-[1.03]"
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  >
                    Get My Free Churn Reduction Strategy
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-sm text-white/70"
            >
              <p>
                Run the calculator to see a live breakdown of lost revenue, recovery scenarios, and
                actionable next steps.
              </p>
              <p className="text-xs text-white/50">
                Visuals, savings opportunities, and a personalized strategy will appear here after you submit.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <LeadCaptureModal open={isModalOpen} onClose={closeModal}>
        <EmailCapture />
      </LeadCaptureModal>
    </>
  )
}

type LeadCaptureModalProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const LeadCaptureModal: FC<LeadCaptureModalProps> = ({ open, onClose, children }) => (
  <Transition show={open} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      <Transition.Child
        as={Fragment}
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
      </Transition.Child>

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transition-transform duration-300"
            enterFrom="translate-y-6 opacity-0 scale-95"
            enterTo="translate-y-0 opacity-100 scale-100"
            leave="transition-transform duration-200"
            leaveFrom="translate-y-0 opacity-100 scale-100"
            leaveTo="translate-y-6 opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
              <Dialog.Title className="text-lg font-semibold text-white">
                Get your personalized churn reduction strategy
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-slate-200/80">
                Drop your email and we&apos;ll deliver a playbook tailored to your metrics.
              </Dialog.Description>
              <div className="mt-6">{children}</div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
)

export default ResultsDisplay

