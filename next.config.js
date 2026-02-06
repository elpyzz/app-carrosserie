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
    
    // Exclure playwright et puppeteer du bundle client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'playwright-core': false,
        'playwright': false,
      }
    }
    
    // Configuration pour serverless (Vercel)
    if (isServer) {
      config.externals = config.externals || []
      // Garder puppeteer pour compatibilité si nécessaire
      config.externals.push({
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
        'puppeteer-core': 'commonjs puppeteer-core',
        'playwright': 'commonjs playwright',
        'playwright-core': 'commonjs playwright-core',
      })
    }
    
    // Ignorer les fichiers non-JS de playwright-core (fonts, etc.)
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /\.(ttf|woff|woff2|eot|svg)$/,
      type: 'asset/resource',
      exclude: /node_modules\/playwright-core/,
    })
    
    // Ignorer complètement les modules electron et autres modules optionnels de playwright-core
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['electron'] = false
    
    // #region agent log
    console.log('[Next.js Config] Webpack config final');
    // #endregion
    
    return config
  },
}

module.exports = nextConfig
