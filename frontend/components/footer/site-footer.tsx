import Link from 'next/link'
import { Instagram, Music2, Twitter } from 'lucide-react'

// Updated footer with "Legal" section
const footerSections = [
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '#' },
      { label: 'Resource Hub', href: '#' },
      { label: 'Affiliate Program', href: '#' },
      { label: 'TikTok Ebook For Brands', href: '#' },
      { label: '2025 Influencer Marketing Report', href: '#' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'Influencer Price Calculator', href: '#' },
      { label: 'Instagram Fake Follower Checker', href: '#' },
      { label: 'TikTok Fake Follower Checker', href: '#' },
      { label: 'Engagement Rate Calculator', href: '#' },
      { label: 'Campaign Brief Template', href: '#' },
      { label: 'Contract Template', href: '#' },
      { label: 'Analytics & Tracking', href: '#' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Find Influencers', href: '#' },
      { label: 'Top Influencers', href: '#' },
      { label: 'Search Influencers', href: '#' },
      { label: 'Buy Shoutouts', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: '#' },
      { label: 'How It Works', href: '#' },
      { label: 'FAQs', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-white mt-16 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-8">
          {footerSections.map((col) => (
            <div key={col.title}>
              <h4 className="font-bold mb-4">{col.title}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <p className="text-gray-400 text-xs sm:text-sm">
            © {new Date().getFullYear()} PromoHubGo. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-gray-400">
            <Link href="#" className="hover:text-white" aria-label="Instagram">
              <Instagram className="w-5 h-5" />
            </Link>
            <Link href="#" className="hover:text-white" aria-label="TikTok">
              <Music2 className="w-5 h-5" />
            </Link>
            <Link href="#" className="hover:text-white" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </Link>
          </div>

          <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            PromoHubGo
          </div>
        </div>
      </div>
    </footer>
  )
}
