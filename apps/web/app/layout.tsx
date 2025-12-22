import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
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

const GA_MEASUREMENT_ID = "G-H2PKLJ0615";
const siteUrl = "https://dnd-grid.com";
const siteTitle = "dnd-grid - React grid layout";
const siteDescription = "A drag-and-drop (DnD), resizable grid layout for React";

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
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${albra.variable} font-sans antialiased min-h-screen`}
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
