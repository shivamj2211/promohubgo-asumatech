'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

interface BudgetOption {
  value: string
  label: string
}

export default function BudgetPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/brand/heretodo')
  const [options, setOptions] = useState<BudgetOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const [meRes, optionsRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('brand', 'approx_budgets'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const profile = user.brandProfile || {}
        const items = Array.isArray(optionsRes) ? optionsRes : []
        setOptions(items)
        if (profile.approxBudget) {
          const match = items.find(
            (opt: any) =>
              String(opt.value).toLowerCase() === String(profile.approxBudget).toLowerCase() ||
              String(opt.label || '').toLowerCase() === String(profile.approxBudget).toLowerCase()
          )
          setSelected(match?.value || profile.approxBudget)
        }
        setBackHref(getRouteForStep(user.role, 3) || '/brand/heretodo')
      } catch {
        if (active) setBackHref('/brand/heretodo')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const goNext = () => router.push('/brand/businesstype')

  const handleContinue = async () => {
    if (!selected) return

    try {
      setSaving(true)

      await apiFetch('/api/brand/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          approx_budget: selected,
          onboardingStep: 4,
        }),
      })

      goNext()
    } catch (e: any) {
      alert(e?.message || 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    try {
      setSaving(true)

      await apiFetch('/api/brand/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          approx_budget: null,
          onboardingStep: 4,
        }),
      })

      goNext()
    } catch (e: any) {
      alert(e?.message || 'Failed to skip budget')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 py-8 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6 text-left">
          What is your approximate budget for this campaign?
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading options...</div>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center border rounded-lg px-4 py-3 cursor-pointer transition-colors duration-150 ${
                  selected === opt.value
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-zinc-900'
                    : 'border-gray-300 dark:border-zinc-800 hover:border-indigo-400'
                }`}
                onClick={() => setSelected(opt.value)}
              >
                <input
                  type="radio"
                  name="budget"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="sr-only"
                />
                <span className="w-4 h-4 mr-3 inline-block border rounded-full flex items-center justify-center">
                  {selected === opt.value && (
                    <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                  )}
                </span>
                <span className="text-gray-700 dark:text-zinc-200 font-medium">
                  {opt.label || opt.value}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <a href={backHref} className="text-gray-500 dark:text-zinc-400 hover:underline">
            Back
          </a>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className={`mt-4 w-full py-3 text-white font-semibold rounded-lg transition ${
            selected && !saving
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="w-full mt-3 py-2 text-indigo-600 font-medium hover:underline disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
