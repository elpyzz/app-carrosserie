import { createClient } from "@/lib/supabase/server"
import AuthenticatedLayout from "@/components/layout/authenticated-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Plus, Search, Phone, Mail, Globe } from "lucide-react"

async function getSuppliers() {
  const supabase = await createClient()

  // Mock data if Supabase not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return []
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("actif", true)
    .order("nom", { ascending: true })

  if (error) {
    console.error("Error fetching suppliers:", error)
    return []
  }

  return data || []
}

export default async function FournisseursPage() {
  // Allow access in mock mode
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }
  }

  const suppliers = await getSuppliers()

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">
              Fournisseurs
            </h1>
            <p className="text-gray-900 mt-2">Répertoire des fournisseurs de pièces</p>
          </div>
          <Link href="/fournisseurs/new">
            <Button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un fournisseur
            </Button>
          </Link>
        </div>

        {/* Liste */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier: any) => (
            <Card key={supplier.id} className="card-gradient">
              <CardHeader>
                <CardTitle className="text-gray-900">{supplier.nom}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {supplier.contact && (
                  <p className="text-sm text-gray-900">Contact: {supplier.contact}</p>
                )}
                {supplier.telephone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-900" />
                    <a
                      href={`tel:${supplier.telephone}`}
                      className="text-bordeaux-700 hover:text-bordeaux-800 hover:underline"
                    >
                      {supplier.telephone}
                    </a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-900" />
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-bordeaux-700 hover:text-bordeaux-800 hover:underline"
                    >
                      {supplier.email}
                    </a>
                  </div>
                )}
                {supplier.site_web && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Globe className="h-4 w-4 text-gray-900" />
                    <a
                      href={supplier.site_web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bordeaux-700 hover:text-bordeaux-800 hover:underline"
                    >
                      Site web
                    </a>
                  </div>
                )}
                {supplier.notes && (
                  <p className="text-sm text-gray-900 mt-2">{supplier.notes}</p>
                )}
                <Link href={`/fournisseurs/recherche?supplier=${supplier.id}`}>
                  <Button size="sm" variant="outline" className="w-full mt-4">
                    Rechercher une pièce
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {suppliers.length === 0 && (
          <Card className="card-gradient">
            <CardContent className="py-12 text-center">
              <p className="text-gray-900">Aucun fournisseur enregistré</p>
              <Link href="/fournisseurs/new">
                <Button className="btn-primary mt-4">Ajouter le premier fournisseur</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
