'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

import { apiFetch } from '@/lib/api'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

export default function SummaryPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/description')
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/me')
        if (!active) return
        const user = res?.user || {}
        setRole(user.role || null)
        const profile = user.influencerProfile || {}
        if (user.role === 'INFLUENCER' && profile.title) setTitle(profile.title)
        const backStep = user.role === 'BRAND' ? 7 : 4
        setBackHref(getRouteForStep(user.role, backStep) || '/description')
      } catch {
        if (active) setBackHref('/description')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const handleContinue = async () => {
    if (role === 'INFLUENCER' && !title.trim()) return

    try {
      setSaving(true)

      if (role === 'INFLUENCER') {
        await apiFetch('/api/influencer/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(),
            onboardingStep: 5,
          }),
        })
      }

      await apiFetch('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      router.push('/listings')
    } catch (e: any) {
      alert(e?.message || 'Failed to save title')
    } finally {
      setSaving(false)
    }
  }

  const isDisabled = (role === 'INFLUENCER' && !title.trim()) || saving

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
          Summarize yourself, this is the title
          <br />
          shown on your profile
        </h1>

        <div className="mt-2 flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. Fitness Content Creator & Student Athlete"
            className="w-full px-4 py-4 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/70 border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
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
