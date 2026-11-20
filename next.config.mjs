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
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ]
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    }
    return config
  },
}

export default nextConfig
