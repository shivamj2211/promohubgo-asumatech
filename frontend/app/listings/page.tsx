'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { TopNav } from '@/components/top-nav'
import { SiteFooter } from '@/components/footer/site-footer'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import Link from 'next/link'

type ListingItem = {
  id: string
  type: 'INFLUENCER' | 'BRAND'
  displayName: string
  username?: string | null
  title?: string | null
  avatarUrl?: string | null
  categories?: string[]
  locationLabel?: string | null
  stats?: {
    followers?: string | null
    engagement?: string | null
    platforms?: number | null
    businessType?: string | null
    budgetRange?: string | null
  }
}

type ValueOption = { value?: string; label?: string }

const formatTypeLabel = (type: ListingItem['type']) =>
  type === 'INFLUENCER' ? 'Influencer' : 'Brand'

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

export default function Listings() {
  const [listingType, setListingType] = useState<'influencer' | 'brand'>('influencer')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [listings, setListings] = useState<ListingItem[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<ValueOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingCategories(true)
        const categories = await fetchValues(listingType, 'categories')
        if (!active) return
        setCategoryOptions(categories)
        setSelectedCategory('all')
      } catch {
        if (active) setCategoryOptions([])
      } finally {
        if (active) setLoadingCategories(false)
      }
    })()
    return () => {
      active = false
    }
  }, [listingType])

  useEffect(() => {
    let active = true
    const handle = setTimeout(async () => {
      try {
        setLoadingListings(true)
        const params = new URLSearchParams({
          type: listingType,
          page: '1',
          limit: '24',
        })
        if (searchQuery.trim()) params.set('q', searchQuery.trim())
        if (selectedCategory && selectedCategory !== 'all') {
          params.set('category', selectedCategory)
        }
        const res = await apiFetch(`/api/listings?${params.toString()}`)
        if (!active) return
        const items = Array.isArray(res?.data?.items) ? res.data.items : []
        setListings(items)
      } catch {
        if (active) setListings([])
      } finally {
        if (active) setLoadingListings(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(handle)
    }
  }, [listingType, searchQuery, selectedCategory])

  const categories = useMemo(() => {
    const base = [{ value: 'all', label: 'All' }]
    const mapped = categoryOptions.map((item) => ({
      value: String(item.value || ''),
      label: item.label || item.value || '',
    }))
    return base.concat(mapped.filter((item) => item.value))
  }, [categoryOptions])

  const categoryLabels = useMemo(() => {
    return categoryOptions.reduce<Record<string, string>>((acc, item) => {
      const key = String(item.value || '').toLowerCase()
      if (!key) return acc
      acc[key] = String(item.label || item.value || '')
      return acc
    }, {})
  }, [categoryOptions])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-emerald-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 text-slate-900 dark:text-zinc-100">
      <TopNav />

      <div className="bg-white/80 dark:bg-zinc-950/80 border-b border-gray-200 dark:border-zinc-800 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-zinc-100">
                Browse creative talent
              </h1>
              <p className="text-lg text-gray-600 dark:text-zinc-400 mt-2">
                Discover profiles, compare stats, and reach out instantly.
              </p>
            </div>

            <div className="flex items-center rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
              {(['influencer', 'brand'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setListingType(type)}
                  className={`px-4 py-2 text-sm rounded-full transition ${
                    listingType === type
                      ? 'bg-black text-white'
                      : 'text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {type === 'influencer' ? 'Influencer' : 'Brand'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name, title, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/70 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Button className="bg-black hover:bg-black/90 text-white rounded-2xl px-6">
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {loadingCategories ? (
              <div className="text-sm text-gray-500 dark:text-zinc-400">Loading categories...</div>
            ) : (
              categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value.toLowerCase())}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                    selectedCategory === category.value.toLowerCase()
                      ? 'bg-black text-white'
                      : 'bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {category.label}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loadingListings ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200 dark:border-zinc-800 p-6 animate-pulse"
              >
                <div className="h-32 rounded-2xl bg-gray-100 dark:bg-zinc-800" />
                <div className="mt-4 h-4 bg-gray-100 dark:bg-zinc-800 rounded w-2/3" />
                <div className="mt-2 h-3 bg-gray-100 dark:bg-zinc-800 rounded w-1/2" />
                <div className="mt-6 h-10 bg-gray-100 dark:bg-zinc-800 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-zinc-400 text-lg">
              No listings found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const displayName = listing.displayName || 'Creator'
              const initials = getInitials(displayName)
              const typeLabel = formatTypeLabel(listing.type)
              const categoriesPreview = (listing.categories || []).slice(0, 2)
              const followerStat =
                listing.stats?.followers || listing.stats?.engagement || 'N/A'
              const statItems =
                listing.type === 'INFLUENCER'
                  ? [
                      { label: 'Followers', value: followerStat },
                      {
                        label: 'Platforms',
                        value:
                          listing.stats?.platforms !== null &&
                          listing.stats?.platforms !== undefined
                            ? String(listing.stats.platforms)
                            : 'N/A',
                      },
                    ]
                  : [
                      {
                        label: 'Business',
                        value: listing.stats?.businessType || listing.title || 'Brand',
                      },
                      {
                        label: 'Budget',
                        value: listing.stats?.budgetRange || 'N/A',
                      },
                    ]

              return (
                <div
                  key={listing.id}
                  className="bg-white dark:bg-zinc-950 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition overflow-hidden"
                >
                  <div className="relative p-6 pb-0">
                    <span className="absolute top-4 right-4 text-xs uppercase tracking-widest px-3 py-1 rounded-full bg-black text-white">
                      {typeLabel}
                    </span>
                    <div className="flex items-center gap-4">
                      {listing.avatarUrl ? (
                        <img
                          src={listing.avatarUrl}
                          alt={displayName}
                          className="w-16 h-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-200 to-emerald-200 dark:from-amber-900 dark:to-emerald-900 flex items-center justify-center text-xl font-semibold">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                          {displayName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">
                          {listing.username ? `by @${listing.username}` : listing.title || 'Profile'}
                        </p>
                        {listing.locationLabel && (
                          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                            {listing.locationLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pt-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {categoriesPreview.length ? (
                        categoriesPreview.map((cat) => (
                          <span
                            key={cat}
                            className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-zinc-800"
                          >
                            {categoryLabels[String(cat).toLowerCase()] || cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          No categories yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
                    {statItems.map((stat) => (
                      <div key={stat.label}>
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">
                          {stat.value}
                        </div>
                        <div className="text-gray-500 dark:text-zinc-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                    <div className="px-6 pb-6 flex gap-3">
                    {(() => {
                      // ✅ Prefer username in URL, fallback to id (so it never breaks)
                      const slug = (listing.username && String(listing.username).trim()) ? String(listing.username).trim() : listing.id;

                      return (
                        <>
                          <Link
                            href={`/creator/${slug}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                          >
                            View Profile
                          </Link>

                          <Link
                            href={`/contact/${slug}`}
                            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Contact
                          </Link>
                        </>
                      );
                    })()}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
