import { useState } from 'react'

import CalculatorForm, { type CalculatorFormData } from './components/CalculatorForm'
import EmailCapture from './components/EmailCapture'
import ProgressIndicator from './components/ProgressIndicator'
import ResultsDisplay from './components/ResultsDisplay'
import { calculateCalculatorResults } from './utils/calculations'
import type { CalculatorResults } from './types/calculator.types'

function App() {
  const [results, setResults] = useState<CalculatorResults | null>(null)

  const handleCalculate = (data: CalculatorFormData) => {
    const churnRate = data.currentChurnRate ?? 75

    const computedResults = calculateCalculatorResults({
      averageOrderValue: data.averageOrderValue,
      numberOfCustomers: data.totalCustomers,
      purchaseFrequency: data.purchaseFrequency,
      churnRate,
      customerAcquisitionCost: data.customerAcquisitionCost,
      grossMargin: data.grossMargin,
    })

    setResults(computedResults)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] translate-x-1/3 translate-y-1/3 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid gap-12 lg:grid-cols-[1.4fr,1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex max-w-max items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 shadow-sm backdrop-blur">
              Shopify lead magnet
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl sm:leading-tight lg:text-6xl">
              How much is customer churn really costing your store?
            </h1>
            <p className="max-w-xl text-base text-slate-200 sm:text-lg">
              Uncover the hidden revenue leaks from lost subscribers and repeat buyers. Use our
              calculator to quantify churn, model recovery scenarios, and prioritize the biggest
              retention wins across your Shopify store.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent/20 font-semibold text-accent">
                  ✓
                </span>
                Interactive charts powered by live churn modeling
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent/20 font-semibold text-accent">
                  ✓
                </span>
                Personalized roadmap delivered straight to your inbox
              </div>
            </div>
            <EmailCapture />
            <p className="text-xs text-slate-400">
              We respect your inbox. Get the churn insights instantly—unsubscribe any time.
            </p>
          </div>

          <ProgressIndicator />
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.4fr,1fr]">
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-white">Plug in your metrics</h2>
            <p className="text-sm text-slate-300">
              Add your current revenue metrics, churn rate, and retention initiatives to see where
              the leaks are—and how much more you could capture with targeted improvements.
            </p>
            <CalculatorForm onCalculate={handleCalculate} />
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-white">Preview your results</h2>
            <p className="text-sm text-slate-300">
              We will visualize lost revenue, recovered growth scenarios, and recommended actions.
              Save the full playbook as a PDF or sync it to your CRM when you are ready.
            </p>
            <ResultsDisplay results={results} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
