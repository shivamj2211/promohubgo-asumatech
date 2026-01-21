/*
 * This page represents the primary dashboard for a brand once
 * onboarding is complete.  It includes a navigation bar, a hero
 * section with a brief explanation of how the platform works, search
 * filters, and a list of placeholder influencer cards.  All
 * interactive functionality (searching, filtering, etc.) is left as
 * placeholders for your integration.
 */
'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fetchValues } from '@/lib/value-cache'

export default function BrandPage() {
  const [platforms, setPlatforms] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetchValues('brand', 'target_platforms')
        if (!active) return
        const items = Array.isArray(res) ? res : []
        setPlatforms(items)
      } catch {
        if (active) setPlatforms([])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation bar */}
      <nav className="w-full border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-indigo-700">promoHubgo</div>
        <div className="hidden md:flex gap-6 text-gray-700">
          <a href="#" className="hover:text-indigo-700">Home</a>
          <a href="#" className="hover:text-indigo-700">Library</a>
          <a href="#" className="hover:text-indigo-700 font-semibold">Search</a>
          <a href="#" className="hover:text-indigo-700">Campaigns</a>
          <a href="#" className="hover:text-indigo-700">Track</a>
          <a href="#" className="hover:text-indigo-700">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden md:inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            Post a Campaign
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100">
            {/* simple user avatar icon */}
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A6.982 6.982 0 0012 20a6.982 6.982 0 006.879-2.196M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </nav>
      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8">
        <section className="mb-10">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Here is 100+ Influencers for <span className="text-indigo-600">General</span>!</h2>
          <p className="text-gray-600 max-w-2xl mb-6">
            You are all set! Browse top influencers & start ordering high‑quality content from thousands of creators on promoHubgo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="text-indigo-600 font-bold">1</div>
              <div>
                <h3 className="font-semibold text-gray-900">Search Influencers</h3>
                <p className="text-gray-600 text-sm">Search through thousands of vetted Instagram, TikTok, and YouTube influencers.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-indigo-600 font-bold">2</div>
              <div>
                <h3 className="font-semibold text-gray-900">Purchase Securely</h3>
                <p className="text-gray-600 text-sm">Safely purchase through promoHubgo. We hold your payment until the work is completed.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-indigo-600 font-bold">3</div>
              <div>
                <h3 className="font-semibold text-gray-900">Receive Quality Content</h3>
                <p className="text-gray-600 text-sm">Receive your high‑quality content from influencers directly through the platform.</p>
              </div>
            </div>
          </div>
        </section>
        {/* Search bar & filters */}
        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Type here to search"
              className="flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button className="p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
          </div>
          {/* Filter chips; these are static placeholders.  You can programmatically
              render the selected categories/platforms as chips here. */}
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="font-medium">Platform:</span>
            <button className="px-3 py-1 border border-gray-300 rounded-full bg-gray-100 hover:bg-indigo-50">Any</button>
            {platforms.map((platform) => (
              <button
                key={platform.value}
                className="px-3 py-1 border border-gray-300 rounded-full bg-gray-100 hover:bg-indigo-50"
              >
                {platform.label || platform.value}
              </button>
            ))}
            {/* Add additional chips for price, followers, etc. */}
          </div>
        </section>
        {/* Placeholder influencer cards */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  {/* Image placeholder */}
                  <span className="text-gray-400">Image</span>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold mb-1">Influencer {idx + 1}</h4>
                  <p className="text-gray-600 text-sm mb-2">Category • Platform</p>
                  <button className="mt-2 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
