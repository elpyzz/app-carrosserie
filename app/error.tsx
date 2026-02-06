"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error("Error boundary caught:", error)
  
  // Afficher un message d'erreur au lieu de null pour éviter l'écran blanc
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message || "Une erreur inattendue s'est produite"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-bordeaux-600 text-white rounded-lg hover:bg-bordeaux-700"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
