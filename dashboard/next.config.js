/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // GitHub Pages: static export
  output: process.env.GITHUB_PAGES === 'true' ? 'export' : 'standalone',
  distDir: process.env.GITHUB_PAGES === 'true' ? 'out' : '.next',
  images: {
    unoptimized: process.env.GITHUB_PAGES === 'true',
  },
  // GitHub Pages base path (dynamically set from REPO_NAME env var)
  basePath: process.env.GITHUB_PAGES === 'true' && process.env.REPO_NAME ? `/${process.env.REPO_NAME}` : '',
  assetPrefix: process.env.GITHUB_PAGES === 'true' && process.env.REPO_NAME ? `/${process.env.REPO_NAME}` : '',
}

module.exports = nextConfig
