import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/actions/auth"
import { Navbar } from "./navbar"
import { Header } from "./header"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // #region agent log
  const logData = {location:'components/layout/authenticated-layout.tsx:6',message:'AuthenticatedLayout entry',data:{hasSupabase:!!process.env.NEXT_PUBLIC_SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'};
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch(()=>{});
  // #endregion

  // Allow access in mock mode (no Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/layout/authenticated-layout.tsx:14',message:'Rendering mock mode layout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <div className="min-h-screen flex">
        <Navbar />
        <div className="flex-1 flex flex-col ml-0 lg:ml-[280px]">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    )
  }

  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/layout/authenticated-layout.tsx:26',message:'Before getCurrentUser',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  const user = await getCurrentUser()

  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/layout/authenticated-layout.tsx:30',message:'After getCurrentUser',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (!user) {
    redirect("/login")
  }

  // #region agent log
  await fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/layout/authenticated-layout.tsx:35',message:'Rendering authenticated layout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  return (
    <div className="min-h-screen flex">
      <Navbar />
      <div className="flex-1 flex flex-col ml-0 lg:ml-[280px]">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
