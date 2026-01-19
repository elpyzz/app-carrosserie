"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/error.tsx:7',message:'Error boundary rendered',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200),digest:error?.digest},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  fetch('http://127.0.0.1:7242/ingest/dd01c13f-3adb-44dd-ab15-9d28649f71ca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/error.tsx:8',message:'Error component rendering',data:{hasError:!!error,errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // Ne rien afficher - l'erreur sera loggée dans la console uniquement
  console.error("Error boundary caught:", error)
  
  // Retourner null pour ne rien afficher
  return null
}
