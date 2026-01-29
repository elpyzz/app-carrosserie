/**
 * Représentation masquée des credentials
 */
export interface MaskedCredentials {
  has_credentials: boolean
}

/**
 * Masque un objet credentials pour qu'il ne soit jamais exposé
 * @returns null si pas de credentials, { has_credentials: true } sinon
 */
export function maskCredentials(credentials: unknown): MaskedCredentials | null {
  if (!credentials) return null

  // Si c'est un objet avec des valeurs
  if (typeof credentials === "object" && !Array.isArray(credentials)) {
    const obj = credentials as Record<string, unknown>
    if (Object.keys(obj).length > 0) {
      return { has_credentials: true }
    }
  }

  // Si c'est une string non vide (JSON stringifié)
  if (typeof credentials === "string" && credentials.trim().length > 0) {
    try {
      const parsed = JSON.parse(credentials)
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        return { has_credentials: true }
      }
    } catch {
      // Si ce n'est pas du JSON valide, considérer comme vide
    }
  }

  return null
}

/**
 * Masque les credentials dans un objet site (expert ou fournisseur)
 * Retourne un nouveau objet avec credentials masqués
 */
export function maskSiteCredentials<T extends Record<string, any>>(
  site: T
): Omit<T, "credentials"> & { credentials: MaskedCredentials | null } {
  if (!site) return site

  const { credentials, ...rest } = site
  return {
    ...rest,
    credentials: maskCredentials(credentials),
  } as Omit<T, "credentials"> & { credentials: MaskedCredentials | null }
}

/**
 * Masque les credentials dans un tableau de sites
 */
export function maskSitesCredentials<T extends Record<string, any>>(
  sites: T[]
): Array<Omit<T, "credentials"> & { credentials: MaskedCredentials | null }> {
  if (!sites || !Array.isArray(sites)) return []
  return sites.map((site) => maskSiteCredentials(site))
}

/**
 * Nettoie un objet pour les logs d'audit (supprime les credentials et champs sensibles)
 */
export function sanitizeForAuditLog(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== "object") return {}

  const sanitized = { ...data }

  // Liste des champs sensibles à masquer
  const sensitiveFields = [
    "credentials",
    "password",
    "token",
    "api_key",
    "apiKey",
    "auth_token",
    "authToken",
    "secret",
    "private_key",
    "privateKey",
    "twilio_auth_token",
    "twilioAuthToken",
  ]

  sensitiveFields.forEach((field) => {
    if (sanitized[field] !== undefined) {
      // Indiquer qu'il y avait une valeur sans l'exposer
      sanitized[field] = sanitized[field] ? "[PRÉSENT - MASQUÉ]" : null
    }
  })

  // Traiter récursivement les objets imbriqués
  Object.keys(sanitized).forEach((key) => {
    if (
      sanitized[key] &&
      typeof sanitized[key] === "object" &&
      !Array.isArray(sanitized[key])
    ) {
      sanitized[key] = sanitizeForAuditLog(sanitized[key])
    }
  })

  return sanitized
}

/**
 * Nettoie un message d'erreur pour éviter d'exposer des informations sensibles
 */
export function sanitizeErrorMessage(error: unknown): string {
  let message: string

  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === "string") {
    message = error
  } else {
    message = "Erreur inconnue"
  }

  // Patterns sensibles à remplacer
  const sensitivePatterns: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /password[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "password=[REDACTED]" },
    { pattern: /token[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "token=[REDACTED]" },
    { pattern: /api[_-]?key[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "api_key=[REDACTED]" },
    { pattern: /credential[s]?[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "credentials=[REDACTED]" },
    { pattern: /auth[_-]?token[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "auth_token=[REDACTED]" },
    { pattern: /secret[=:]\s*["']?[^"'\s,}]+["']?/gi, replacement: "secret=[REDACTED]" },
    // Patterns pour les valeurs qui ressemblent à des credentials
    { pattern: /AC[a-f0-9]{32}/gi, replacement: "[TWILIO_SID_REDACTED]" }, // Twilio SID
    { pattern: /sk-[a-zA-Z0-9]{48}/gi, replacement: "[API_KEY_REDACTED]" }, // OpenAI key
    { pattern: /re_[a-zA-Z0-9_]{30,}/gi, replacement: "[RESEND_KEY_REDACTED]" }, // Resend key
  ]

  sensitivePatterns.forEach(({ pattern, replacement }) => {
    message = message.replace(pattern, replacement)
  })

  return message
}

/**
 * Vérifie si une valeur est un credentials masqué (pour éviter de l'envoyer au serveur)
 */
export function isMaskedCredentials(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  return "has_credentials" in obj && Object.keys(obj).length === 1
}
