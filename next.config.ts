import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // Leagues and "my points" now live on the ranking page.
    return [
      { source: "/leagues", destination: "/leaderboard#leagues", permanent: false },
      { source: "/my-points", destination: "/leaderboard#my-points", permanent: false },
    ]
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io" }],
  },
}

export default withNextIntl(nextConfig)
