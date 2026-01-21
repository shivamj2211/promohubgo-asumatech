'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ExampleProfileDialog } from '@/components/exampleprofile/exapmleprofile'
import {
  ChevronLeft,
  Instagram,
  Music2,
  Youtube,
  Twitter,
  ShoppingBag,
  Link2,
} from 'lucide-react'

import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'
import { getRouteForStep } from '@/config/onboardingFlow'

type SocialData = {
  username: string
  followers: string
  url: string
}

type PlatformMeta = {
  value: string
  label: string
  meta?: Record<string, any>
}

const iconMap: Record<string, any> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  twitter: Twitter,
  amazon: ShoppingBag,
  website: Link2,
}

export default function SocialChannelsPage() {
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const router = useRouter()

  const [socials, setSocials] = useState<Record<string, SocialData>>({})
  const [platforms, setPlatforms] = useState<PlatformMeta[]>([])
  const [followerRanges, setFollowerRanges] = useState<
    Array<{ value: string; label: string }>
  >([])

  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/location')

  const platformByKey = useMemo(() => {
    return platforms.reduce<Record<string, PlatformMeta>>((acc, item) => {
      acc[item.value] = item
      return acc
    }, {})
  }, [platforms])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [meRes, platformsRes, rangesRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('influencer', 'social_channels'),
          fetchValues('influencer', 'follower_ranges'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const platformItems = Array.isArray(platformsRes) ? platformsRes : []
        const rangeItems = Array.isArray(rangesRes) ? rangesRes : []
        setPlatforms(platformItems)
        setFollowerRanges(rangeItems)

        const initialSocials: Record<string, SocialData> = {}
        platformItems.forEach((p: any) => {
          initialSocials[String(p.value)] = { username: '', followers: '', url: '' }
        })
        const existing = Array.isArray(user.influencerSocials) ? user.influencerSocials : []
        if (existing.length) {
          existing.forEach((s: any) => {
            const key = String(s.platform || '').toLowerCase()
            if (!initialSocials[key]) return
            initialSocials[key] = {
              username: s.username || '',
              followers: s.followers || '',
              url: s.url || '',
            }
          })
        }
        setSocials(initialSocials)
        if (platformItems[0]?.value) {
          setActivePlatform(String(platformItems[0].value))
        }
        setBackHref(getRouteForStep(user.role, 2) || '/location')
      } catch {
        if (active) setBackHref('/location')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const updateSocial = (key: string, field: keyof SocialData, value: string) => {
    setSocials((prev) => {
      const current = prev[key] || { username: '', followers: '', url: '' }
      const next: SocialData = { ...current, [field]: value }

      if (field === 'username') {
        const cleanedUsername = value.replace(/^@+/, '').trim()
        const prefix = platformByKey[key]?.meta?.urlPrefix || null
        if (prefix) {
          next.url = cleanedUsername ? prefix + cleanedUsername : ''
        }
      }

      return { ...prev, [key]: next }
    })
  }

  const isPlatformInvalid = (key: string): boolean => {
    const s = socials[key]
    if (!s) return false
    const vals = [s.username.trim(), s.followers.trim(), s.url.trim()]
    const filled = vals.filter(Boolean).length
    if (filled === 0) return false
    return filled > 0 && filled < 3
  }

  const hasCompleteSocial = Object.values(socials).some(
    (s) => s.username.trim() && s.followers.trim() && s.url.trim()
  )

  const hasPartialSocial = Object.keys(socials).some((key) =>
    isPlatformInvalid(key)
  )

  const continueDisabled = !hasCompleteSocial || hasPartialSocial

  const buildPayload = () => {
    const payload = Object.keys(socials)
      .map((platform) => {
        const s = socials[platform]
        const username = s.username.trim()
        const follower_range = s.followers.trim()
        const url = s.url.trim()

        if (!username || !follower_range || !url) return null

        return {
          platform,
          username,
          follower_range,
          url,
        }
      })
      .filter(Boolean)

    return payload as Array<{
      platform: string
      username: string
      follower_range: string
      url: string
    }>
  }

  const handleContinue = async () => {
    setAttemptedSubmit(true)
    if (continueDisabled) return

    try {
      setSaving(true)

      const socialsPayload = buildPayload()

      await apiFetch('/api/influencer/socials', {
        method: 'PUT',
        body: JSON.stringify({ socials: socialsPayload, onboardingStep: 3 }),
      })

      router.push('/description')
    } catch (e: any) {
      alert(e?.message || 'Failed to save social channels')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    try {
      setSaving(true)

      await apiFetch('/api/influencer/socials', {
        method: 'PUT',
        body: JSON.stringify({ socials: [], onboardingStep: 3 }),
      })

      router.push('/description')
    } catch (e: any) {
      alert(e?.message || 'Failed to skip socials step')
    } finally {
      setSaving(false)
    }
  }

  const current = activePlatform ? socials[activePlatform] : null
  const currentMeta = activePlatform ? platformByKey[activePlatform] || null : null
  const currentHasError =
    attemptedSubmit && activePlatform !== null && isPlatformInvalid(activePlatform)

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

          <ExampleProfileDialog />
          <div className="w-5" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">
          Add your social channels
        </h1>

        {activePlatform && current && currentMeta && (
          <div className="mt-2 mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">
              {currentMeta.meta?.title || currentMeta.label || currentMeta.value}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={current.username}
                onChange={(e) =>
                  updateSocial(activePlatform, 'username', e.target.value)
                }
                placeholder={`${currentMeta.meta?.title || currentMeta.label || currentMeta.value} username`}
                className="w-full px-3 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/70 border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <select
                value={current.followers}
                onChange={(e) =>
                  updateSocial(activePlatform, 'followers', e.target.value)
                }
                className="w-full px-3 py-3 border rounded-2xl text-sm text-gray-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/70 border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <option value="">Followers</option>
                {followerRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label || range.value}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={current.url}
              onChange={(e) =>
                updateSocial(activePlatform, 'url', e.target.value)
              }
              placeholder={
                currentMeta.value === 'website'
                  ? 'Website URL'
                  : `${currentMeta.meta?.title || currentMeta.label || currentMeta.value} profile link`
              }
              className="w-full px-3 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black/70 border-gray-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />

            {currentHasError && (
              <p className="mt-2 text-xs text-red-500">
                Please fill username, followers range, and profile link for{' '}
                {currentMeta.meta?.title || currentMeta.label || currentMeta.value}, or clear all
                fields for this channel.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 mt-2 flex-1 overflow-y-auto pb-24">
          {platforms.map((p) => {
            const saved = socials[p.value]
            const isActive = activePlatform === p.value
            const hasData =
              saved.username.trim() || saved.url.trim() || saved.followers.trim()

            const iconName = String(p.meta?.icon || p.value || '').toLowerCase()
            const Icon = iconMap[iconName] || Link2

            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setActivePlatform(p.value)}
                className={`
                  w-full border rounded-2xl px-4 py-3 flex items-center justify-between
                  ${isActive ? 'border-black' : 'border-gray-200 dark:border-zinc-800'}
                  bg-white dark:bg-zinc-950
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm text-gray-900 dark:text-zinc-100">
                    {p.label || p.value}
                    {hasData && (
                      <span className="text-xs text-gray-500 dark:text-zinc-400 ml-2">
                        (added)
                      </span>
                    )}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto space-y-2">
          {attemptedSubmit && continueDisabled && (
            <p className="text-[11px] text-red-500 text-center">
              Add at least one social channel with username, followers range and profile
              link to continue - or skip this step for now.
            </p>
          )}

          <Button
            onClick={handleContinue}
            disabled={continueDisabled || saving}
            className="w-full py-3 rounded-full bg-black text-white hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue'}
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="w-full text-center text-[11px] text-gray-500 dark:text-zinc-400 underline underline-offset-2 disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
