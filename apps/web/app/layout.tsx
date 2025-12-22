import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "dnd-grid - React grid layout",
  description: "A drag-and-drop (DnD), resizable grid layout for React",
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
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
