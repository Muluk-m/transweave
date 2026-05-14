import type { MetadataRoute } from "next";

// Required for `output: export` (static export) — robots.txt is generated at build time.
export const dynamic = "force-static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transweave.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authed app routes — no value indexing UI shells, and they're auth-gated anyway.
        disallow: ["/login", "/setup", "/project/", "/team/", "/profile", "/user/", "/settings/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
