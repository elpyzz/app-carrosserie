import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/actions/auth"
import { Navbar } from "./navbar"
import { Header } from "./header"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Allow access in mock mode (no Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
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

  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

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
