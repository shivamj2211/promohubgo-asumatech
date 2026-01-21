'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import JourneyStepper from '@/components/JourneyStepper'

type CitySuggestion = { city: string; state: string }

type PincodeOffice = {
  officename: string
  pincode: number
  district: string
  statename: string
  latitude: string
  longitude: string
}

export default function Location() {
  const [location, setLocation] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [touched, setTouched] = useState(false)
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const [pincode, setPincode] = useState('')
  const [stateName, setStateName] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const [offices, setOffices] = useState<PincodeOffice[]>([])
  const [selectedOfficeName, setSelectedOfficeName] = useState('')
  const [useManualOffice, setUseManualOffice] = useState(false)
  const [manualOfficeName, setManualOfficeName] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [cityDialogOpen, setCityDialogOpen] = useState(false)

  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/me')
        if (!active) return
        const user = res?.user || {}
        const loc = user.userLocation || {}
        if (loc.pincode) setPincode(String(loc.pincode))
        if (loc.statename) setStateName(loc.statename)
        if (loc.district && loc.statename) {
          setLocation(`${loc.district}, ${loc.statename}`)
        }
        if (loc.fullAddress) setFullAddress(loc.fullAddress)
        if (loc.officename) setSelectedOfficeName(loc.officename)
      } catch {
        if (active) {
          return
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      const q = location.trim()
      if (!q) {
        setSuggestions([])
        return
      }

      setLoading(true)
      apiFetch(`/api/cities?q=${encodeURIComponent(q)}`)
        .then((data) => {
          const arr = Array.isArray(data?.data) ? data.data : []
          setSuggestions(
            arr
              .map((x: any) => ({
                city: x.office || x.city || x.district || '',
                state: x.state || x.statename || x.stateName || '',
              }))
              .filter((x: CitySuggestion) => x.city && x.state)
          )
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false))
    }, 180)

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [location])

  useEffect(() => {
    const pin = pincode.trim()

    if (!pin) {
      setPinError(null)
      setOffices([])
      setSelectedOfficeName('')
      return
    }

    if (!/^\d{6}$/.test(pin)) {
      setPinError('Please enter a valid 6-digit pincode')
      setOffices([])
      setSelectedOfficeName('')
      return
    }

    setPinError(null)

    const controller = new AbortController()

    ;(async () => {
      try {
        const data = await apiFetch(`/api/cities?pincode=${pin}`, { signal: controller.signal })
        const officesArr: PincodeOffice[] = Array.isArray(data?.data) ? (data.data as any) : []

        if (officesArr.length === 0) {
          setPinError('Pincode not found')
          setOffices([])
          setSelectedOfficeName('')
          return
        }

        const normalized: PincodeOffice[] = officesArr.map((o: any) => ({
          officename: o.officename || o.office || o.officeName || '',
          pincode: Number(o.pincode || o.pin || 0),
          district: o.district || '',
          statename: o.statename || o.state || '',
          latitude: String(o.latitude ?? ''),
          longitude: String(o.longitude ?? ''),
        }))

        setOffices(normalized)

        const primary = normalized[0]

        setStateName(primary.statename)
        setLocation(`${primary.district}, ${primary.statename}`)

        if (!useManualOffice) {
          setSelectedOfficeName(primary.officename)
        }

        setFullAddress((prev) =>
          prev.trim() ? prev : `${primary.officename}, ${primary.district}`
        )
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setPinError('Error fetching pincode details')
        }
      }
    })()

    return () => controller.abort()
  }, [pincode, useManualOffice])

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value)
    setShowDropdown(true)
  }

  const handleLocationBlur = () => {
    setTouched(true)
    setTimeout(() => setShowDropdown(false), 200)
  }

  const handleSelectCity = (city: string, state: string) => {
    setLocation(`${city}, ${state}`)
    setShowDropdown(false)
  }

  const handleLocationClear = () => {
    setLocation('')
    setShowDropdown(true)
  }

  const handleContinue = async () => {
    if (!canContinue) return
    const areaValue = (useManualOffice ? manualOfficeName : selectedOfficeName).trim()

    await apiFetch('/api/me/location', {
      method: 'PATCH',
      body: JSON.stringify({
        pincode: pincode.trim(),
        state: stateName.trim(),
        district: (location.split(',')[0] || '').trim(),
        city_label: location.trim(),
        area: areaValue,
        full_address: fullAddress.trim() || null,
        lat: null,
        lng: null,
        onboardingStep: 2,
      }),
    })

    setSaveDialogOpen(true)
  }

  const handleReset = () => {
    setLocation('')
    setShowDropdown(false)
    setTouched(false)
    setSuggestions([])

    setPincode('')
    setStateName('')
    setFullAddress('')
    setPinError(null)

    setOffices([])
    setSelectedOfficeName('')
    setUseManualOffice(false)
    setManualOfficeName('')
  }

  const locationError = touched && !location.trim()

  const handleOfficeSelect = (value: string) => {
    setSelectedOfficeName(value)

    const office = offices.find((o) => o.officename === value)
    if (office && !fullAddress.trim()) {
      setFullAddress(`${office.officename}, ${office.district}`)
    }
  }

  const toggleManualOffice = () => {
    setUseManualOffice((prev) => !prev)

    if (!useManualOffice) {
      setSelectedOfficeName('')
    } else {
      setManualOfficeName('')
    }
  }

  const handleCityHelp = () => {
    setCityDialogOpen(true)
  }

  const areaValue = (useManualOffice ? manualOfficeName : selectedOfficeName).trim()
  const isValidPincode = /^\d{6}$/.test(pincode.trim()) && !pinError
  const canContinue =
    location.trim().length > 0 &&
    isValidPincode &&
    stateName.trim().length > 0 &&
    areaValue.length > 0

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <Link href="/">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                promoHubgo
              </div>
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-lg p-8 md:p-10">
            <JourneyStepper />

            <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
              Where are you located?
            </h1>
            <p className="text-gray-600 dark:text-zinc-400 mb-6 text-sm">
              This helps us show your profile to the right audience
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) =>
                    setPincode(e.target.value.replace(/\\D/g, '').slice(0, 6))
                  }
                  placeholder="e.g. 504296"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 border-gray-300 dark:border-zinc-800 focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
                {pinError && (
                  <p className="mt-1 text-xs text-red-500">{pinError}</p>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={handleLocationBlur}
                  placeholder="Search city or state..."
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 pr-10 transition ${
                    locationError
                      ? 'border-red-500 focus:ring-red-600'
                      : 'border-gray-300 dark:border-zinc-800 focus:ring-indigo-600'
                  } dark:bg-zinc-900 dark:text-zinc-100`}
                />
                {location && (
                  <button
                    type="button"
                    onClick={handleLocationClear}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                    {loading && (
                      <div className="p-4 text-sm text-gray-500 dark:text-zinc-400">Searching...</div>
                    )}
                    {suggestions.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectCity(item.city, item.state)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800 last:border-b-0 transition"
                      >
                        <div className="font-medium text-gray-900 dark:text-zinc-100">{item.city}</div>
                        <div className="text-sm text-gray-500 dark:text-zinc-400">{item.state}</div>
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && !loading && suggestions.length === 0 && location.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-xl shadow-lg z-10 p-4">
                    <p className="text-gray-500 dark:text-zinc-400 text-center">No cities found</p>
                  </div>
                )}
              </div>

              {locationError && (
                <p className="text-red-500 text-sm">Location is required</p>
              )}

              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="State"
                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 border-gray-300 dark:border-zinc-800 focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Area / Locality
                    </label>
                    <button
                      type="button"
                      onClick={toggleManualOffice}
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      {useManualOffice
                        ? 'Use suggestions from pincode'
                        : "I don't see my area, enter manually"}
                    </button>
                  </div>

                  {!useManualOffice && (
                    <select
                      value={selectedOfficeName}
                      onChange={(e) => handleOfficeSelect(e.target.value)}
                      disabled={offices.length === 0}
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 border-gray-300 dark:border-zinc-800 focus:ring-indigo-600 bg-white dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {offices.length === 0 ? (
                        <option value="">No areas loaded yet</option>
                      ) : (
                        <>
                          <option value="">Select area / locality</option>
                          {offices.map((office, idx) => (
                            <option key={`${office.officename}-${idx}`} value={office.officename}>
                              {office.officename} ({office.district})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  )}

                  {useManualOffice && (
                    <input
                      type="text"
                      value={manualOfficeName}
                      onChange={(e) => setManualOfficeName(e.target.value)}
                      placeholder="Type your area / locality"
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 border-gray-300 dark:border-zinc-800 focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                  Full address <span className="text-[11px] text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  rows={3}
                  placeholder="House / flat, street, landmark... (optional)"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 border-gray-300 dark:border-zinc-800 focus:ring-indigo-600 resize-none dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full py-3 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Continue
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="w-full py-3 rounded-full"
              >
                Reset
              </Button>
            </div>

            <p
              className="text-center text-gray-600 dark:text-zinc-400 text-sm mt-6 cursor-pointer hover:text-indigo-600"
              onClick={handleCityHelp}
            >
              I don&apos;t see my city
            </p>
          </div>
        </div>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Location saved</DialogTitle>
            <DialogDescription>
              We&apos;ve captured your location details. You can update them later from your
              profile if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">City / Location:</span> {location}
            </p>
            <p>
              <span className="font-medium">Pincode:</span> {pincode}
            </p>
            <p>
              <span className="font-medium">State:</span> {stateName}
            </p>
            <p>
              <span className="font-medium">Area / Locality:</span>{' '}
              {(useManualOffice ? manualOfficeName : selectedOfficeName) || '(not specified)'}
            </p>
            <p>
              <span className="font-medium">Full address:</span>{' '}
              {fullAddress || '(optional, not provided)'}
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={() => {
                setSaveDialogOpen(false)
                router.push('/social-media')
              }}
              className="w-full sm:w-auto"
            >
              Okay, continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>City not found?</DialogTitle>
            <DialogDescription>
              No worries - our team is here to help you.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              It looks like your city isn&apos;t appearing in our list. This can happen if:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>You are trying to register from outside India, or</li>
              <li>Your city is not yet added to our service coverage.</li>
            </ul>
            <p className="mt-2">
              <span className="font-medium">promoHubgo currently serves locations in India only.</span>{' '}
              If you&apos;re from another country, we&apos;ll notify you as soon as we launch in your
              region.
            </p>
            <p className="mt-2">
              Please reach out to our customer care team from the{' '}
              <span className="font-medium">Help / Support</span> section in the app for manual
              assistance.
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => setCityDialogOpen(false)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
