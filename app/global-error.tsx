"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Ne rien afficher - l'erreur sera loggée dans la console uniquement
  console.error("Global error boundary caught:", error)
  
  // Retourner le HTML minimal sans message d'erreur
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-900">Chargement...</p>
          </div>
        </div>
      </body>
    </html>
  )
}
