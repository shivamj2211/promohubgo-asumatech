'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

interface PlatformOption {
  value: string
  label: string
}

export default function PlatformTargetPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/brand/selectinfluencer')
  const [options, setOptions] = useState<PlatformOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const [meRes, optionsRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('brand', 'target_platforms'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const existing = Array.isArray(user.brandPlatforms) ? user.brandPlatforms : []
        const items = Array.isArray(optionsRes) ? optionsRes : []
        setOptions(items)
        if (existing.length) {
          const normalized = existing.map((p: any) => String(p.key))
          const mapped = normalized.map((key) => {
            const match = items.find(
              (opt: any) =>
                String(opt.value).toLowerCase() === key.toLowerCase() ||
                String(opt.label || '').toLowerCase() === key.toLowerCase()
            )
            return match?.value || key
          })
          setSelected(mapped)
        }
        setBackHref(getRouteForStep(user.role, 6) || '/brand/selectinfluencer')
      } catch {
        if (active) setBackHref('/brand/selectinfluencer')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const togglePlatform = (value: string) => {
    if (selected.includes(value)) {
      setSelected((prev) => prev.filter((v) => v !== value))
    } else {
      setSelected((prev) => [...prev, value])
    }
  }

  const handleContinue = async () => {
    if (selected.length === 0) return

    try {
      setSaving(true)

      await apiFetch('/api/brand/platforms', {
        method: 'PUT',
        body: JSON.stringify({
          platforms: selected,
          onboardingStep: 7,
        }),
      })

      router.push('/summary')
    } catch (e: any) {
      alert(e?.message || 'Failed to save platforms')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 py-8 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6 text-left">
          What platform are you targeting?
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading options...</div>
          ) : (
            options.map((opt) => {
              const isActive = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePlatform(opt.value)}
                  className={`w-full text-left px-4 py-3 border rounded-lg transition-colors duration-150 ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-zinc-900'
                      : 'border-gray-300 dark:border-zinc-800 hover:border-indigo-400'
                  }`}
                >
                  <span className="text-gray-700 dark:text-zinc-200 font-medium">
                    {opt.label || opt.value}
                  </span>
                </button>
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
          disabled={selected.length === 0 || saving}
          className={`mt-4 w-full py-3 text-white font-semibold rounded-lg transition ${
            selected.length > 0 && !saving
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? 'Finishing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
