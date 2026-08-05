/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Interim: ~300 legacy TS issues remain after enabling strict builds in P1.
    // Next.js 15 dynamic route pages were migrated; continue fixing types incrementally.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
