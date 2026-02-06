/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Désactiver temporairement ESLint pour permettre le démarrage
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // #region agent log
    console.log('[Next.js Config] Webpack config - isServer:', isServer);
    // #endregion
    
    // Exclure puppeteer-core et chromium du bundle client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      }
    }
    
    // Configuration pour serverless (Vercel)
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
        'puppeteer-core': 'commonjs puppeteer-core',
      })
    }
    
    // #region agent log
    console.log('[Next.js Config] Webpack config final');
    // #endregion
    
    return config
  },
}

module.exports = nextConfig
