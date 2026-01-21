import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PromoHubGo - Influencer Marketplace',
  description: 'Connect with top influencers and brands',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-100`}
      >
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
          {children}
        </main>
      </body>
    </html>
  )
}
