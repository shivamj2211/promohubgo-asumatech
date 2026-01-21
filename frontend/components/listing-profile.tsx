'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { TopNav } from '@/components/top-nav'
import { SiteFooter } from '@/components/footer/site-footer'

type ProfileData = {
  id: string
  type: 'INFLUENCER' | 'BRAND'
  displayName: string
  username?: string | null
  title?: string | null
  description?: string | null
  locationLabel?: string | null
  categories?: string[]
  socials?: Array<{ platform: string; username?: string | null; url?: string | null }>
  media?: { profile?: string[]; cover?: string[] }
}

type PackageItem = {
  id: number
  title: string
  description?: string | null
  price: string | number
  currency: string
}

export function ListingProfile({
  userId,
  type,
}: {
  userId: string
  type: 'influencer' | 'brand'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const [profileRes, packagesRes] = await Promise.all([
          apiFetch(`/api/profile/${userId}?type=${type}`),
          apiFetch(`/api/profile/${userId}/packages?type=${type}`),
        ])
        if (!active) return
        setProfile(profileRes?.data || null)
        const items = Array.isArray(packagesRes?.data) ? packagesRes.data : []
        setPackages(items)
        if (items.length) setSelectedPackageId(items[0].id)
      } catch {
        if (active) {
          setProfile(null)
          setPackages([])
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [userId, type])

  useEffect(() => {
    const shouldOpen = searchParams?.get('contact') === '1'
    if (shouldOpen) setContactOpen(true)
  }, [searchParams])

  const mediaPreview = useMemo(() => {
    if (!profile?.media) return []
    return [...(profile.media.profile || []), ...(profile.media.cover || [])].slice(0, 6)
  }, [profile])

  const selectedPackage =
    packages.find((pkg) => pkg.id === selectedPackageId) || packages[0] || null

  const handleContact = async () => {
    if (!message.trim()) return
    try {
      setSending(true)
      await apiFetch(`/api/profile/${userId}/contact?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      })
      setMessage('')
      setContactOpen(false)
    } catch (e: any) {
      alert(e?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 py-12 text-sm">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 py-12 text-sm">Profile not found.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 dark:text-zinc-400 hover:underline"
        >
          Back to listings
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-widest text-gray-400">
                {profile.type === 'INFLUENCER' ? 'Influencer' : 'Brand'}
              </p>
              <h1 className="text-3xl font-semibold">{profile.displayName}</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {profile.username ? `@${profile.username}` : profile.title || 'Profile'}
              </p>
              {profile.locationLabel && (
                <p className="text-sm text-gray-500 dark:text-zinc-400">{profile.locationLabel}</p>
              )}
            </div>

            {profile.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">About</h2>
                <p className="text-sm text-gray-600 dark:text-zinc-300">{profile.description}</p>
              </div>
            )}

            {profile.categories?.length ? (
              <div>
                <h2 className="text-lg font-semibold mb-2">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.categories.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-zinc-800"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {mediaPreview.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Media</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaPreview.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="Media"
                      className="w-full h-28 object-cover rounded-xl"
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-2">Socials</h2>
              {profile.socials?.length ? (
                <div className="space-y-2">
                  {profile.socials.map((social) => (
                    <div
                      key={`${social.platform}-${social.username || ''}`}
                      className="text-sm text-gray-600 dark:text-zinc-300"
                    >
                      <span className="font-medium capitalize">{social.platform}</span>
                      {social.username ? ` · ${social.username}` : ''}
                      {social.url ? (
                        <>
                          {' '}
                          ·{' '}
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-black dark:text-white underline"
                          >
                            Visit
                          </a>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  No social links yet.
                </p>
              )}
            </div>
          </div>

          <div className="w-full lg:w-[360px] space-y-4">
            <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold">Packages</h2>
              {packages.length ? (
                <div className="space-y-3">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`border rounded-xl p-3 cursor-pointer transition ${
                        selectedPackageId === pkg.id
                          ? 'border-black dark:border-white'
                          : 'border-gray-200 dark:border-zinc-800'
                      }`}
                    >
                      <p className="font-medium text-sm">{pkg.title}</p>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Packages will appear here.
                </p>
              )}
            </div>

            {selectedPackage && (
              <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                <p className="text-xs uppercase tracking-widest text-gray-400">Selected</p>
                <h3 className="text-lg font-semibold">{selectedPackage.title}</h3>
                <p className="text-2xl font-semibold">
                  {selectedPackage.currency} {selectedPackage.price}
                </p>
                {selectedPackage.description && (
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    {selectedPackage.description}
                  </p>
                )}
                <Button
                  onClick={() => setContactOpen(true)}
                  className="w-full bg-black hover:bg-black/90 text-white rounded-xl"
                >
                  Contact
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Contact {profile.displayName}</h3>
              <button
                onClick={() => setContactOpen(false)}
                className="text-sm text-gray-500 dark:text-zinc-400"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Send a quick message to start the conversation.
            </p>
            {profile.socials?.length ? (
              <div className="space-y-2 text-sm">
                {profile.socials.map((social) => (
                  <div key={`${social.platform}-${social.username || ''}`}>
                    <span className="font-medium capitalize">{social.platform}</span>
                    {social.url ? (
                      <>
                        {' '}
                        ·{' '}
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-black dark:text-white underline"
                        >
                          {social.username || 'Open'}
                        </a>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 dark:border-zinc-800 rounded-xl p-3 text-sm dark:bg-zinc-900"
              placeholder="Introduce your campaign, goals, and timeline..."
            />
            <Button
              onClick={handleContact}
              disabled={!message.trim() || sending}
              className="w-full bg-black hover:bg-black/90 text-white rounded-xl"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
