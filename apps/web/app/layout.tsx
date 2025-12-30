import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import type React from "react";
import "./globals.css";
import "@dnd-grid/react/styles.css";

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
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const GA_MEASUREMENT_ID = "G-H2PKLJ0615";
const siteUrl = "https://dnd-grid.com";
const siteTitle = "dnd-grid - React grid layout";
const siteDescription =
  "A drag-and-drop (DnD), resizable grid layout for React";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${albra.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      lang="en"
    >
      <body className="flex min-h-screen flex-col">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
        {children}
      </body>
    </html>
  );
}
