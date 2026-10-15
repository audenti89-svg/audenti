import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { SmartPwaFloatingBanner } from '@/components/ui/SmartPwaFloatingBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Audenti — DentalCloud Pro | Dra. Aura Estudillo',
  description: 'Plataforma integral de gestión clínica, CRM odontológico y expedientes bajo la dirección de la Dra. Aura Estudillo (Céd. Prof. 8492019)',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Audenti Pro',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#202D4C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        {/* PWA Universal Meta Tags (Android, iOS, Windows, macOS, Linux) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Audenti Pro" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Audenti Pro" />
        <meta name="msapplication-TileColor" content="#202D4C" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#202D4C" />

        {/* Tailwind CSS CDN de Respaldo Inmediato para Garantizar Renderizado 100% de Clases y Colores */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />

        {/* Registro Automático de Service Worker Universal */}
        <Script
          id="pwa-service-worker-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js')
                    .then(function(reg) {
                      console.log('[PWA] Service Worker registrado con éxito en:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[PWA] Fallo de registro de Service Worker:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#f8fafc] font-sans text-[#0f172a] antialiased">
        {children}
        <SmartPwaFloatingBanner />
      </body>
    </html>
  )
}
