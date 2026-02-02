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
  
  try {
    await supabase.auth.getUser()
    // #region agent log - DISABLED
    // #endregion
  } catch (error: any) {
    // #region agent log - DISABLED
    // #endregion
  }

  return response
}
