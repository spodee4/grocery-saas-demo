import type { Metadata } from "next"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"

export const metadata: Metadata = {
  title: "Store Intelligence",
  description: "BRdata-connected financial intelligence for independent grocers",
  icons: { icon: "/logo.svg" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground min-h-screen flex">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
