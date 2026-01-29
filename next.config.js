/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
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
    
    // #region agent log
    console.log('[Next.js Config] Webpack config final');
    // #endregion
    
    return config
  },
}

module.exports = nextConfig
