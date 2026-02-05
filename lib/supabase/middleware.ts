import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // #region agent log - DISABLED: fetch may not work in Edge Runtime
  // Logs disabled in middleware to avoid Edge Runtime issues
  // #endregion
  
  // Redirect root to login
  if (request.nextUrl.pathname === '/') {
    // #region agent log - DISABLED
    // #endregion
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip Supabase if not configured (mock mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // #region agent log - DISABLED
    // #endregion
    return response
  }

  // #region agent log - DISABLED
  // #endregion
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // #region agent log - DISABLED
  // #endregion
  
  // Vérifier l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Routes protégées qui nécessitent une authentification
  const protectedRoutes = ['/dashboard', '/dossiers', '/expert', '/fournisseur', '/relance', '/settings', '/fournisseurs']
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Si c'est une route protégée et que l'utilisateur n'est pas authentifié, rediriger vers login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si l'utilisateur est authentifié et essaie d'accéder à /login, rediriger vers dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
