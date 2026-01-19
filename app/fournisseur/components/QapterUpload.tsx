"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react"
import { PieceResults } from "./PieceResults"
import { PieceResult } from "@/lib/fournisseur/types"

export function QapterUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PieceResult[]>([])
  const [extractedPieces, setExtractedPieces] = useState<string[]>([])
  const [error, setError] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
      setResults([])
      setExtractedPieces([])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier")
      return
    }

    setLoading(true)
    setError("")
    setResults([])
    setExtractedPieces([])

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/fournisseur/qapter", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors du traitement du dossier")
      }

      const data = await response.json()
      setExtractedPieces(data.extractedPieces || [])
      setResults(data.results || [])
    } catch (error: any) {
      console.error("Qapter upload error:", error)
      setError(error.message || "Une erreur est survenue lors du traitement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-bordeaux-600" />
            <span>Import Qapter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qapter-file">Fichier Qapter</Label>
            <div className="flex items-center space-x-4">
              <Input
                id="qapter-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-gray-900">
                Fichier sélectionné : {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {extractedPieces.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Pièces identifiées par l'IA :
              </p>
              <div className="flex flex-wrap gap-2">
                {extractedPieces.map((piece, index) => (
                  <Badge key={index} className="bg-green-100 text-green-800 border border-green-300">
                    {piece}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <PieceResults
          results={results}
          loading={false}
          onSave={() => {}}
          onViewSite={(result) => {
            if (result.produit_url) {
              window.open(result.produit_url, "_blank")
            }
          }}
        />
      )}
    </div>
  )
}
