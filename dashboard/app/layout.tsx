import './globals.css'
import Head from 'next/head'

export const metadata = {
  title: 'Trading Agent Dashboard',
  description: 'Real-time trading agent monitoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="697e51cf2aafa0bc9ad8a313" />
      </head>
      <body>{children}</body>
    </html>
  )
}
