import type { MetadataRoute } from "next";

import { SITE_URL } from "@/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /* The workspace and its API are behind a session. */
      disallow: ["/api/", "/app/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
