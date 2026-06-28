import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VETTOR 28 — Sistema de Gestão',
  description: 'Plataforma interna de gestão de clientes, resultados e entregas da agência VETTOR 28.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@300;400;500;600;700&family=Sora:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh">
        {children}
      </body>
    </html>
  )
}
