import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "App Carrosserie - Gestion Sinistres",
  description: "Application de gestion de sinistres pour carrossiers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/layout.tsx:12',message:'RootLayout rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
  }
  // #endregion

  return (
    <html lang="fr">
      <body className={inter.className}>
        <div className="floating-particles"></div>
        {children}
      </body>
    </html>
  )
}
