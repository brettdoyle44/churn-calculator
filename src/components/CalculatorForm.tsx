import React, { useMemo } from 'react'
import type { FC, FocusEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Disclosure, Transition } from '@headlessui/react'
import * as Tooltip from '@radix-ui/react-tooltip'

type CalculatorFormValues = {
  averageOrderValue: string
  totalCustomers: number | undefined
  purchaseFrequency: number | undefined
  currentChurnRate: string
  customerAcquisitionCost: string
  grossMargin: string
}

export type CalculatorFormData = {
  averageOrderValue: number
  totalCustomers: number
  purchaseFrequency: number
  currentChurnRate?: number
  customerAcquisitionCost?: number
  grossMargin?: number
}

type CalculatorFormProps = {
  onCalculate: (data: CalculatorFormData) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const formatCurrency = (value: string | number | null | undefined): string => {
  const numeric = typeof value === 'number' ? value : parseCurrency(value)
  if (Number.isNaN(numeric) || numeric === null) return ''
  return currencyFormatter.format(numeric)
}

const parseCurrency = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return NaN
  if (typeof value === 'number') return value
  const stripped = value.replace(/[^\d.]/g, '')
  return stripped ? Number.parseFloat(stripped) : NaN
}

const formatPercentage = (value: string | number | null | undefined): string => {
  const numeric = typeof value === 'number' ? value : parseCurrency(value)
  if (Number.isNaN(numeric) || numeric === null) return ''
  const rounded = Math.round(numeric * 100) / 100
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}%`
}

const InfoIcon: FC = () => (
  <svg
    aria-hidden="true"
    className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25v5.25m0-8.25h.007v.008H11.25V8.25zm.75-5.25a9 9 0 110 18 9 9 0 010-18z"
    />
  </svg>
)

const ChevronIcon: FC<{ open: boolean }> = ({ open }) => (
  <svg
    aria-hidden="true"
    className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

const CalculatorForm: FC<CalculatorFormProps> = ({ onCalculate }) => {
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    trigger,
    setValue,
  } = useForm<CalculatorFormValues>({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      averageOrderValue: '',
      totalCustomers: undefined,
      purchaseFrequency: 2,
      currentChurnRate: '',
      customerAcquisitionCost: '',
      grossMargin: '',
    },
  })

  const watchedValues = watch()
  const completionPercentage = useMemo(() => {
    const fieldKeys: Array<keyof CalculatorFormValues> = [
      'averageOrderValue',
      'totalCustomers',
      'purchaseFrequency',
      'currentChurnRate',
      'customerAcquisitionCost',
      'grossMargin',
    ]
    const filled = fieldKeys.reduce((count, key) => {
      const value = watchedValues[key]
      if (value === undefined || value === null) return count
      if (typeof value === 'number') return value > 0 ? count + 1 : count
      return value.trim() ? count + 1 : count
    }, 0)
    return Math.round((filled / fieldKeys.length) * 100)
  }, [watchedValues])

  const setChurnAverage = () => {
    setValue('currentChurnRate', '75', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    void trigger('currentChurnRate')
  }

  const normalizeAndSubmit = (values: CalculatorFormValues) => {
    const payload: CalculatorFormData = {
      averageOrderValue: parseCurrency(values.averageOrderValue),
      totalCustomers: values.totalCustomers ?? 0,
      purchaseFrequency: values.purchaseFrequency ?? 0,
    }

    const churnRate = parseCurrency(values.currentChurnRate)
    if (!Number.isNaN(churnRate)) {
      payload.currentChurnRate = churnRate
    }

    const cac = parseCurrency(values.customerAcquisitionCost)
    if (!Number.isNaN(cac)) {
      payload.customerAcquisitionCost = cac
    }

    const margin = parseCurrency(values.grossMargin)
    if (!Number.isNaN(margin)) {
      payload.grossMargin = margin
    }

    onCalculate(payload)
  }

  const handleCurrencyFocus = (event: FocusEvent<HTMLInputElement>, fieldName: keyof CalculatorFormValues) => {
    const rawValue = event.target.value
    if (rawValue) {
      const numeric = parseCurrency(rawValue)
      if (!Number.isNaN(numeric)) {
        setValue(fieldName, numeric.toString(), { shouldDirty: true })
      }
    }
  }

  const handleCurrencyBlur = async (fieldName: keyof CalculatorFormValues) => {
    const value = watchedValues[fieldName]
    if (typeof value === 'string') {
      const formatted = formatCurrency(value)
      setValue(fieldName, formatted, { shouldDirty: true })
    }
    await trigger(fieldName)
  }

  const handlePercentageFocus = (event: FocusEvent<HTMLInputElement>, fieldName: keyof CalculatorFormValues) => {
    const rawValue = event.target.value
    if (rawValue) {
      const numeric = parseCurrency(rawValue)
      if (!Number.isNaN(numeric)) {
        setValue(fieldName, numeric.toString(), { shouldDirty: true })
      }
    }
  }

  const handlePercentageBlur = async (fieldName: keyof CalculatorFormValues) => {
    const value = watchedValues[fieldName]
    if (typeof value === 'string') {
      const formatted = formatPercentage(value)
      setValue(fieldName, formatted, { shouldDirty: true })
    }
    await trigger(fieldName)
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <form
        className="relative w-full rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur transition-shadow duration-500 hover:shadow-2xl sm:p-8"
        noValidate
        onSubmit={handleSubmit(normalizeAndSubmit)}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Churn Calculator</h2>
            <p className="text-sm text-slate-500 sm:text-base">
              Plug in your metrics to discover potential revenue loss from churn.
            </p>
          </div>
          <div className="hidden h-16 w-16 animate-pulse items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-600 sm:flex">
            {completionPercentage}%
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 sm:hidden">
          <div className="h-12 w-12 animate-pulse rounded-full bg-sky-50 text-center text-sm font-semibold leading-[3rem] text-sky-600">
            {completionPercentage}%
          </div>
          <p className="text-xs text-slate-500">
            Fields completed
          </p>
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-400 transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <fieldset className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="averageOrderValue"
            rules={{
              required: 'Average order value is required.',
              validate: value => {
                const numeric = parseCurrency(value)
                if (Number.isNaN(numeric)) return 'Enter a valid dollar amount.'
                if (numeric < 1) return 'Must be at least $1.'
                return true
              },
            }}
            render={({ field }) => (
              <Field
                error={errors.averageOrderValue?.message}
                label="Average Order Value ($)"
                onBlur={() => handleCurrencyBlur('averageOrderValue')}
                onFocus={event => handleCurrencyFocus(event, 'averageOrderValue')}
                tooltip="Average revenue per order. Use your most recent quarter for best accuracy."
              >
                <input
                  {...field}
                  className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
                  inputMode="decimal"
                  placeholder="$1,000"
                  onChange={event => field.onChange(event.target.value)}
                />
              </Field>
            )}
          />

          <Field
            error={errors.totalCustomers?.message}
            label="Total Customers"
            tooltip="Current number of active customers. Include subscribers and recurring buyers."
          >
            <input
              {...register('totalCustomers', {
                required: 'Total customers is required.',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Must be at least 1 customer.',
                },
                onBlur: () => {
                  void trigger('totalCustomers')
                },
              })}
              className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
              min={1}
              placeholder="1,000"
              step={1}
              type="number"
            />
          </Field>

          <Field
            error={errors.purchaseFrequency?.message}
            label="Purchase Frequency (per year)"
            tooltip="How many times the average customer purchases per year."
          >
            <input
              {...register('purchaseFrequency', {
                required: 'Purchase frequency is required.',
                valueAsNumber: true,
                min: {
                  value: 1,
                  message: 'Must be at least 1 purchase per year.',
                },
                onBlur: () => {
                  void trigger('purchaseFrequency')
                },
              })}
              className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
              min={1}
              placeholder="2"
              step={0.1}
              type="number"
            />
          </Field>

          <Controller
            control={control}
            name="currentChurnRate"
            rules={{
              validate: value => {
                if (!value.trim()) return true
                const numeric = parseCurrency(value)
                if (Number.isNaN(numeric)) return 'Enter a valid percentage.'
                if (numeric < 0 || numeric > 100) return 'Use a percentage between 0 and 100.'
                return true
              },
            }}
            render={({ field }) => (
              <Field
                error={errors.currentChurnRate?.message}
                label="Current Churn Rate (%)"
                helper={
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700"
                    onClick={event => {
                      event.preventDefault()
                      setChurnAverage()
                    }}
                    type="button"
                  >
                    Don&apos;t know your churn rate? <span className="underline decoration-dotted">Use 75% industry average ↗</span>
                  </button>
                }
                onBlur={() => handlePercentageBlur('currentChurnRate')}
                onFocus={event => handlePercentageFocus(event, 'currentChurnRate')}
                tooltip="Percentage of customers who stop buying or cancel each period."
              >
                <input
                  {...field}
                  className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
                  inputMode="decimal"
                  placeholder="Don't know? We'll use 75%"
                />
              </Field>
            )}
          />
        </fieldset>

        <Disclosure>
          {({ open }) => (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6">
              <Disclosure.Button className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-sky-200 sm:text-base">
                <div>
                  Advanced assumptions
                  <p className="mt-1 text-xs font-normal text-slate-400 sm:text-sm">
                    Add acquisition cost and margin to personalize projections.
      </p>
    </div>
                <ChevronIcon open={open} />
              </Disclosure.Button>
              <Transition
                enter="transition duration-300 ease-out"
                enterFrom="transform scale-y-95 opacity-0"
                enterTo="transform scale-y-100 opacity-100"
                leave="transition duration-200 ease-in"
                leaveFrom="transform scale-y-100 opacity-100"
                leaveTo="transform scale-y-95 opacity-0"
              >
                <Disclosure.Panel className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="customerAcquisitionCost"
                    rules={{
                      validate: value => {
                        if (!value.trim()) return true
                        const numeric = parseCurrency(value)
                        if (Number.isNaN(numeric)) return 'Enter a valid dollar amount.'
                        if (numeric < 0) return 'Must be zero or greater.'
                        return true
                      },
                    }}
                    render={({ field }) => (
                      <Field
                        error={errors.customerAcquisitionCost?.message}
                        label="Customer Acquisition Cost ($)"
                        onBlur={() => handleCurrencyBlur('customerAcquisitionCost')}
                        onFocus={event => handleCurrencyFocus(event, 'customerAcquisitionCost')}
                        tooltip="Average spend to acquire one new customer, including marketing and sales."
                      >
                        <input
                          {...field}
                          className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
                          inputMode="decimal"
                          placeholder="$250"
                          onChange={event => field.onChange(event.target.value)}
                        />
                      </Field>
                    )}
                  />

                  <Controller
                    control={control}
                    name="grossMargin"
                    rules={{
                      validate: value => {
                        if (!value.trim()) return true
                        const numeric = parseCurrency(value)
                        if (Number.isNaN(numeric)) return 'Enter a valid percentage.'
                        if (numeric < 0 || numeric > 100) return 'Percentage must be between 0 and 100.'
                        return true
                      },
                    }}
                    render={({ field }) => (
                      <Field
                        error={errors.grossMargin?.message}
                        label="Gross Margin (%)"
                        onBlur={() => handlePercentageBlur('grossMargin')}
                        onFocus={event => handlePercentageFocus(event, 'grossMargin')}
                        tooltip="Your gross profit margin percentage. Use blended margin if you sell multiple products."
                      >
                        <input
                          {...field}
                          className="peer h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-200 sm:h-14 sm:text-lg"
                          inputMode="decimal"
                          placeholder="65%"
                          onChange={event => field.onChange(event.target.value)}
                        />
                      </Field>
                    )}
                  />
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 sm:text-base">
            We&apos;ll crunch the numbers and show how much churn is costing your business.
          </p>
          <button
            className="flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:h-16 sm:w-auto sm:px-12 sm:text-lg"
            disabled={!isValid}
            type="submit"
          >
            Calculate My Revenue Loss
          </button>
        </div>
      </form>
    </Tooltip.Provider>
  )
}

type FieldProps = {
  label: string
  tooltip: string
  error?: string
  children: React.ReactNode
  onBlur?: () => void
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  helper?: React.ReactNode
}

const Field: FC<FieldProps> = ({ label, tooltip, error, children, onBlur, onFocus, helper }) => {
  const child = React.Children.only(children) as React.ReactElement<
    React.InputHTMLAttributes<HTMLInputElement>
  >

  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 sm:text-base">{label}</span>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              className="group inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-400 transition-all hover:border-sky-200 hover:text-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
              type="button"
            >
              <InfoIcon />
              <span className="sr-only">{`More info about ${label}`}</span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              align="start"
              className="max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-lg"
              side="top"
              sideOffset={8}
            >
              {tooltip}
              <Tooltip.Arrow className="fill-white" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
      {React.cloneElement(child, {
        onBlur: (event: FocusEvent<HTMLInputElement>) => {
          child.props.onBlur?.(event)
          onBlur?.()
        },
        onFocus: (event: FocusEvent<HTMLInputElement>) => {
          child.props.onFocus?.(event)
          onFocus?.(event)
        },
      })}
      {helper}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
    </label>
  )
}

export default CalculatorForm

