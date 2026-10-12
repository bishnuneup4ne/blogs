import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  ui: {
    devIndicators: false,
  },
  async redirects() {
    return [
      { source: "/blog", destination: "/blogs", permanent: true },
      { source: "/blog/:path*", destination: "/blogs/:path*", permanent: true },
    ];
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  experimental: {
    optimizePackageImports: ["react-icons"],
    // Supabase Storage + REST from this region are slow on cold hits (seen
    // 16–28s). Give the image optimizer enough headroom so the first gallery
    // burst doesn't fail with "upstream image response timed out"; successful
    // results are cached for a day via minimumCacheTTL.
    imgOptTimeoutInSeconds: 60,
  },
  images: {
    // Supabase Storage cold fetches stall badly when the browser bursts many
    // images at once, so the server-side optimizer kept failing with
    // "upstream image response timed out" on /gallery. The originals are
    // already small (~15–22 KB, sometimes smaller than the optimized output),
    // so serving them directly is faster AND reliable — the browser fetches
    // them over HTTP/2 with no single-server bottleneck.
    unoptimized: true,
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
      // Pexels (used in writeups)
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "**",
      },
      // Supabase Storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "**",
      },
      // Imgur
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "**",
      },
      // Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      // GitHub raw content
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "user-images.githubusercontent.com",
        pathname: "**",
      },
      // Allow any https hostname (catches any other CDN/storage)
      {
        protocol: "https",
        hostname: "**",
        pathname: "**",
      },
    ],
  },
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);
