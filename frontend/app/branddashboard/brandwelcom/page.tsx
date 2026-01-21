/*
 * Immediately after completing the onboarding flow the user arrives on
 * this page.  It displays the brand dashboard with a simple two‑step
 * tour overlay.  The overlay darkens the background and presents
 * contextual instructions.  Once the tour is finished the user is
 * redirected to the brand page without any overlays.  You can extend
 * this to include additional steps as required.
 */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BrandPage from '../brandmain/page.tsx'

export default function WelcomeAfterBrand() {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      // End of tour
      router.push('/branddashboard/brandmain')
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  // Content for each step.  Feel free to customize these strings or add more.
  const steps = [
    {
      title: 'Welcome to promoHubgo!',
      description: 'Use the filters below to refine your search for the perfect influencers.',
    },
    {
      title: 'Browse & Hire',
      description: 'Click on any influencer card to view their profile and hire them securely.',
    },
  ]

  return (
    <div className="relative min-h-screen">
      {/* Render the underlying brand dashboard */}
      <BrandPage />
      {/* Overlay – shown only during the tour */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center relative">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{steps[step - 1].title}</h2>
          <p className="text-gray-600 mb-4">{steps[step - 1].description}</p>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span>{step} of {steps.length}</span>
            <div className="space-x-2">
              {step > 1 && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Previous
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                {step < steps.length ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}