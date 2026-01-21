'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

export default function DescriptionPage() {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [hintOptions, setHintOptions] = useState<
    Array<{ label?: string; value?: string; meta?: any }>
  >([])
  const [placeholder, setPlaceholder] = useState('')
  const WORD_LIMIT = 200
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/social-media')

  const countWords = (text: string): number => {
    if (!text.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  const wordCount = useMemo(() => countWords(description), [description])

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (countWords(value) <= WORD_LIMIT) {
      setDescription(value)
    }
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [meRes, hintsRes, placeholderRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('influencer', 'profile_hints'),
          fetchValues('influencer', 'profile_description_placeholder'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const profile = user.influencerProfile || {}
        if (profile.description) setDescription(profile.description)
        const hints = Array.isArray(hintsRes) ? hintsRes : []
        setHintOptions(hints)
        const placeholderItem = Array.isArray(placeholderRes) ? placeholderRes[0] : null
        if (placeholderItem?.label || placeholderItem?.value) {
          setPlaceholder(String(placeholderItem.label || placeholderItem.value))
        }
        setBackHref(getRouteForStep(user.role, 3) || '/social-media')
      } catch {
        if (active) setBackHref('/social-media')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let selected: string[] = []
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('onboardingContentTypes')
      if (raw) {
        try {
          selected = JSON.parse(raw)
        } catch {
          selected = []
        }
      }
    }

    const normalized = selected.map((item) => String(item).toLowerCase())
    const matches = hintOptions.filter((hint) => {
      const meta = hint.meta || {}
      if (Array.isArray(meta.categories) && meta.categories.length) {
        return meta.categories.some((cat: string) =>
          normalized.includes(String(cat).toLowerCase())
        )
      }
      return Boolean(meta.generic)
    })

    const fallback = hintOptions.filter((hint) => Boolean(hint.meta?.generic))
    const chosen = matches.length ? matches : fallback
    setSuggestions(
      chosen.map((hint) => String(hint.label || hint.value || '')).filter(Boolean)
    )
  }, [hintOptions])

  const handleSuggestionClick = (text: string) => {
    if (countWords(text) <= WORD_LIMIT) {
      setDescription(text)
    } else {
      const words = text.trim().split(/\s+/).slice(0, WORD_LIMIT)
      setDescription(words.join(' '))
    }
  }

  const handleContinue = async () => {
    if (!description.trim() || wordCount === 0 || wordCount > WORD_LIMIT) return

    try {
      setSaving(true)

      await apiFetch('/api/influencer/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          description: description.trim(),
          onboardingStep: 4,
        }),
      })

      router.push('/summary')
    } catch (e: any) {
      alert(e?.message || 'Failed to save description')
    } finally {
      setSaving(false)
    }
  }

  const isDisabled =
    saving || !description.trim() || wordCount === 0 || wordCount > WORD_LIMIT

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 pt-6">
        <JourneyStepper />
      </div>

      <div className="max-w-xl mx-auto w-full px-4 pb-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mt-4 mb-6">
          <Link
            href={backHref}
            className="flex items-center text-sm text-gray-700 dark:text-zinc-300"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Link>

          <button className="px-3 py-1.5 rounded-full border text-xs font-medium text-gray-800 bg-gray-100 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800">
            View Example Profile
          </button>

          <div className="w-5" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 mb-4">
          Describe yourself and your content
        </h1>

        <div className="relative w-full mb-4">
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder={placeholder || ''}
            className="
              w-full min-h-[170px] px-4 py-3 border rounded-2xl text-sm
              focus:outline-none focus:ring-2 focus:ring-black/70 border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100
            "
          />

          <p
            className={`text-xs mt-2 text-right ${
              wordCount > WORD_LIMIT ? 'text-red-500' : 'text-gray-500 dark:text-zinc-400'
            }`}
          >
            {wordCount} / {WORD_LIMIT} words
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2">
              Need help? Try one of these example descriptions based on your content type:
            </p>

            <div className="space-y-2">
              {suggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(text)}
                  className="
                    w-full text-left text-xs sm:text-sm p-3 rounded-2xl border
                    border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition
                  "
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto">
          <Button
            onClick={handleContinue}
            disabled={isDisabled}
            className="w-full py-3 rounded-full bg-black text-white hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
