import type { NextConfig } from "next";

// Only in production: `next dev`'s Turbopack HMR relies on eval() for
// module updates, which a script-src CSP would break. `'unsafe-inline'`
// (rather than a per-request nonce) is a deliberate simplification — the
// App Router's own hydration relies on inline <script> tags, and wiring a
// nonce through proxy.ts safely needs testing against a real logged-in
// session, which wasn't possible to verify end-to-end here. Documented as
// a known follow-up in PROJECT_BLUEPRINT.md.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
