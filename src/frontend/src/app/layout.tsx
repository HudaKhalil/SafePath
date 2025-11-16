import './globals.css'
import Navbar from '../components/Navbar'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import BottonNav from '../components/BottomNav'
import Footer from '../components/Footer'

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: 'Safety Routing System',
  description: 'Find safer routes across London with intelligent routing, community insights, and real-time hazard awareness.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'London Safety Routing System',
    description: 'Find safer routes across London with intelligent routing, community insights, and real-time hazard awareness.',
    images: ['/logo.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen animate-fadeIn">{children}</main>
        <Footer />
      </body>
    </html>
  )
}