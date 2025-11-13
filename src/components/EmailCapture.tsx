import { Dialog, Transition } from '@headlessui/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { FC, ReactNode } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { submitLeadCapture } from '../utils/hubspot'

type EmailCaptureFormValues = {
  email: string
  storeName: string
  retentionChallenge?: string
}

type TriggerRenderProps = {
  open: () => void
  isOpen: boolean
}

type EmailCaptureProps = {
  /**
   * Optional render prop to place a trigger element in the UI.
   * When provided, the component manages its own open state.
   */
  trigger?: (props: TriggerRenderProps) => ReactNode
  /**
   * String describing where the modal was launched from.
   * Included in the submission metadata.
   */
  context?: string
}

const EMAIL_REGEX =
  // RFC 5322 compliant enough for UI validation
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const confettiPalette = ['#38bdf8', '#f97316', '#22c55e', '#c084fc', '#facc15']

const deliverables = [
  'Personalized churn analysis PDF',
  'Industry benchmarking report',
  '5 Quick-Win retention tactics',
  'Early access to ChurnGuard beta',
]

type ConfettiPiece = {
  id: number
  delay: number
  offsetX: number
  drift: number
  color: string
  duration: number
  rotate: number
}

const baseConfettiPieces: ConfettiPiece[] = [
  { id: 0, delay: 0, offsetX: -120, drift: -30, color: confettiPalette[0], duration: 1.6, rotate: -12 },
  { id: 1, delay: 0.05, offsetX: -80, drift: 24, color: confettiPalette[1], duration: 1.5, rotate: 24 },
  { id: 2, delay: 0.1, offsetX: -40, drift: -18, color: confettiPalette[2], duration: 1.8, rotate: -45 },
  { id: 3, delay: 0.15, offsetX: 0, drift: 28, color: confettiPalette[3], duration: 1.7, rotate: 60 },
  { id: 4, delay: 0.18, offsetX: 40, drift: -25, color: confettiPalette[4], duration: 1.55, rotate: -90 },
  { id: 5, delay: 0.22, offsetX: 80, drift: 32, color: confettiPalette[0], duration: 1.65, rotate: 120 },
  { id: 6, delay: 0.26, offsetX: 120, drift: -20, color: confettiPalette[1], duration: 1.9, rotate: -140 },
  { id: 7, delay: 0.3, offsetX: -100, drift: 20, color: confettiPalette[2], duration: 1.45, rotate: 45 },
  { id: 8, delay: 0.34, offsetX: -60, drift: -26, color: confettiPalette[3], duration: 1.75, rotate: -70 },
  { id: 9, delay: 0.38, offsetX: -20, drift: 30, color: confettiPalette[4], duration: 1.6, rotate: 90 },
  { id: 10, delay: 0.42, offsetX: 20, drift: -18, color: confettiPalette[0], duration: 1.7, rotate: -110 },
  { id: 11, delay: 0.46, offsetX: 60, drift: 26, color: confettiPalette[1], duration: 1.8, rotate: 130 },
  { id: 12, delay: 0.5, offsetX: 100, drift: -22, color: confettiPalette[2], duration: 1.55, rotate: -160 },
  { id: 13, delay: 0.54, offsetX: 140, drift: 24, color: confettiPalette[3], duration: 1.85, rotate: 160 },
]

