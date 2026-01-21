'use client'
import MobileDatePicker from '@/components/ui/mobile-date-picker'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'
import JourneyStepper from '@/components/JourneyStepper'

export default function ProfileDetailsPage() {
  const router = useRouter()

  const [gender, setGender] = useState<string>('')
  const [dob, setDob] = useState('January 1, 1994')
  const [openDatePicker, setOpenDatePicker] = useState(false)

  const [languages, setLanguages] = useState<string[]>([])
  const [genderOptions, setGenderOptions] = useState<
    Array<{ value: string; label: string }>
  >([])
  const [languageOptions, setLanguageOptions] = useState<
    Array<{ value: string; label: string }>
  >([])

  const [whyDialogOpen, setWhyDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [backHref, setBackHref] = useState('/signup')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [meRes, gendersRes, languagesRes] = await Promise.all([
          apiFetch('/api/me'),
          fetchValues('influencer', 'gender_options'),
          fetchValues('influencer', 'languages'),
        ])
        if (!active) return
        const user = meRes?.user || {}
        const profile = user.influencerProfile || {}
        const genders = Array.isArray(gendersRes) ? gendersRes : []
        const langs = Array.isArray(languagesRes) ? languagesRes : []
        setGenderOptions(genders)
        setLanguageOptions(langs)
        if (profile.gender) {
          const match = genders.find(
            (opt: any) =>
              String(opt.value).toLowerCase() === String(profile.gender).toLowerCase() ||
              String(opt.label || '').toLowerCase() === String(profile.gender).toLowerCase()
          )
          setGender(match?.value || String(profile.gender))
        } else if (genders[0]?.value) {
          setGender(genders[0].value)
        }
        if (profile.dob) setDob(profile.dob)
        if (Array.isArray(profile.languages)) {
          const normalized = profile.languages.map((lang: string) => {
            const match = langs.find(
              (opt: any) =>
                String(opt.value).toLowerCase() === String(lang).toLowerCase() ||
                String(opt.label || '').toLowerCase() === String(lang).toLowerCase()
            )
            return match?.value || String(lang)
          })
          setLanguages(normalized)
        }
        setBackHref('/signup')
      } catch {
        if (active) setBackHref('/signup')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  function toISODate(dateStr: string) {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return null
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const handleContinue = async () => {
    try {
      setSaving(true)

      const dobIso = toISODate(dob)

      await apiFetch('/api/influencer/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          gender: gender || null,
          dob: dobIso,
          onboardingStep: 1,
        }),
      })

      await apiFetch('/api/influencer/languages', {
        method: 'PUT',
        body: JSON.stringify({
          languages,
          onboardingStep: 1,
        }),
      })

      router.push('/location')
    } catch (e: any) {
      alert(e?.message || 'Failed to save profile details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
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

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">
            Help Brands Discover You
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
            Share a few details about yourself so we can match you with the right brand
            opportunities and help your profile stand out in search.
          </p>

          <div className="space-y-4 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="border rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer dark:border-zinc-800">
                  <span className="text-sm text-gray-800 dark:text-zinc-100">
                    {genderOptions.find((opt) => opt.value === gender)?.label || 'Select gender'}
                  </span>
                  <span className="text-gray-500 text-xs">v</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full">
                {genderOptions.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setGender(opt.value)}>
                    {opt.label || opt.value}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div
              className="border rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer dark:border-zinc-800"
              onClick={() => setOpenDatePicker(true)}
            >
              <span className="text-sm text-gray-800 dark:text-zinc-100">{dob}</span>
              <CalendarIcon className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
            </div>
            <MobileDatePicker
              open={openDatePicker}
              onOpenChange={setOpenDatePicker}
              onSelect={(date: string) => setDob(date)}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="border rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer dark:border-zinc-800">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {languages.length ? 'Update your languages' : 'Select your language'}
                  </span>
                  <span className="text-gray-500 text-xs">v</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-full">
                {languageOptions.map((lang) => (
                  <DropdownMenuItem
                    key={lang.value}
                    onClick={() => toggleLanguage(lang.value)}
                    className="flex items-center justify-between"
                  >
                    <span>{lang.label || lang.value}</span>
                    <input
                      type="checkbox"
                      checked={languages.includes(lang.value)}
                      onChange={() => toggleLanguage(lang.value)}
                      className="ml-2"
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {languages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-zinc-900 text-xs text-gray-800 dark:text-zinc-200 flex items-center gap-1"
                  >
                    {languageOptions.find((opt) => opt.value === lang)?.label || lang}{' '}
                    <span className="text-gray-500">x</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={saving}
              className="w-full py-3 rounded-full bg-black text-white hover:bg-black/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Continue'}
            </Button>

            <p
              onClick={() => setWhyDialogOpen(true)}
              className="mt-3 text-center text-[11px] text-gray-500 dark:text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-gray-700 dark:hover:text-zinc-300"
            >
              Why do you ask this?
            </p>
          </div>
        </div>
      </div>

      <Dialog open={whyDialogOpen} onOpenChange={setWhyDialogOpen}>
        <DialogContent
          className="
            max-w-full
            rounded-t-3xl
            fixed bottom-0 left-0 right-0
            animate-slideUp
            bg-white
            p-6
            pb-8
            shadow-xl
            border-t
            sm:max-w-md sm:rounded-xl sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]
          "
        >
          <div className="w-full flex justify-center mb-3">
            <div className="h-1.5 w-12 bg-gray-300 rounded-full"></div>
          </div>

          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              Why We Ask This
            </DialogTitle>
            <DialogDescription className="text-center">
              Transparency helps you trust the process.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 text-sm text-gray-700 space-y-3">
            <p>
              To help brands discover the right creators for their campaigns, we ask for basic
              demographic information such as age, gender, ethnicity, and languages.
            </p>

            <p>
              This information helps us improve your matches, show you relevant opportunities,
              and personalize your experience on the platform.
            </p>

            <p>
              Your details are <span className="font-semibold">never shared publicly</span> and are
              only used to optimize your recommendations and improve the quality of collaborations
              you receive.
            </p>
          </div>

          <div className="mt-6">
            <Button
              onClick={() => setWhyDialogOpen(false)}
              className="w-full rounded-full py-3"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
