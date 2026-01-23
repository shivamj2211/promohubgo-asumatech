'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { TopNav } from '@/components/top-nav'
import { SiteFooter } from '@/components/footer/site-footer'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'

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
    platforms?: number | null
    businessType?: string | null
    budgetRange?: string | null
  }
}

type ValueOption = { value?: string; label?: string }

const PLATFORM_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'ugc', label: 'User Generated Content' },
  { value: 'twitter', label: 'Twitter' },
]

const FOLLOWERS_OPTIONS = [
  { value: 'any', label: 'Followers' },
  { value: '1000', label: '1K+' },
  { value: '10000', label: '10K+' },
  { value: '100000', label: '100K+' },
  { value: '1000000', label: '1M+' },
]

const AGE_OPTIONS = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-60', label: '45-60' },
]

const PRICE_OPTIONS = [
  { value: 'any', label: 'Price' },
  { value: 'low', label: 'Low' },
  { value: 'mid', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'premium', label: 'Premium' },
]

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function buildPageWindow(current: number, totalPages: number) {
  const windowSize = 5
  const pages: number[] = []
  const start = Math.max(1, current - Math.floor(windowSize / 2))
  const end = Math.min(totalPages, start + windowSize - 1)
  const realStart = Math.max(1, end - windowSize + 1)
  for (let p = realStart; p <= end; p++) pages.push(p)
  return pages
}

