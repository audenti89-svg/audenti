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
  title: 'DentalCloud Pro — Dirección General Dra. Aura Estudillo',
  description: 'Plataforma SaaS integral de gestión clínica, multi-sucursal y franquicias odontológicas bajo la dirección de la Dra. Aura Estudillo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DentalCloud Pro',
  },
}

export const viewport: Viewport = {
  themeColor: '#202D4C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        {/* PWA Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DentalCloud Pro" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="DentalCloud Pro" />

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
