import "./globals.css";
import "github-markdown-css/github-markdown.css";
import Script from "next/script";

import { antonio, poppins } from "./fonts";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "./lib/seo";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GitHance | GitHub README Generator, Profile Builder, and Repository Analyzer",
    template: "%s | GitHance",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: DEFAULT_KEYWORDS,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: "GitHance | GitHub README Generator, Profile Builder, and Repository Analyzer",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        alt: "GitHance GitHub optimization workspace preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHance | GitHub README Generator, Profile Builder, and Repository Analyzer",
    description: SITE_DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "developer productivity",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${antonio.variable} ${poppins.variable} bg-[#0b0d0f] text-white antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          Skip to content
        </a>

        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KZ9DS1SGYY"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-KZ9DS1SGYY');
          `}
        </Script>
      </body>
    </html>
  );
}