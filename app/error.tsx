"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Ne rien afficher - l'erreur sera loggée dans la console uniquement
  console.error("Error boundary caught:", error)
  
  // Retourner null pour ne rien afficher
  return null
}
