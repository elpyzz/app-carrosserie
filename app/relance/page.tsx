"use client"

import { useState, useEffect } from "react"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { RelanceAssurances } from "./components/RelanceAssurances"
import { RelanceExpertsHistory } from "./components/RelanceExpertsHistory"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, UserCheck } from "lucide-react"

export const dynamic = 'force-dynamic'

export default function RelancePage() {
  const [mounted, setMounted] = useState(false)

  // Attendre que le composant soit monté côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Afficher un loader pendant le montage
  if (!mounted) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bordeaux-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="page-title">Relance</h1>
          <p className="text-gray-600">
            Gestion des relances assurances et historique des relances experts/clients
          </p>
        </div>

        <Tabs defaultValue="assurances" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="assurances" 
              className="flex items-center gap-2 data-[state=active]:bg-bordeaux-600 data-[state=active]:text-white"
            >
              <Building2 className="h-4 w-4" />
              <span>Assurances</span>
            </TabsTrigger>
            <TabsTrigger 
              value="experts" 
              className="flex items-center gap-2 data-[state=active]:bg-bordeaux-600 data-[state=active]:text-white"
            >
              <UserCheck className="h-4 w-4" />
              <span>Experts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assurances">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Factures impayées - Relances assurances
              </h3>
              <p className="text-sm text-gray-600">
                Uploadez les factures impayées. L'IA les scannera automatiquement et les relancera tous les 2 mois par email.
                Une fois payées, supprimez-les manuellement.
              </p>
            </div>
            <RelanceAssurances />
          </TabsContent>

          <TabsContent value="experts">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Historique des relances experts et clients
              </h3>
              <p className="text-sm text-gray-600">
                Consultez l'historique complet de toutes les relances envoyées aux experts et aux clients.
              </p>
            </div>
            <RelanceExpertsHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
