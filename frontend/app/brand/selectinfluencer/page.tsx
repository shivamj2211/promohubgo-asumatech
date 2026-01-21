'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

interface Category {
  value: string
  label: string
}

export default function InfluencerTypePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/brand/businesstype')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const [meRes, categoriesRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('brand', 'categories'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const existing = Array.isArray(user.brandCategories) ? user.brandCategories : []
        const items = Array.isArray(categoriesRes) ? categoriesRes : []
        setCategories(items)
        if (existing.length) {
          const normalized = existing.map((c: any) => String(c.key))
          const mapped = normalized.map((key: string) => {
            const match = items.find(
              (opt: any) =>
                String(opt.value).toLowerCase() === key.toLowerCase() ||
                String(opt.label || '').toLowerCase() === key.toLowerCase()
            )
            return match?.value || key
          })
          setSelected(mapped)
        }
        setBackHref(getRouteForStep(user.role, 5) || '/brand/businesstype')
      } catch {
        if (active) setBackHref('/brand/businesstype')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const toggleCategory = (value: string) => {
    if (selected.includes(value)) {
      setSelected((prev) => prev.filter((v) => v !== value))
      setError('')
      return
    }
    if (selected.length >= 3) {
      setError('You can select a maximum of three categories.')
      return
    }
    setSelected((prev) => [...prev, value])
    setError('')
  }

  const handleContinue = async () => {
    if (selected.length === 0) return

    try {
      setSaving(true)

      await apiFetch('/api/brand/categories', {
        method: 'PUT',
        body: JSON.stringify({
          categories: selected,
          onboardingStep: 6,
        }),
      })

      router.push('/brand/targetplatforms')
    } catch (e: any) {
      alert(e?.message || 'Failed to save categories')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 py-8 px-4">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-lg shadow-lg p-8">
        <JourneyStepper />

        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6 text-left">
          What type of influencers are you looking for?
        </h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-zinc-400">Loading categories...</div>
          ) : (
            categories.map((cat) => {
              const isActive = selected.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`px-4 py-3 border rounded-lg text-left transition-colors duration-150 ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-zinc-900'
                      : 'border-gray-300 dark:border-zinc-800 hover:border-indigo-400'
                  }`}
                >
                  <span className="text-gray-700 dark:text-zinc-200 font-medium">
                    {cat.label || cat.value}
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
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
