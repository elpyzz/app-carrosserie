"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-rose-50/40 to-gray-50">
          <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-lg border-2 border-gray-200">
            <h2 className="text-2xl font-bold text-red-700">Une erreur critique est survenue</h2>
            <p className="text-gray-600">{error.message || "Erreur inconnue"}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-lg hover:from-red-800 hover:to-red-900 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
