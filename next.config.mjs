/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Native modules must not be bundled — let Node resolve them directly
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
