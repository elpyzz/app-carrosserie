import { isMaskedCredentials } from "./credentials-masker"

/**
 * Erreur de validation des credentials
 */
export class CredentialsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CredentialsValidationError"
  }
}

/**
 * Valide et nettoie les credentials avant stockage
 * @throws CredentialsValidationError si le format est invalide
 */
export function validateAndSanitizeCredentials(
  credentials: unknown
): Record<string, any> | null {
  // Si null/undefined, retourner null
  if (credentials === null || credentials === undefined) {
    return null
  }

  // Si c'est un credentials masqué, rejeter
  if (isMaskedCredentials(credentials)) {
    throw new CredentialsValidationError(
      "Impossible de sauvegarder des credentials masqués. Utilisez l'endpoint dédié pour modifier les credentials."
    )
  }

  // Si c'est une string vide, retourner null
  if (typeof credentials === "string" && credentials.trim() === "") {
    return null
  }

  // Si c'est une string, parser en JSON
  let parsed: unknown
  if (typeof credentials === "string") {
    try {
      parsed = JSON.parse(credentials)
    } catch {
      throw new CredentialsValidationError(
        "Format JSON invalide pour les credentials"
      )
    }
  } else {
    parsed = credentials
  }

  // Vérifier que c'est un objet
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CredentialsValidationError(
      "Les credentials doivent être un objet JSON"
    )
  }

  // Nettoyer les valeurs (trim les strings)
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    // Ignorer les clés vides
    if (!key.trim()) continue

    if (typeof value === "string") {
      // Trim et ignorer les valeurs vides
      const trimmed = value.trim()
      if (trimmed) {
        cleaned[key] = trimmed
      }
    } else if (value !== null && value !== undefined) {
      cleaned[key] = value
    }
  }

  // Si l'objet est vide après nettoyage, retourner null
  if (Object.keys(cleaned).length === 0) {
    return null
  }

  return cleaned
}

/**
 * Vérifie que des credentials existent et sont valides
 */
export function hasValidCredentials(credentials: unknown): boolean {
  if (!credentials) return false

  // Si c'est un credentials masqué
  if (isMaskedCredentials(credentials)) {
    return (credentials as { has_credentials: boolean }).has_credentials
  }

  // Si c'est une string
  if (typeof credentials === "string") {
    try {
      const parsed = JSON.parse(credentials)
      return (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Object.keys(parsed).length > 0
      )
    } catch {
      return false
    }
  }

  // Si c'est un objet
  if (typeof credentials === "object" && !Array.isArray(credentials)) {
    return Object.keys(credentials as object).length > 0
  }

  return false
}

/**
 * Fusionne les nouveaux credentials avec les existants
 * Utilisé pour les mises à jour partielles
 */
export function mergeCredentials(
  existing: unknown,
  updates: unknown
): Record<string, any> | null {
  // Parser les credentials existants
  let existingParsed: Record<string, any> = {}
  if (existing) {
    if (typeof existing === "string") {
      try {
        existingParsed = JSON.parse(existing)
      } catch {
        existingParsed = {}
      }
    } else if (typeof existing === "object" && !Array.isArray(existing)) {
      existingParsed = existing as Record<string, any>
    }
  }

  // Parser les nouveaux credentials
  const updatesParsed = validateAndSanitizeCredentials(updates)

  // Si pas de mises à jour, garder l'existant
  if (!updatesParsed) {
    return Object.keys(existingParsed).length > 0 ? existingParsed : null
  }

  // Fusionner (les updates écrasent l'existant)
  const merged = { ...existingParsed, ...updatesParsed }

  return Object.keys(merged).length > 0 ? merged : null
}
