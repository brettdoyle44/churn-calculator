import type { FC } from 'react'

const ResultsDisplay: FC = () => {
  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-md backdrop-blur">
      <p className="text-sm text-slate-500">
        Results will appear here with visualizations and savings opportunities once you
        submit the calculator.
      </p>
    </div>
  )
}

export default ResultsDisplay

