import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"

const albra = localFont({
  src: [
    {
      path: "../public/fonts/albra-light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/albra-regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-albra",
})

export const metadata: Metadata = {
  title: "dnd-grid - React Grid Layout",
  description: "A draggable and resizable grid layout for React",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${albra.variable} font-sans antialiased`}>
      <body className="min-h-screen">
        <SiteHeader />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  )
}
