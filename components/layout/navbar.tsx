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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg text-white hover:bg-white/20 transition-all"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar-glass w-[280px] flex flex-col fixed left-0 top-0 h-screen transition-transform duration-300 z-50 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
      {/* Logo */}
      <div className="p-6 border-b border-white/20 border-bordeaux-500/30">
        <Link 
          href="/dashboard" 
          className="flex items-center space-x-3 group"
        >
          <div className="bg-gradient-to-br from-bordeaux-600 via-bordeaux-700 to-bordeaux-800 p-3 rounded-xl shadow-xl shadow-bordeaux-900/30 group-hover:shadow-2xl group-hover:shadow-bordeaux-900/40 transition-all duration-300 transform group-hover:scale-105">
            <Car className="h-6 w-6 text-white drop-shadow-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight">
              Garage Rousseau
            </div>
            <div className="text-xs text-gray-400 font-medium">
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
                  ? "bg-gradient-to-r from-bordeaux-700 to-bordeaux-800 text-white shadow-xl shadow-bordeaux-900/40 border border-bordeaux-600/30"
                  : "text-gray-300 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/20"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute right-2 w-2 h-2 bg-white rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/20 border-bordeaux-500/30 space-y-2">
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
            pathname === "/settings"
              ? "bg-gradient-to-r from-bordeaux-700 to-bordeaux-800 text-white shadow-xl shadow-bordeaux-900/40"
              : "text-gray-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span>Paramètres</span>
        </Link>
        <form action={signOut}>
          <Button 
            type="submit" 
            variant="ghost" 
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-all duration-300"
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
        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={() => setIsMobileOpen(false)}
      />
    )}
    </>
  )
}
