"use client"

import { usePathname } from "next/navigation"
import { Search, Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

export function Header() {
  const pathname = usePathname()
  
  // Générer le fil d'Ariane basé sur le pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = ["Home"]
    
    if (segments.length === 0) {
      breadcrumbs.push("Dashboard")
    } else {
      segments.forEach((segment, index) => {
        const label = segment.charAt(0).toUpperCase() + segment.slice(1)
        breadcrumbs.push(label)
      })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()
  const currentDate = format(new Date(), "d MMM")

  return (
    <header className="navbar-gradient h-20 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      {/* Fil d'Ariane */}
      <div className="flex items-center space-x-2 text-xs lg:text-sm flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && <span className="text-gray-900">/</span>}
            <span className={index === breadcrumbs.length - 1 ? "text-gray-900 font-semibold" : "text-gray-900"}>
              {crumb}
            </span>
          </div>
        ))}
        <span className="text-gray-900 ml-2">/ {currentDate}</span>
      </div>

      {/* Actions à droite */}
      <div className="flex items-center space-x-2 lg:space-x-4">
        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-900 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-bordeaux-200 transition-all duration-300"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-900 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-bordeaux-200 transition-all duration-300 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-bordeaux-600 rounded-full"></span>
        </Button>

        {/* Avatar utilisateur */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-bordeaux-600 flex items-center justify-center border-2 border-bordeaux-700 shadow-md">
            <User className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  )
}
