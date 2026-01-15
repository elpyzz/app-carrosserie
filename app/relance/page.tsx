"use client"

import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { RelanceImpayes } from "./components/RelanceImpayes"
import { RelanceAssurances } from "./components/RelanceAssurances"
import { RelanceExperts } from "./components/RelanceExperts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, UserCheck, AlertCircle } from "lucide-react"

export default function RelancePage() {
  return (
    <AuthenticatedLayout>
      <div className="space-y-6 relative z-0">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-bordeaux-400 via-bordeaux-300 to-bordeaux-500 bg-clip-text text-transparent drop-shadow-sm">
            Relance
          </h1>
          <p className="text-gray-400 text-lg">
            Gestion centralisée de toutes les relances (clients, assurances, experts)
          </p>
        </div>

        <Tabs defaultValue="impayes" className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 shadow-xl">
            <TabsTrigger value="impayes" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <AlertCircle className="h-4 w-4" />
              <span>Impayés</span>
            </TabsTrigger>
            <TabsTrigger value="assurances" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <Building2 className="h-4 w-4" />
              <span>Assurances</span>
            </TabsTrigger>
            <TabsTrigger value="experts" className="flex items-center space-x-2 text-white data-[state=active]:text-white data-[state=active]:bg-bordeaux-500/30">
              <UserCheck className="h-4 w-4" />
              <span>Experts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="impayes">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 mb-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Relances clients - Impayés</h3>
              <p className="text-sm text-gray-300">
                Liste des factures impayées nécessitant une relance client. 
                Les données seront synchronisées depuis l'application externe.
              </p>
            </div>
            <RelanceImpayes />
          </TabsContent>

          <TabsContent value="assurances">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 mb-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Relances assurances</h3>
              <p className="text-sm text-gray-300">
                Dossiers nécessitant une relance auprès des assurances pour validation ou paiement.
              </p>
            </div>
            <RelanceAssurances />
          </TabsContent>

          <TabsContent value="experts">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 border-bordeaux-500/30 rounded-lg p-4 mb-4 shadow-xl">
              <h3 className="font-bold text-white mb-2">Relances experts</h3>
              <p className="text-sm text-gray-300">
                Dossiers nécessitant une relance auprès des experts pour obtenir les rapports manquants.
              </p>
            </div>
            <RelanceExperts />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