function toggleInArray(arr: string[], v: string) {
  const val = String(v || '').trim().toLowerCase()
  if (!val) return arr
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

function removeFromArray(arr: string[], v: string) {
  const val = String(v || '').trim().toLowerCase()
  if (!val) return arr
  return arr.filter((x) => x !== val)
}

function buildLabelMap(options: ValueOption[]) {
  return options.reduce<Record<string, string>>((acc, item) => {
    const k = String(item.value || '').toLowerCase().trim()
    if (!k) return acc
    acc[k] = String(item.label || item.value || '')
    return acc
  }, {})
}

function asOptions(options: ValueOption[]) {
  return options
    .map((x) => ({
      value: String(x.value || '').toLowerCase().trim(),
      label: String(x.label || x.value || '').trim(),
    }))
    .filter((x) => x.value)
}

export default function Listings() {
  const [listingType, setListingType] = useState<'influencer' | 'brand'>('influencer')

  // search bar
  const [platform, setPlatform] = useState('any')
  const [categoryQuery, setCategoryQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // influencer filter multi-selects
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [selectedAges, setSelectedAges] = useState<string[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  const [followersMin, setFollowersMin] = useState('any')
  const [videography, setVideography] = useState(false)

  const [location, setLocation] = useState('')
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<{ label: string }[]>([])
  const locationBoxRef = useRef<HTMLDivElement | null>(null)

  const [price, setPrice] = useState('any')

  // pagination
  const LIMIT = 15
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // listings
  const [listings, setListings] = useState<ListingItem[]>([])
  const [loadingListings, setLoadingListings] = useState(false)

  // dynamic categories
  const [categoryOptions, setCategoryOptions] = useState<ValueOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // dynamic genders + languages
  const [genderOptions, setGenderOptions] = useState<ValueOption[]>([])
  const [languageOptions, setLanguageOptions] = useState<ValueOption[]>([])
  const [loadingMeta, setLoadingMeta] = useState(false)

  // popovers
  const [catOpen, setCatOpen] = useState(false)
  const catBoxRef = useRef<HTMLDivElement | null>(null)

  const [genderOpen, setGenderOpen] = useState(false)
  const genderBoxRef = useRef<HTMLDivElement | null>(null)

  const [ageOpen, setAgeOpen] = useState(false)
  const ageBoxRef = useRef<HTMLDivElement | null>(null)

  const [langOpen, setLangOpen] = useState(false)
  const langBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (catBoxRef.current && !catBoxRef.current.contains(t)) setCatOpen(false)
      if (locationBoxRef.current && !locationBoxRef.current.contains(t)) setLocationOpen(false)
      if (genderBoxRef.current && !genderBoxRef.current.contains(t)) setGenderOpen(false)
      if (ageBoxRef.current && !ageBoxRef.current.contains(t)) setAgeOpen(false)
      if (langBoxRef.current && !langBoxRef.current.contains(t)) setLangOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  // load categories when type changes
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingCategories(true)
        const cats = await fetchValues(listingType, 'categories')
        if (!active) return
        setCategoryOptions(cats || [])
        setSelectedCategories([])
        setCategoryQuery('')
        setPage(1)
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

  // load influencer meta values (gender + languages) dynamically
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingMeta(true)
        if (listingType !== 'influencer') {
          setGenderOptions([])
          setLanguageOptions([])
          setSelectedGenders([])
          setSelectedLanguages([])
          setSelectedAges([])
          return
        }
        const [genders, langs] = await Promise.all([
          fetchValues('influencer', 'gender_options'),
          fetchValues('influencer', 'languages'),
        ])
        if (!active) return
        setGenderOptions(genders || [])
        setLanguageOptions(langs || [])
      } catch {
        if (active) {
          setGenderOptions([])
          setLanguageOptions([])
        }
      } finally {
        if (active) setLoadingMeta(false)
      }
    })()
    return () => {
      active = false
    }
  }, [listingType])

  const categoryLabels = useMemo(() => buildLabelMap(categoryOptions), [categoryOptions])
  const genderLabels = useMemo(() => buildLabelMap(genderOptions), [genderOptions])
  const languageLabels = useMemo(() => buildLabelMap(languageOptions), [languageOptions])

  const popularCategories = useMemo(() => {
    return categoryOptions.map((x) => String(x.value || '')).filter(Boolean).slice(0, 16)
  }, [categoryOptions])

  const filteredCategorySuggestions = useMemo(() => {
    const all = asOptions(categoryOptions)
    const q = categoryQuery.trim().toLowerCase()
    if (!q) return all.slice(0, 12)
    return all
      .filter((c) => c.value.includes(q) || c.label.toLowerCase().includes(q))
      .slice(0, 12)
  }, [categoryOptions, categoryQuery])

  const genderList = useMemo(() => {
    // fallback static if DB missing
    const opts = asOptions(genderOptions)
    if (opts.length) return opts
    return [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
    ]
  }, [genderOptions])

  const languageList = useMemo(() => {
    const opts = asOptions(languageOptions)
    if (opts.length) return opts
    return [
      { value: 'hindi', label: 'Hindi' },
      { value: 'english', label: 'English' },
      { value: 'marathi', label: 'Marathi' },
      { value: 'gujarati', label: 'Gujarati' },
      { value: 'tamil', label: 'Tamil' },
      { value: 'telugu', label: 'Telugu' },
      { value: 'punjabi', label: 'Punjabi' },
    ]
  }, [languageOptions])

  const ageList = useMemo(() => AGE_OPTIONS.map((a) => ({ value: a.value, label: a.label })), [])

  // ✅ location suggestions (debounced)
  useEffect(() => {
    let active = true
    const q = location.trim()
    if (!locationOpen || q.length < 2) {
      setLocationSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/locations/suggest?q=${encodeURIComponent(q)}`)
        if (!active) return
        setLocationSuggestions(Array.isArray(res?.data) ? res.data : [])
      } catch {
        if (active) setLocationSuggestions([])
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [location, locationOpen])

  // ✅ Reset page to 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [
    listingType,
    platform,
    categoryQuery,
    selectedCategories,
    selectedGenders,
    selectedAges,
    selectedLanguages,
    followersMin,
    videography,
    location,
    price,
  ])

  // ✅ Load listings (debounced) with pagination
  useEffect(() => {
    let active = true
    const t = setTimeout(async () => {
      try {
        setLoadingListings(true)

        const params = new URLSearchParams({
          type: listingType,
          page: String(page),
          limit: String(LIMIT),
        })

        // keyword search
        if (categoryQuery.trim()) params.set('q', categoryQuery.trim())

        // ✅ multi categories
        if (selectedCategories.length) params.set('categories', selectedCategories.join(','))

        if (platform !== 'any') params.set('platform', platform)
        if (location.trim()) params.set('location', location.trim())

        if (listingType === 'influencer') {
          if (followersMin !== 'any') params.set('followersMin', followersMin)
          if (selectedGenders.length) params.set('genders', selectedGenders.join(','))
          if (selectedLanguages.length) params.set('languages', selectedLanguages.join(','))
          if (selectedAges.length) params.set('ageRanges', selectedAges.join(','))
          if (videography) params.set('videography', '1')
        } else {
          if (price !== 'any') params.set('budget', price)
        }

        const res = await apiFetch(`/api/listings?${params.toString()}`)
        if (!active) return

        const items = Array.isArray(res?.data?.items) ? res.data.items : []
        const totalCount = Number(res?.data?.total || 0)

        setListings(items)
        setTotal(Number.isFinite(totalCount) ? totalCount : 0)
      } catch {
        if (active) {
          setListings([])
          setTotal(0)
        }
      } finally {
        if (active) setLoadingListings(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [
    listingType,
    page,
    platform,
    categoryQuery,
    selectedCategories,
    selectedGenders,
    selectedAges,
    selectedLanguages,
    followersMin,
    videography,
    location,
    price,
  ])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const startIdx = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const endIdx = Math.min(page * LIMIT, total)
  const pageWindow = buildPageWindow(page, totalPages)

  const clearAll = () => {
    setPlatform('any')
    setCategoryQuery('')
    setSelectedCategories([])

    setSelectedGenders([])
    setSelectedAges([])
    setSelectedLanguages([])

    setFollowersMin('any')
    setVideography(false)
    setLocation('')
    setPrice('any')

    setCatOpen(false)
    setGenderOpen(false)
    setAgeOpen(false)
    setLangOpen(false)
    setLocationOpen(false)
    setPage(1)
  }

  const pillsText = (arr: string[], labelMap: Record<string, string>, fallback: string) => {
    if (!arr.length) return fallback
    if (arr.length === 1) return labelMap[arr[0]] || arr[0]
    return `${arr.length} selected`
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav />

      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center">
            Influencer Marketing Made Easy
          </h1>
          <p className="mt-3 text-center text-slate-600 dark:text-zinc-300">
            Find and hire creators for your brand.
          </p>

          {/* SEARCH BAR */}
          <div className="mt-10 flex flex-col gap-3 items-center">
            {/* IMPORTANT: overflow-visible so dropdown is NOT clipped */}
            <div className="w-full max-w-4xl rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-visible">
              <div className="flex items-stretch rounded-full overflow-hidden">
                {/* Platform */}
                <div className="min-w-[190px] border-r border-slate-200 dark:border-zinc-800 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Platform</div>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-semibold outline-none"
                  >
                    {PLATFORM_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category multi-select */}
                <div ref={catBoxRef} className="flex-1 min-w-[240px] px-4 py-3 relative">
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Category</div>

                  <div onClick={() => setCatOpen(true)} className="mt-1 flex flex-wrap items-center gap-2">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-900 px-3 py-1 text-sm font-semibold"
                      >
                        {categoryLabels[cat] || cat}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCategories((prev) => removeFromArray(prev, cat))
                          }}
                          className="text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                          aria-label="Remove"
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    <input
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      onFocus={() => setCatOpen(true)}
                      placeholder={selectedCategories.length ? '' : 'Enter keywords, niches or categories'}
                      className="min-w-[160px] flex-1 bg-transparent text-sm outline-none"
                    />

                    {(selectedCategories.length || categoryQuery) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCategories([])
                          setCategoryQuery('')
                        }}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title="Clear"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>

                  {catOpen ? (
                    <div className="absolute left-0 right-0 top-[72px] z-50 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Popular</div>
                        <button
                          onClick={() => {
                            setSelectedCategories([])
                            setCategoryQuery('')
                            setCatOpen(false)
                          }}
                          className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {popularCategories.length ? (
                          popularCategories.map((c) => {
                            const val = String(c).toLowerCase()
                            const active = selectedCategories.includes(val)
                            return (
                              <button
                                key={val}
                                onClick={() => setSelectedCategories((prev) => toggleInArray(prev, val))}
                                className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                  active
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {categoryLabels[val] || c}
                              </button>
                            )
                          })
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-zinc-400">
                            {loadingCategories ? 'Loading...' : 'No categories found.'}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">Suggestions</div>
                      <div className="mt-2 grid gap-1 max-h-64 overflow-auto">
                        {filteredCategorySuggestions.map((c) => {
                          const val = String(c.value || '').toLowerCase()
                          if (!val) return null
                          const active = selectedCategories.includes(val)
                          return (
                            <button
                              key={val}
                              onClick={() => setSelectedCategories((prev) => toggleInArray(prev, val))}
                              className={`text-left px-3 py-2 rounded-xl ${
                                active ? 'bg-slate-100 dark:bg-zinc-900' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <div className="text-sm font-semibold">{c.label}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={() => setCatOpen(false)}
                  className="w-[64px] flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800"
                  title="Search"
                >
                  🔍
                </button>
              </div>
            </div>

            {/* Role toggle */}
            <div className="flex items-center rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1">
              {(['influencer', 'brand'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setListingType(type)}
                  className={`px-4 py-2 text-sm rounded-full transition ${
                    listingType === type
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {type === 'influencer' ? 'Influencer' : 'Brand'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER ROW + RESULTS COUNT */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {listingType === 'influencer' ? (
              <>
                {/* Gender multi */}
                <div ref={genderBoxRef} className="relative">
                  <button
                    onClick={() => setGenderOpen((v) => !v)}
                    className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    {pillsText(selectedGenders, genderLabels, 'Gender')}
                  </button>

                  {genderOpen ? (
                    <div className="absolute z-50 mt-2 w-[240px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Gender</div>
                        <button
                          className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                          onClick={() => setSelectedGenders([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-2 grid gap-1">
                        {genderList.map((g) => {
                          const active = selectedGenders.includes(g.value)
                          return (
                            <button
                              key={g.value}
                              onClick={() => setSelectedGenders((prev) => toggleInArray(prev, g.value))}
                              className={`text-left px-3 py-2 rounded-xl ${
                                active ? 'bg-slate-100 dark:bg-zinc-900' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <span className="text-sm font-semibold">{g.label}</span>
                            </button>
                          )
                        })}
                      </div>
                      {loadingMeta ? (
                        <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Loading…</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Age multi */}
                <div ref={ageBoxRef} className="relative">
                  <button
                    onClick={() => setAgeOpen((v) => !v)}
                    className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    {selectedAges.length ? (selectedAges.length === 1 ? selectedAges[0] : `${selectedAges.length} selected`) : 'Age'}
                  </button>

                  {ageOpen ? (
                    <div className="absolute z-50 mt-2 w-[240px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Age</div>
                        <button
                          className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                          onClick={() => setSelectedAges([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-2 grid gap-1">
                        {ageList.map((a) => {
                          const active = selectedAges.includes(a.value)
                          return (
                            <button
                              key={a.value}
                              onClick={() => setSelectedAges((prev) => toggleInArray(prev, a.value))}
                              className={`text-left px-3 py-2 rounded-xl ${
                                active ? 'bg-slate-100 dark:bg-zinc-900' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <span className="text-sm font-semibold">{a.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Language multi */}
                <div ref={langBoxRef} className="relative">
                  <button
                    onClick={() => setLangOpen((v) => !v)}
                    className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    {pillsText(selectedLanguages, languageLabels, 'Language')}
                  </button>

                  {langOpen ? (
                    <div className="absolute z-50 mt-2 w-[260px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Language</div>
                        <button
                          className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                          onClick={() => setSelectedLanguages([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-2 grid gap-1 max-h-64 overflow-auto">
                        {languageList.map((l) => {
                          const active = selectedLanguages.includes(l.value)
                          return (
                            <button
                              key={l.value}
                              onClick={() => setSelectedLanguages((prev) => toggleInArray(prev, l.value))}
                              className={`text-left px-3 py-2 rounded-xl ${
                                active ? 'bg-slate-100 dark:bg-zinc-900' : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              <span className="text-sm font-semibold">{l.label}</span>
                            </button>
                          )
                        })}
                      </div>
                      {loadingMeta ? (
                        <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Loading…</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Followers */}
                <select
                  value={followersMin}
                  onChange={(e) => setFollowersMin(e.target.value)}
                  className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold"
                >
                  {FOLLOWERS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {/* Videography */}
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold">
                  <input type="checkbox" checked={videography} onChange={(e) => setVideography(e.target.checked)} />
                  Videography
                </label>
              </>
            ) : (
              <select
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold"
              >
                {PRICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}

            {/* Location with autosuggest */}
            <div ref={locationBoxRef} className="relative">
              <input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setLocationOpen(true)
                }}
                onFocus={() => setLocationOpen(true)}
                placeholder="Location"
                className="w-[220px] sm:w-[260px] rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold outline-none"
              />

              {locationOpen && locationSuggestions.length ? (
                <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden">
                  {locationSuggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => {
                        setLocation(s.label)
                        setLocationOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-zinc-900"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              onClick={clearAll}
              className="ml-auto text-sm font-semibold underline text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
            >
              Clear All
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-zinc-300">
            <div>
              {total > 0 ? (
                <span>
                  Showing <b>{startIdx}</b>–<b>{endIdx}</b> of <b>{total}</b>
                </span>
              ) : (
                <span>Showing 0 of 0</span>
              )}
            </div>
            <div className="hidden sm:block">
              Page <b>{page}</b> / <b>{totalPages}</b>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loadingListings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 animate-pulse">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="mt-6 h-10 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-600 dark:text-zinc-400 text-lg">No listings found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((l) => {
                const display = l.displayName || 'Creator'
                const initials = getInitials(display)
                const slug = l.username ? String(l.username) : l.id

                return (
                  <div
                    key={l.id}
                    className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-lg transition overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        {l.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.avatarUrl} alt={display} className="w-14 h-14 rounded-2xl object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 to-emerald-200 dark:from-amber-900 dark:to-emerald-900 flex items-center justify-center font-bold">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-extrabold truncate">{display}</div>
                          <div className="text-sm text-slate-500 dark:text-zinc-400 truncate">
                            {l.username ? `@${l.username}` : l.title || 'Profile'}
                          </div>
                          {l.locationLabel ? (
                            <div className="text-xs text-slate-500 dark:text-zinc-500 truncate">{l.locationLabel}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        {l.type === 'INFLUENCER' ? (
                          <>
                            <div>
                              <div className="font-semibold">{l.stats?.followers || 'N/A'}</div>
                              <div className="text-slate-500 dark:text-zinc-400">Followers</div>
                            </div>
                            <div>
                              <div className="font-semibold">{l.stats?.platforms ?? 0}</div>
                              <div className="text-slate-500 dark:text-zinc-400">Platforms</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="font-semibold">{l.stats?.businessType || l.title || 'Brand'}</div>
                              <div className="text-slate-500 dark:text-zinc-400">Business</div>
                            </div>
                            <div>
                              <div className="font-semibold">{l.stats?.budgetRange || 'N/A'}</div>
                              <div className="text-slate-500 dark:text-zinc-400">Budget</div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-5 flex gap-3">
                        <Link
                          href={`/creator/${slug}`}
                          className="flex-1 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                        >
                          View Profile
                        </Link>
                        <Link
                          href={`/contact/${l.id}`}
                          className="flex-1 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
                        >
                          Contact
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modern Pagination */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-zinc-300">
                {total > 0 ? (
                  <span>
                    Showing <b>{startIdx}</b>–<b>{endIdx}</b> of <b>{total}</b>
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Prev
                </button>

                {pageWindow.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-xl border ${
                      p === page
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
