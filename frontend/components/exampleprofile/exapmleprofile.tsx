'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Star, Zap, Instagram, Music2 } from 'lucide-react'
import { cn } from '@/lib/utils' // if you don't have this, replace cn(...) with simple className strings

export function ExampleProfileDialog() {
  const [open, setOpen] = useState(false)
  const [activePackageTab, setActivePackageTab] = useState<'all' | 'instagram' | 'tiktok' | 'ugc'>(
    'all'
  )
  const [faqOpen, setFaqOpen] = useState(false)

  const handleTabClick = (tab: 'all' | 'instagram' | 'tiktok' | 'ugc') => {
    setActivePackageTab(tab)
  }

  const exampleDescription =
    "I'm a fashion model and content creator, and I really enjoy photography and product photo shoots. Most of my content is centered around modeling and product shoots for fashion and beauty products. I like to take a modern approach to my content, and I'm always experimenting with new styles!"

  const faqAnswer =
    'My audience is mainly females aged 25–35. They are into fashion and beauty and are located primarily in the United States.'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger button – drop this wherever you want the “View Example Profile” button */}
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 rounded-full border text-xs font-medium text-gray-800 bg-gray-100">
          View Example Profile
        </button>
      </DialogTrigger>

      {/* Bottom-sheet style content */}
      <DialogContent
        className="
          fixed bottom-0 left-0 right-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2
          max-h-[92vh] sm:max-w-lg
          rounded-t-3xl sm:rounded-3xl
          p-0 overflow-hidden
        "
      >
        {/* Header with close */}
        <DialogHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold">
            Example Creator Profile
          </DialogTitle>
          
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(92vh-56px)]">
          {/* Hero image */}
          <div className="relative">
            <Image
              src="https://images.pexels.com/photos/6311572/pexels-photo-6311572.jpeg"
              alt="Example creator"
              width={800}
              height={500}
              className="w-full h-56 sm:h-64 object-cover"
            />
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              2/4
            </div>
          </div>

          {/* Main content */}
          <div className="px-4 pt-4 pb-6 space-y-4">
            {/* Name + avatar + meta */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Fashion &amp; Beauty Content Creator
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Surbhi Sharma | Los Angeles, CA, United States
                </p>
              </div>

              <div className="w-10 h-10 rounded-full overflow-hidden border">
                <Image
                  src="https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg"
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Followers badges */}
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                <Instagram className="w-3 h-3" />
                <span>500k–1m Followers</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                <Music2 className="w-3 h-3" />
                <span>100k–500k Followers</span>
              </div>
            </div>

            {/* Badges */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-1">
                  <Star className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Surbhi is a Top Creator</p>
                  <p className="text-xs text-gray-500">
                    Top creators have completed multiple orders and have a high rating from brands.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1">
                  <Zap className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Surbhi Responds Fast</p>
                  <p className="text-xs text-gray-500">
                    Surbhi responds to requests faster than most creators.
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-gray-700 leading-relaxed">{exampleDescription}</p>

            {/* Packages section */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-3">Packages</h3>

              {/* Tabs */}
              <div className="flex gap-2 mb-3">
                {(['all', 'instagram', 'tiktok', 'ugc'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                      activePackageTab === tab
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent'
                        : 'bg-gray-100 text-gray-700 border-transparent'
                    )}
                  >
                    {tab === 'all'
                      ? 'All'
                      : tab === 'instagram'
                      ? 'Instagram'
                      : tab === 'tiktok'
                      ? 'TikTok'
                      : 'UGC'}
                  </button>
                ))}
              </div>

              {/* Example package card */}
              <div className="border rounded-2xl p-3 text-sm bg-white">
                <p className="font-semibold mb-1">
                  1 Instagram Photo Feed Post
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  I will create an Instagram post capturing your product and speaking about the
                  product in the caption. I am also able to tag your page in the photo…
                </p>
                <button className="text-xs underline mt-1">See More</button>

                <div className="mt-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border flex items-center justify-center">
                    <Instagram className="w-3 h-3 text-pink-500" />
                  </div>
                  <span className="text-xs text-gray-600">Instagram</span>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">FAQ</h3>

              <button
                type="button"
                onClick={() => setFaqOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-sm font-medium py-2"
              >
                <span>Who is your audience?</span>
                <span className="text-xl leading-none">
                  {faqOpen ? '×' : '+'}
                </span>
              </button>

              {faqOpen && (
                <p className="mt-1 text-xs text-gray-700">
                  {faqAnswer}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
