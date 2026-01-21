'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'
import { HelpCircle, LayoutGrid, ShoppingCart, Store, FileText } from 'lucide-react'

interface BusinessOption {
  value: string
  label: string
  meta?: Record<string, any>
}

export default function BusinessTypePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/brand/approximatebudget')
  const [options, setOptions] = useState<BusinessOption[]>([])
  const [loading, setLoading] = useState(false)

  const iconMap: Record<string, any> = useMemo(
    () => ({
      document: FileText,
      cart: ShoppingCart,
      grid: LayoutGrid,
      store: Store,
      help: HelpCircle,
    }),
    []
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const [meRes, optionsRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('brand', 'business_types'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const profile = user.brandProfile || {}
        const items = Array.isArray(optionsRes) ? optionsRes : []
        setOptions(items)
        if (profile.businessType) {
          const match = items.find(
            (opt: any) =>
              String(opt.value).toLowerCase() === String(profile.businessType).toLowerCase() ||
              String(opt.label || '').toLowerCase() === String(profile.businessType).toLowerCase()
          )
          setSelected(match?.value || profile.businessType)
        }
        setBackHref(getRouteForStep(user.role, 4) || '/brand/approximatebudget')
      } catch {
        if (active) setBackHref('/brand/approximatebudget')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleContinue = async () => {
    if (!selected) return

    try {
      setSaving(true)

      await apiFetch('/api/brand/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          business_type: selected,
          onboardingStep: 5,
        }),
      })

      router.push('/brand/selectinfluencer')
    } catch (e: any) {
      alert(e?.message || 'Failed to save business type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 py-8 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6 text-left">
          What type of business are you?
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading options...</div>
          ) : (
            options.map((opt) => {
              const iconKey = String(opt.meta?.icon || '').toLowerCase()
              const Icon = iconMap[iconKey] || HelpCircle
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors duration-150 ${
                    selected === opt.value
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-zinc-900'
                      : 'border-gray-300 dark:border-zinc-800 hover:border-indigo-400'
                  }`}
                  onClick={() => setSelected(opt.value)}
                >
                  <input
                    type="radio"
                    name="business_type"
                    value={opt.value}
                    checked={selected === opt.value}
                    onChange={() => setSelected(opt.value)}
                    className="sr-only"
                  />
                  <span className="shrink-0">
                    <Icon className="w-6 h-6 text-indigo-600" />
                  </span>
                  <span className="text-gray-700 dark:text-zinc-200 font-medium">
                    {opt.label || opt.value}
                  </span>
                </label>
              )
            })
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
      </div>
    </div>
  )
}
