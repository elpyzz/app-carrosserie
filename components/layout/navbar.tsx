"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Home, LogOut, Car, UserCheck, Store, Bell, Settings, Menu, X } from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/expert", label: "Experts", icon: UserCheck },
  { href: "/fournisseur", label: "Fournisseurs", icon: Store },
  { href: "/relance", label: "Relance", icon: Bell },
]

export function Navbar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-bordeaux-300 rounded-lg text-gray-900 hover:bg-gray-50 transition-all shadow-md"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar-glass w-[280px] flex flex-col fixed left-0 top-0 h-screen transition-transform duration-300 z-50 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
      {/* Logo */}
      <div className="p-6 border-b border-bordeaux-200">
        <Link 
          href="/dashboard" 
          className="flex items-center space-x-3 group"
        >
          <div className="bg-bordeaux-600 p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900 tracking-tight">
              Garage Rousseau
            </div>
            <div className="text-xs text-gray-900 font-medium">
              Gestion Sinistres
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative group ${
                isActive
                  ? "bg-bordeaux-600 text-white shadow-md border border-bordeaux-700"
                  : "text-gray-900 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-bordeaux-200"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-900 group-hover:text-gray-900"}`} />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute right-2 w-2 h-2 bg-white rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-bordeaux-200 space-y-2">
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
            pathname === "/settings"
              ? "bg-bordeaux-600 text-white shadow-md border border-bordeaux-700"
              : "text-gray-900 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span>Paramètres</span>
        </Link>
        <form action={signOut}>
          <Button 
            type="submit" 
            variant="ghost" 
            className="w-full justify-start text-gray-900 hover:text-gray-900 hover:bg-gray-100 border border-transparent hover:border-bordeaux-200 transition-all duration-300"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Déconnexion
          </Button>
        </form>
      </div>
    </aside>
    
    {/* Mobile overlay */}
    {isMobileOpen && (
      <div
        className="lg:hidden fixed inset-0 bg-black/20 z-40"
        onClick={() => setIsMobileOpen(false)}
      />
    )}
    </>
  )
}
