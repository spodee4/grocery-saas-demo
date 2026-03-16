import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Space_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { BottomNav } from "@/components/BottomNav"
import { CoachChat } from "@/components/CoachChat"

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "John Coach",
  description: "John's personal health & training coach",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "John Coach" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${jakarta.variable} ${spaceMono.variable} antialiased bg-background text-foreground`}>
        <Providers>
          <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
            <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
            <BottomNav />
            <CoachChat />
          </div>
        </Providers>
      </body>
    </html>
  )
}
