// Mock Supabase client for local development without database
export const createMockClient = () => {
  const createQueryBuilder = (initialData: any[] = []) => {
    let data = initialData
    const builder: any = {
      eq: (col: string, val: any) => {
        data = data.filter((item: any) => item[col] === val)
        return builder
      },
      in: (col: string, vals: any[]) => {
        data = data.filter((item: any) => vals.includes(item[col]))
        return builder
      },
      is: (col: string, val: any) => {
        if (val === null) {
          data = data.filter((item: any) => item[col] === null || item[col] === undefined)
        } else {
          data = data.filter((item: any) => item[col] === val)
        }
        return builder
      },
      or: (query: string) => builder, // Simplified for mock
      order: (col: string, opts?: any) => builder,
      limit: (n: number) => {
        data = data.slice(0, n)
        return builder
      },
      single: async () => {
        return { data: data[0] || null, error: data[0] ? null : { message: "Not found" } }
      },
      then: async (callback?: any) => {
        const result = { data, error: null }
        return callback ? callback(result) : result
      },
    }
    return builder
  }

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "mock-user-id",
            email: "admin@example.com",
          },
        },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: {
          user: {
            id: "mock-user-id",
            email: "admin@example.com",
          },
          session: {},
        },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => {
      const insertResult = {
        select: (columns?: string) => ({
          single: async () => {
            const mockId = `mock-${Date.now()}`
            const mockData = { 
              id: mockId, 
              dossier_id: `DOS-${new Date().getFullYear()}-001`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            return { data: mockData, error: null }
          },
        }),
        then: async (callback?: any) => {
          const mockId = `mock-${Date.now()}`
          const result = { 
            data: [{ id: mockId, created_at: new Date().toISOString() }], 
            error: null 
          }
          return callback ? callback(result) : result
        },
      }
      
      return {
        select: (columns?: string) => {
        const builder = createQueryBuilder([])
        // Make sure then() returns a promise
        builder.then = async (callback?: any) => {
          const result = { data: [], error: null }
          if (callback) {
            return callback(result)
          }
          return Promise.resolve(result)
        }
        return builder
      },
        insert: (data: any) => insertResult,
        update: (data: any) => ({
          eq: async () => ({ error: null }),
        }),
        upsert: async (data: any) => ({ error: null }),
      }
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => ({ error: null }),
        download: async (path: string) => ({ data: new Blob(), error: null }),
      }),
    },
    rpc: async (fn: string, params?: any) => ({ 
      data: `DOS-${new Date().getFullYear()}-001`, 
      error: null 
    }),
  }
}
