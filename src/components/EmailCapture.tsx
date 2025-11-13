import type { FC } from 'react'

const EmailCapture: FC = () => {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow">
      <form className="flex flex-col gap-3 md:flex-row md:items-center">
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email to get the report"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-disabled
        />
        <button
          type="button"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled
        >
          Coming Soon
        </button>
      </form>
    </div>
  )
}

export default EmailCapture

