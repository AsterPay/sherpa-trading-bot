import './globals.css'

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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
