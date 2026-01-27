'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  { value: 'ugc', label: 'UGC' },
  { value: 'twitter', label: 'X / Twitter' },
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

const SORT_OPTIONS_INFLUENCER = [
  { value: 'followers', label: 'Sort: Followers' },
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'oldest', label: 'Sort: Oldest' },
]

const SORT_OPTIONS_BRAND = [
  { value: 'newest', label: 'Sort: Newest' },
  { value: 'oldest', label: 'Sort: Oldest' },
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

function slugify(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function decodeSlug(slug: string) {
  // /influencers/beauty-fashion-mumbai  => { category: 'beauty-fashion', location: 'mumbai' }
  const s = String(slug || '').trim().toLowerCase()
  if (!s) return { category: '', location: '' }
  const parts = s.split('-').filter(Boolean)
  if (parts.length < 2) return { category: s, location: '' }
  const location = parts[parts.length - 1]
  const category = parts.slice(0, parts.length - 1).join('-')
  return { category, location }
}
function normalizeTags(input: string | string[]) {
  const arr = Array.isArray(input)
    ? input
    : String(input || '')
        .split(',')
        .map((s) => s.trim())

  const cleaned = arr
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((t) => t.slice(0, 24))

  const seen = new Set<string>()
  const unique: string[] = []
  for (const t of cleaned) {
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(t)
  }
  return unique
}


export default function Listings() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  // sort
  const [sort, setSort] = useState<'followers' | 'newest' | 'oldest'>('newest')

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
 // const [_loadingMeta, setLoadingMeta] = useState(false)

  // auth for save-search
  const [me, setMe] = useState<{ id: string; role?: string | null } | null>(null)
  const [savingSearch, setSavingSearch] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  
  // ✅ Save search tags
  const [saveTags, setSaveTags] = useState<string[]>([])
  const [saveTagInput, setSaveTagInput] = useState('')

  // popovers
  const [catOpen, setCatOpen] = useState(false)
  const catBoxRef = useRef<HTMLDivElement | null>(null)

  const [genderOpen, setGenderOpen] = useState(false)
  const genderBoxRef = useRef<HTMLDivElement | null>(null)

  const [ageOpen, setAgeOpen] = useState(false)
  const ageBoxRef = useRef<HTMLDivElement | null>(null)

  const [langOpen, setLangOpen] = useState(false)
  const langBoxRef = useRef<HTMLDivElement | null>(null)

  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)

  // URL sync guards
  const didInitFromUrl = useRef(false)
  const lastUrlRef = useRef('')

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

  // load current user (for save search)
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/me')
        if (!active) return
        if (res?.ok && res?.user?.id) setMe({ id: res.user.id, role: res.user.role || null })
        else setMe(null)
      } catch {
        if (active) setMe(null)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // ✅ Init state from URL (query params + SEO slug path)
  useEffect(() => {
    if (didInitFromUrl.current) return

    const qp = searchParams
    const next: any = {}

    // SEO slug (only for influencers)
    if (pathname?.startsWith('/influencers/')) {
      const slug = pathname.split('/')[2] || ''
      const { category, location: loc } = decodeSlug(slug)
      if (category) {
        next.listingType = 'influencer'
        next.selectedCategories = [category]
      }
      if (loc) next.location = loc
    }

    const t = qp.get('type')
    if (t === 'influencer' || t === 'brand') next.listingType = t

    const p = qp.get('platform')
    if (p) next.platform = p

    const q = qp.get('q')
    if (q) next.categoryQuery = q

    const cats = qp.get('categories')
    if (cats) next.selectedCategories = cats.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)

    const loc = qp.get('location')
    if (loc) next.location = loc

    const s = qp.get('sort')
    if (s === 'followers' || s === 'newest' || s === 'oldest') next.sort = s

    const fmin = qp.get('followersMin')
    if (fmin) next.followersMin = fmin

    const gens = qp.get('genders')
    if (gens) next.selectedGenders = gens.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)

    const langs = qp.get('languages')
    if (langs) next.selectedLanguages = langs.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)

    const ages = qp.get('ageRanges')
    if (ages) next.selectedAges = ages.split(',').map((x) => x.trim()).filter(Boolean)

    const v = qp.get('videography')
    if (v === '1') next.videography = true

    const b = qp.get('budget')
    if (b) next.price = b

    const pg = Number.parseInt(qp.get('page') || '', 10)
    if (Number.isFinite(pg) && pg > 0) next.page = pg

    // apply
    if (next.listingType) setListingType(next.listingType)
    if (next.platform) setPlatform(next.platform)
    if (typeof next.categoryQuery === 'string') setCategoryQuery(next.categoryQuery)
    if (Array.isArray(next.selectedCategories)) setSelectedCategories(next.selectedCategories)
    if (typeof next.location === 'string') setLocation(next.location)
    if (next.sort) setSort(next.sort)

    if (typeof next.followersMin === 'string') setFollowersMin(next.followersMin)
    if (Array.isArray(next.selectedGenders)) setSelectedGenders(next.selectedGenders)
    if (Array.isArray(next.selectedLanguages)) setSelectedLanguages(next.selectedLanguages)
    if (Array.isArray(next.selectedAges)) setSelectedAges(next.selectedAges)
    if (typeof next.videography === 'boolean') setVideography(next.videography)
    if (typeof next.price === 'string') setPrice(next.price)
    if (typeof next.page === 'number') setPage(next.page)

    didInitFromUrl.current = true
  }, [pathname, searchParams])

  // load categories when type changes
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoadingCategories(true)
        const cats = await fetchValues(listingType, 'categories')
        if (!active) return
        setCategoryOptions(cats || [])
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
  // load influencer meta values (gender + languages) dynamically
