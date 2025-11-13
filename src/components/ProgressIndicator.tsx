import type { FC } from 'react'

const stepLabels = ['Input metrics', 'Review impact', 'Download plan']

const ProgressIndicator: FC = () => {
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Preview
      </div>
      <div className="flex flex-col gap-3">
        {stepLabels.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-xs text-slate-500">Detailed guidance coming soon.</p>
            </div>
          </div>
        ))}
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className="h-full w-1/3 rounded-full bg-accent transition-all duration-700 ease-out" />
      </div>
    </div>
  )
}

export default ProgressIndicator

