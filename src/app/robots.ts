// Robots.txt — allow all crawlers
import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bibitool.vercel.app"

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/history/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
