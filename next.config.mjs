/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let remotePatterns = [];

if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol === "https:" || url.protocol === "http:") {
      remotePatterns = [
        {
          protocol: url.protocol.replace(":", ""),
          hostname: url.hostname,
          pathname: "/storage/v1/object/public/**",
        },
      ];
    }
  } catch {
    // Invalid env should not crash the build; images from files still work.
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  typedRoutes: false,
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
