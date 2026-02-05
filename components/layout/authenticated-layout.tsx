import { Navbar } from "./navbar"
import { Header } from "./header"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Le middleware gère déjà l'authentification et la redirection
  // Pas besoin de vérifier à nouveau ici pour éviter les conflits
  // Si l'utilisateur n'est pas authentifié, le middleware l'a déjà redirigé vers /login
  
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
