import './globals.css'
import ConditionalLayout from '../components/ConditionalLayout'


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
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}