'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ✅ Add this import
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'

export default function ContentTypePage() {
  const [categories, setCategories] = useState<Array<{ value: string; label: string }>>([])

  const [selected, setSelected] = useState<string[]>([])
  const [warning, setWarning] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetchValues('influencer', 'categories')
        if (!active) return
        const items = Array.isArray(res) ? res : []
        setCategories(items)
      } catch {
        if (active) setCategories([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const toggleCategory = (item: string) => {
    if (selected.includes(item)) {
      setSelected((prev) => prev.filter((c) => c !== item))
      setWarning('')
    } else if (selected.length < 5) {
      setSelected((prev) => [...prev, item])
      setWarning('')
    } else {
      setWarning('You can select up to 5 categories only.')
    }
  }

  // ✅ NEW handler
  const handleContinue = async () => {
    if (selected.length === 0) return

    try {
      setSaving(true)

      await apiFetch('/api/influencer/categories', {
        method: 'PUT',
        body: JSON.stringify({
          categories: selected,
        }),
      })

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('onboardingContentTypes', JSON.stringify(selected))
      }

      router.push('/social-media')
    } catch (e: any) {
      alert(e?.message || 'Failed to save categories')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div className="h-full bg-pink-300" style={{ width: '55%' }} />
      </div>

      <div className="max-w-xl mx-auto w-full px-4 pb-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mt-4 mb-6">
          <Link
            href="/profile"
            className="flex items-center text-sm text-gray-700"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Link>

          <button className="px-3 py-1.5 rounded-full border text-xs font-medium text-gray-800 bg-gray-100">
            View Example Profile
          </button>

          <div className="w-5" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          What kind of content do you post?
        </h1>

        {/* Warning Message */}
        {warning && (
          <p className="text-red-500 text-sm mb-4">{warning}</p>
        )}

        {/* Category List */}
        <div className="space-y-3 overflow-y-auto flex-1 pb-20">
          {loading ? (
            <div className="text-sm text-gray-500">Loading categories...</div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`
                  w-full border rounded-2xl px-4 py-4 text-left text-sm font-medium
                  ${selected.includes(cat.value)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-800 border-gray-200'}
                `}
              >
                {cat.label || cat.value}
              </button>
            ))
          )}
        </div>

        {/* Continue Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="max-w-xl mx-auto">
            <Button
              onClick={handleContinue}
              disabled={selected.length === 0 || saving}
              className="w-full py-3 rounded-full bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