const EmailCapture: FC<EmailCaptureProps> = ({ trigger, context = 'email_capture_modal' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const initialFocusRef = useRef<HTMLInputElement | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailCaptureFormValues>({
    mode: 'onBlur',
    defaultValues: {
      email: '',
      storeName: '',
      retentionChallenge: '',
    },
  })

  const openModal = () => {
    reset()
    setSubmissionError(null)
    setIsSuccess(false)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setSubmissionError(null)
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  const emailField = register('email', {
    required: 'Email is required.',
    pattern: {
      value: EMAIL_REGEX,
      message: 'Enter a valid email address.',
    },
    setValueAs: (value) => (typeof value === 'string' ? value.trim() : value),
  })

  const storeNameField = register('storeName', {
    required: 'Store name is required.',
    minLength: {
      value: 2,
      message: 'Store name must be at least 2 characters.',
    },
    setValueAs: (value) => (typeof value === 'string' ? value.trim() : value),
  })

  const retentionField = register('retentionChallenge', {
    setValueAs: (value) => (typeof value === 'string' ? value.trim() : value),
  })

  const confettiPieces = isSuccess && !prefersReducedMotion ? baseConfettiPieces : []

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionError(null)

    try {
      await submitLeadCapture({
        email: values.email,
        company: values.storeName,
        metadata: {
          source: context,
          retentionChallenge: values.retentionChallenge || undefined,
        },
      })

      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to submit email capture lead:', error)
      setSubmissionError(
        'We hit a snag saving your details. Please try again or email hello@churnguard.ai.',
      )
    }
  })

  return (
    <>
      {trigger ? trigger({ open: openModal, isOpen }) : null}

      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={closeModal}
          initialFocus={initialFocusRef}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0 translate-y-6 scale-95"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="transition ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-4 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 px-6 pb-8 pt-7 shadow-[0_32px_80px_-32px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:px-10 sm:pb-10 sm:pt-9">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    aria-label="Close email capture modal"
                  >
                    ×
                  </button>

                  <Dialog.Title className="text-2xl font-semibold text-white sm:text-3xl">
                    Get Your Detailed Churn Analysis Report
                  </Dialog.Title>
                  <Dialog.Description className="mt-3 text-sm text-slate-200/80 sm:text-base">
                    Plus: 5 proven strategies to reduce churn by 25%+ in 90 days
                  </Dialog.Description>

                  <div className="mt-6 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                      What&apos;s inside
                    </h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {deliverables.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100/90 shadow-sm"
                        >
                          <span className="text-lg text-sky-300">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <AnimatePresence mode="wait">
                    {isSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="relative mt-8 overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-center text-slate-100 shadow-inner"
                      >
                        {!prefersReducedMotion && (
                          <div className="pointer-events-none absolute inset-0">
                            {confettiPieces.map((piece) => (
                              <motion.span
                                key={piece.id}
                                className="absolute block h-2 w-2 rounded-sm"
                                style={{
                                  backgroundColor: piece.color,
                                  left: '50%',
                                  top: '10%',
                                }}
                                initial={{
                                  opacity: 0,
                                  x: piece.offsetX,
                                  y: -20,
                                  rotate: 0,
                                }}
                                animate={{
                                  opacity: [0, 1, 0],
                                  y: [ -20, 140 ],
                                  x: [piece.offsetX, piece.offsetX + piece.drift],
                                  rotate: piece.rotate,
                                }}
                                transition={{
                                  duration: piece.duration,
                                  delay: piece.delay,
                                  ease: 'easeOut',
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.35, delay: 0.1 }}
                          className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-400/20 text-3xl text-emerald-200 shadow-md"
                        >
                          🎉
                        </motion.div>
                        <h4 className="mt-4 text-xl font-semibold text-white">
                          Report En Route!
                        </h4>
                        <p className="mt-2 text-sm text-emerald-100/80">
                          We&apos;ve sent the detailed churn analysis and quick-win playbook to your inbox.
                        </p>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="mt-6 inline-flex items-center justify-center rounded-full bg-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          Back to the calculator
                        </button>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="mt-8 space-y-5"
                        onSubmit={onSubmit}
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2 sm:col-span-2">
                            <label htmlFor="email" className="text-sm font-medium text-slate-200">
                              Email Address<span className="text-rose-400">*</span>
                            </label>
                            <input
                              id="email"
                              type="email"
                              autoComplete="email"
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                              placeholder="you@brand.com"
                              {...emailField}
                              ref={(element) => {
                                emailField.ref(element)
                                if (element) {
                                  initialFocusRef.current = element
                                }
                              }}
                              aria-invalid={Boolean(errors.email)}
                            />
                            {errors.email && (
                              <p className="text-xs font-medium text-rose-300">
                                {errors.email.message}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <label htmlFor="storeName" className="text-sm font-medium text-slate-200">
                              Store Name<span className="text-rose-400">*</span>
                            </label>
                            <input
                              id="storeName"
                              type="text"
                              autoComplete="organization"
                              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                              placeholder="ChurnGuard Co."
                              {...storeNameField}
                              aria-invalid={Boolean(errors.storeName)}
                            />
                            {errors.storeName && (
                              <p className="text-xs font-medium text-rose-300">
                                {errors.storeName.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor="retentionChallenge"
                            className="text-sm font-medium text-slate-200"
                          >
                            What&apos;s your #1 retention challenge?{' '}
                            <span className="text-slate-400">(optional)</span>
                          </label>
                          <textarea
                            id="retentionChallenge"
                            rows={3}
                            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                            placeholder="Tell us what you’re battling most with churn right now..."
                            {...retentionField}
                          />
                        </div>

                        {submissionError && (
                          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-200">
                            {submissionError}
                          </p>
                        )}

                        <div className="flex flex-col gap-4">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmitting ? (
                              <>
                                <span className="inline-flex size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Sending...
                              </>
                            ) : (
                              'Send Me The Report'
                            )}
                          </button>
                          <p className="text-xs text-slate-300">
                            By submitting, you agree to receive marketing emails. Unsubscribe anytime.{' '}
                            <a
                              href="/privacy"
                              className="font-semibold text-sky-300 underline-offset-2 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Privacy policy
                            </a>
                            .
                          </p>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default EmailCapture

