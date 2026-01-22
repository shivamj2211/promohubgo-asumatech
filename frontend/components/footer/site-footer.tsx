import Link from 'next/link'
import { Instagram, Music2, Twitter } from 'lucide-react'

// Updated footer with "Legal" section
const footerSections = [
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Resource Hub', href: '/resources' },
      { label: 'Affiliate Program', href: '/affiliate' },
      { label: 'TikTok Ebook For Brands', href: '/resources/tiktok-ebook-brands' },
      { label: '2025 Influencer Marketing Report', href: '/resources/influencer-marketing-report-2025' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'Influencer Price Calculator', href: '/tools/influencer-price-calculator' },
      { label: 'Instagram Fake Follower Checker', href: '/tools/instagram-fake-follower-checker' },
      { label: 'TikTok Fake Follower Checker', href: '/tools/tiktok-fake-follower-checker' },
      { label: 'Engagement Rate Calculator', href: '/tools/engagement-rate-calculator' },
      { label: 'Campaign Brief Template', href: '/tools/campaign-brief-template' },
      { label: 'Contract Template', href: '/tools/contract-template' },
      { label: 'Analytics & Tracking', href: '/analytics' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Find Influencers', href: '/discover/find-influencers' },
      { label: 'Top Influencers', href: '/discover/top-influencers' },
      { label: 'Search Influencers', href: '/discover/search-influencers' },
      { label: 'Buy Shoutouts', href: '/discover/buy-shoutouts' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: '/support/contact-us' },
      { label: 'How It Works', href: '/support/how-it-works' },
      { label: 'FAQs', href: '/support/faqs' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Security', href: '/legal/security' },
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