useEffect(() => {
  let active = true

  ;(async () => {
    try {
      if (listingType !== 'influencer') {
        setGenderOptions([])
        setLanguageOptions([])
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

  // ✅ Reset page to 1 whenever filters change (except when state is being initialized from URL)
  useEffect(() => {
    if (!didInitFromUrl.current) return
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
    sort,
  ])

  // ✅ URL sync (filters reflect in URL)
  useEffect(() => {
    if (!didInitFromUrl.current) return

    const params = new URLSearchParams()
    params.set('type', listingType)
    if (platform !== 'any') params.set('platform', platform)
    if (categoryQuery.trim()) params.set('q', categoryQuery.trim())
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','))
    if (location.trim()) params.set('location', location.trim())

    if (sort) params.set('sort', sort)

    if (listingType === 'influencer') {
      if (followersMin !== 'any') params.set('followersMin', followersMin)
      if (selectedGenders.length) params.set('genders', selectedGenders.join(','))
      if (selectedLanguages.length) params.set('languages', selectedLanguages.join(','))
      if (selectedAges.length) params.set('ageRanges', selectedAges.join(','))
      if (videography) params.set('videography', '1')
    } else {
      if (price !== 'any') params.set('budget', price)
    }

    // keep page in url only when > 1
    if (page > 1) params.set('page', String(page))

    // SEO-friendly path
    let basePath = '/listings'
    if (listingType === 'influencer' && selectedCategories.length === 1 && location.trim()) {
      const catSlug = slugify(selectedCategories[0])
      const locSlug = slugify(location)
      if (catSlug && locSlug) basePath = `/influencers/${catSlug}-${locSlug}`
    }

    const nextUrl = `${basePath}?${params.toString()}`
    if (nextUrl !== lastUrlRef.current) {
      lastUrlRef.current = nextUrl
      router.replace(nextUrl, { scroll: false })
    }
  }, [
    router,
    listingType,
    platform,
    categoryQuery,
    selectedCategories,
    location,
    sort,
    followersMin,
    selectedGenders,
    selectedLanguages,
    selectedAges,
    videography,
    price,
    page,
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
          sort,
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
    sort,
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
    setSort('newest')

    setCatOpen(false)
    setGenderOpen(false)
    setAgeOpen(false)
    setLangOpen(false)
    setLocationOpen(false)
    setFiltersDrawerOpen(false)
    setPage(1)
  }

  const pillsText = (arr: string[], labelMap: Record<string, string>, fallback: string) => {
    if (!arr.length) return fallback
    if (arr.length === 1) return labelMap[arr[0]] || arr[0]
    return `${arr.length} selected`
  }

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []

    if (platform !== 'any') {
      const label = PLATFORM_OPTIONS.find((x) => x.value === platform)?.label || platform
      chips.push({ key: `platform:${platform}`, label: `Platform: ${label}`, onRemove: () => setPlatform('any') })
    }

    for (const c of selectedCategories) {
      chips.push({
        key: `cat:${c}`,
        label: `Category: ${categoryLabels[c] || c}`,
        onRemove: () => setSelectedCategories((prev) => removeFromArray(prev, c)),
      })
    }

    if (location.trim()) {
      chips.push({ key: 'location', label: `Location: ${location}`, onRemove: () => setLocation('') })
    }

    if (listingType === 'influencer') {
      if (followersMin !== 'any') {
        const label = FOLLOWERS_OPTIONS.find((x) => x.value === followersMin)?.label || followersMin
        chips.push({ key: 'followersMin', label: `Followers: ${label}`, onRemove: () => setFollowersMin('any') })
      }

      for (const g of selectedGenders) {
        chips.push({
          key: `gender:${g}`,
          label: `Gender: ${genderLabels[g] || g}`,
          onRemove: () => setSelectedGenders((prev) => removeFromArray(prev, g)),
        })
      }

      for (const a of selectedAges) {
        chips.push({
          key: `age:${a}`,
          label: `Age: ${a}`,
          onRemove: () => setSelectedAges((prev) => prev.filter((x) => x !== a)),
        })
      }

      for (const l of selectedLanguages) {
        chips.push({
          key: `lang:${l}`,
          label: `Lang: ${languageLabels[l] || l}`,
          onRemove: () => setSelectedLanguages((prev) => removeFromArray(prev, l)),
        })
      }

      if (videography) {
        chips.push({ key: 'videography', label: 'Videography', onRemove: () => setVideography(false) })
      }
    } else {
      if (price !== 'any') {
        const label = PRICE_OPTIONS.find((x) => x.value === price)?.label || price
        chips.push({ key: 'budget', label: `Budget: ${label}`, onRemove: () => setPrice('any') })
      }
    }

    return chips
  }, [
    listingType,
    platform,
    selectedCategories,
    categoryLabels,
    location,
    followersMin,
    selectedGenders,
    genderLabels,
    selectedAges,
    selectedLanguages,
    languageLabels,
    videography,
    price,
  ])

  const canSaveSearch = !!me?.id && String(me?.role || '').toUpperCase() === 'BRAND'

  const defaultSaveName = useMemo(() => {
    const bits: string[] = []
    if (listingType === 'influencer' && selectedCategories.length === 1) bits.push(categoryLabels[selectedCategories[0]] || selectedCategories[0])
    if (location.trim()) bits.push(location)
    if (platform !== 'any') bits.push(PLATFORM_OPTIONS.find((x) => x.value === platform)?.label || platform)
    if (!bits.length) return 'My Search'
    return bits.join(' • ').slice(0, 80)
  }, [listingType, selectedCategories, categoryLabels, location, platform])

  const handleSaveSearch = async () => {
    try {
      setSavingSearch(true)
      const params = {
        type: listingType,
        platform,
        q: categoryQuery,
        categories: selectedCategories,
        location,
        sort,
        followersMin,
        genders: selectedGenders,
        languages: selectedLanguages,
        ageRanges: selectedAges,
        videography,
        budget: price,
      }

      const slug =
        listingType === 'influencer' && selectedCategories.length === 1 && location.trim()
          ? `${slugify(selectedCategories[0])}-${slugify(location)}`
          : null

            const res = await apiFetch('/api/saved-searches', {
        method: 'POST',
        body: JSON.stringify({
          type: listingType,
          name: (saveName || defaultSaveName).trim(),
          slug,
          tags: saveTags,
          params,
        }),
      })


      if (!res?.ok) throw new Error(res?.error || 'Failed to save')

       setSaveOpen(false)
      setSaveName('')
      setSaveTags([])
      setSaveTagInput('')
      alert('✅ Search saved')
    } catch (e: any) {
      alert(e?.message || 'Failed to save search')
    } finally {
      setSavingSearch(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav />

      {/* HERO */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-center">
            Influencer Marketing Made Easy
          </h1>
          <p className="mt-3 text-center text-slate-600 dark:text-zinc-300">Find and hire creators for your brand.</p>

          {/* SEARCH BAR */}
          <div className="mt-10 flex flex-col gap-3 items-center">
            {/* ✅ FIX: removed overflow-hidden so Category popup is never clipped */}
            <div className="w-full max-w-4xl rounded-3xl sm:rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative overflow-visible">
              <div className="flex flex-col sm:flex-row items-stretch rounded-3xl sm:rounded-full overflow-visible">
                {/* Platform */}
                <div className="sm:min-w-[190px] sm:border-r border-slate-200 dark:border-zinc-800 px-4 py-3">
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
                <div ref={catBoxRef} className="flex-1 px-4 py-3 relative">
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Category</div>

                  <div
                    onClick={() => setCatOpen(true)}
                    className="mt-1 flex flex-wrap items-center gap-2 rounded-2xl sm:rounded-none"
                  >
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-950 px-3 py-1 text-sm font-semibold"
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
                        className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title="Clear"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>

                  {catOpen ? (
                    <div className="absolute left-0 right-0 top-[88px] sm:top-[72px] z-50 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-4">
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
                                active
                                  ? 'bg-slate-100 dark:bg-zinc-900'
                                  : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
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

                {/* Search CTA */}
                <button
                  onClick={() => setCatOpen(false)}
                  className="sm:w-[64px] h-[48px] sm:h-auto flex items-center justify-center rounded-b-3xl sm:rounded-none sm:rounded-r-full bg-slate-900 text-white hover:bg-slate-800"
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
                  onClick={() => {
                    setListingType(type)
                    setPage(1)
                    // keep sort valid
                    if (type === 'brand' && sort === 'followers') setSort('newest')
                  }}
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

      {/* ✅ STICKY FILTER BAR (chips + sort + save search) */}
      <div className="sticky top-[64px] z-30 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-2">
            {/* top row: active chips */}
            <div className="flex items-center gap-2 overflow-auto no-scrollbar">
              <div className="shrink-0 text-sm font-semibold text-slate-700 dark:text-zinc-200">
                {loadingListings ? 'Updating…' : `${total.toLocaleString()} results`}
              </div>

              {activeFilterChips.length ? (
                <div className="flex items-center gap-2">
                  {activeFilterChips.map((c) => (
                    <button
                      key={c.key}
                      onClick={c.onRemove}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-900 px-3 py-1 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-zinc-800"
                      title="Remove filter"
                    >
                      {c.label}
                      <span className="opacity-60">✕</span>
                    </button>
                  ))}

                  <button
                    onClick={clearAll}
                    className="shrink-0 rounded-full border border-slate-200 dark:border-zinc-800 px-3 py-1 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-900"
                  >
                    Clear all
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-zinc-400">No filters applied</div>
              )}
            </div>

            {/* second row: filter controls (mobile-friendly) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFiltersDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 sm:hidden"
              >
                Filters
                <span className="text-xs opacity-60">({activeFilterChips.length})</span>
              </button>

              {/* Sort */}
              <div className="ml-auto flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold outline-none hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  {(listingType === 'influencer' ? SORT_OPTIONS_INFLUENCER : SORT_OPTIONS_BRAND).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {canSaveSearch ? (
                  <button
                    onClick={() => {
  setSaveName(defaultSaveName)
  setSaveTags([])
  setSaveTagInput('')
  setSaveOpen(true)
}}

                    className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
                  >
                    Save search
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER ROW + LIST */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop filter row */}
        <div className="hidden sm:flex flex-wrap items-center gap-3 mb-6">
          {listingType === 'influencer' ? (
            <>
              {/* Gender */}
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
                              active
                                ? 'bg-slate-100 dark:bg-zinc-900'
                                : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <div className="text-sm font-semibold">{g.label}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Age */}
              <div ref={ageBoxRef} className="relative">
                <button
                  onClick={() => setAgeOpen((v) => !v)}
                  className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  {pillsText(selectedAges, {}, 'Age')}
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
                            onClick={() => setSelectedAges((prev) => (active ? prev.filter((x) => x !== a.value) : [...prev, a.value]))}
                            className={`text-left px-3 py-2 rounded-xl ${
                              active
                                ? 'bg-slate-100 dark:bg-zinc-900'
                                : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <div className="text-sm font-semibold">{a.label}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Language */}
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
                              active
                                ? 'bg-slate-100 dark:bg-zinc-900'
                                : 'hover:bg-slate-50 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <div className="text-sm font-semibold">{l.label}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Followers */}
              <select
                value={followersMin}
                onChange={(e) => setFollowersMin(e.target.value)}
                className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold outline-none hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                {FOLLOWERS_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Videography */}
              <button
                onClick={() => setVideography((v) => !v)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 ${
                  videography
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                Videography
              </button>
            </>
          ) : (
            <>
              {/* Brand filters */}
              <select
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold outline-none hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                {PRICE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Location */}
          <div ref={locationBoxRef} className="relative">
            <button
              onClick={() => setLocationOpen((v) => !v)}
              className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              {location.trim() ? `Location: ${location}` : 'Location'}
            </button>

            {locationOpen ? (
              <div className="absolute z-50 mt-2 w-[320px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Search city / district</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Type e.g. Mumbai"
                  className="mt-2 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none"
                />

                <div className="mt-2 max-h-56 overflow-auto">
                  {locationSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLocation(s.label)
                        setLocationOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900"
                    >
                      <div className="text-sm font-semibold">{s.label}</div>
                    </button>
                  ))}

                  {!locationSuggestions.length && location.trim().length >= 2 ? (
                    <div className="px-3 py-2 text-sm text-slate-500 dark:text-zinc-400">No suggestions</div>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setLocation('')}
                    className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setLocationOpen(false)}
                    className="text-xs font-semibold underline text-slate-600 dark:text-zinc-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* GRID */}
        {loadingListings ? (
          <div className="py-10 text-center text-slate-600 dark:text-zinc-300">Loading…</div>
        ) : listings.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((it) => {
              const profileSlug = it.username || it.id
              return (
                <div
                  key={it.id}
                  className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition overflow-hidden"
                >
                <div className="p-5 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                    {it.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.avatarUrl} alt={it.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-slate-700 dark:text-zinc-200">{getInitials(it.displayName)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-lg truncate">{it.displayName}</div>
                        {it.title ? (
                          <div className="text-sm text-slate-600 dark:text-zinc-300 truncate">{it.title}</div>
                        ) : null}
                      </div>

                      <span className="shrink-0 text-xs font-bold rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1">
                        {it.type === 'INFLUENCER' ? 'Influencer' : 'Brand'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(it.categories || []).slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="text-xs font-semibold rounded-full bg-slate-100 dark:bg-zinc-800 px-3 py-1"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 text-sm text-slate-600 dark:text-zinc-300">
                      {it.locationLabel ? `📍 ${it.locationLabel}` : null}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      {it.type === 'INFLUENCER' ? (
                        <>
                          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Followers</div>
                            <div className="font-extrabold">{it.stats?.followers || '—'}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Platforms</div>
                            <div className="font-extrabold">{it.stats?.platforms ?? '—'}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Business</div>
                            <div className="font-extrabold">{it.stats?.businessType || '—'}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3">
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Budget</div>
                            <div className="font-extrabold">{it.stats?.budgetRange || '—'}</div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <Link
                        href={`/creator/${profileSlug}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
                      >
                        View profile
                      </Link>

                      <Link
                        href={`/contact/${it.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800"
                      >
                        Contact
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-600 dark:text-zinc-300">No results found.</div>
        )}

        {/* PAGINATION */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600 dark:text-zinc-300">
            Showing <b>{startIdx}</b>-<b>{endIdx}</b> of <b>{total}</b>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              Prev
            </button>

            {pageWindow.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  p === page
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-zinc-900"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* MOBILE FILTER DRAWER */}
      {filtersDrawerOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl p-4 overflow-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold">Filters</div>
              <button
                onClick={() => setFiltersDrawerOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Location</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mumbai"
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none"
                />
              </div>

              {listingType === 'influencer' ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Followers</div>
                    <select
                      value={followersMin}
                      onChange={(e) => setFollowersMin(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-semibold outline-none"
                    >
                      {FOLLOWERS_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Gender</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {genderList.map((g) => {
                        const active = selectedGenders.includes(g.value)
                        return (
                          <button
                            key={g.value}
                            onClick={() => setSelectedGenders((prev) => toggleInArray(prev, g.value))}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                              active
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {g.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Age</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ageList.map((a) => {
                        const active = selectedAges.includes(a.value)
                        return (
                          <button
                            key={a.value}
                            onClick={() =>
                              setSelectedAges((prev) => (active ? prev.filter((x) => x !== a.value) : [...prev, a.value]))
                            }
                            className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                              active
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {a.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Languages</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {languageList.map((l) => {
                        const active = selectedLanguages.includes(l.value)
                        return (
                          <button
                            key={l.value}
                            onClick={() => setSelectedLanguages((prev) => toggleInArray(prev, l.value))}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold ${
                              active
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {l.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => setVideography((v) => !v)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-extrabold ${
                      videography
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    Videography: {videography ? 'ON' : 'OFF'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Budget</div>
                    <select
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-semibold outline-none"
                    >
                      {PRICE_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <button
                  onClick={clearAll}
                  className="flex-1 rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-3 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
                >
                  Clear
                </button>
                <button
                  onClick={() => setFiltersDrawerOpen(false)}
                  className="flex-1 rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-extrabold hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SAVE SEARCH MODAL */}
      {saveOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSaveOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Save this search</div>
                <div className="text-sm text-slate-600 dark:text-zinc-300">You can re-use it later in your brand dashboard.</div>
              </div>
              <button
                onClick={() => setSaveOpen(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-900"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Name</div>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none"
              />
            </div>

                      {/* ✅ Tags */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Tags</div>

              {saveTags.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {saveTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSaveTags((prev) => prev.filter((x) => x !== t))}
                      className="rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1 text-xs font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
                      title="Remove tag"
                    >
                      #{t} <span className="opacity-60 ml-1">✕</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[12px] text-slate-500 dark:text-zinc-400">No tags yet.</div>
              )}

              <div className="mt-2 flex gap-2">
                <input
                  value={saveTagInput}
                  onChange={(e) => setSaveTagInput(e.target.value)}
                  placeholder="Add tags (comma separated), e.g. mumbai, beauty, ugc"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const next = normalizeTags([...saveTags, ...normalizeTags(saveTagInput)])
                      setSaveTags(next)
                      setSaveTagInput('')
                    }
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none"
                />
                <button
                  onClick={() => {
                    const next = normalizeTags([...saveTags, ...normalizeTags(saveTagInput)])
                    setSaveTags(next)
                    setSaveTagInput('')
                  }}
                  className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800"
                >
                  Add
                </button>
              </div>

              <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">
                Max 12 tags • press Enter to add
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
  setSaveOpen(false)
  setSaveTags([])
  setSaveTagInput('')
}}
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-sm font-extrabold hover:bg-slate-50 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                disabled={savingSearch}
                onClick={handleSaveSearch}
                className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800 disabled:opacity-50"
              >
                {savingSearch ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
