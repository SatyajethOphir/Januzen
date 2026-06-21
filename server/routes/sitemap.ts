// routes/sitemap.ts
//
// Dynamic sitemap.xml generator for JANUZEN (januzen.in)
//
// This version is written against your ACTUAL data layer (server/db.ts):
//   - Products are a single unified collection, differentiated by `shop`
//     ("medicals" | "stationery"), not two separate models.
//   - The identifier field is `id` (e.g. "m1", "s1"), not Mongoose's `_id`.
//   - There is no `slug` or `updatedAt` field on Product — so this sitemap
//     omits <lastmod> for products rather than guessing a fake date.
//   - This app has no server-side routing (no React Router) — App.tsx reads
//     window.location.search for a "product" query param on mount. So real
//     shareable product URLs are https://januzen.in/?product=m1 — NOT
//     /product/m1, which doesn't exist as a route at all.
//   - It calls dbClient.getProducts({}) — the exported name in your real
//     server/db.ts is `dbClient`, not `db` — using the same helper your app
//     already uses, so it automatically respects whichever mode is active
//     (MongoDB or the local JSON fallback), with zero duplicated query logic.
//
// FILE LOCATION: this file lives at routes/sitemap.ts (project root level,
// next to server.ts — NOT nested inside server/, confirmed from your actual
// server.ts which imports it as "./routes/sitemap" and db as "./server/db").
//
// WIRING: already done in your server.ts —
//   import sitemapRouter from "./routes/sitemap";
//   app.use("/", sitemapRouter);
// No further server.ts changes needed. Just replace the file content at
// routes/sitemap.ts with this version.
//
// VERIFY: deploy, then visit https://januzen.in/sitemap.xml directly to
// confirm it returns real XML listing your actual products, then submit
// that URL in Google Search Console under Sitemaps.

import { Router, Request, Response } from "express";
import { dbClient } from "../server/db";

const router = Router();
const SITE_URL = "https://januzen.in";

interface StaticPage {
  path: string;
  changefreq: string;
  priority: string;
}

// Static, rarely-changing pages — this app has NO real server-side routes
// (App.tsx uses manual nav.page state, not React Router), so this is just
// the homepage. The "medicals"/"stationery" shop views only differ via
// in-app state, not a real distinct crawlable URL — not worth listing.
const STATIC_PAGES: StaticPage[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
];

interface UrlEntryParams {
  loc: string;
  changefreq?: string;
  priority?: string;
}

function xmlEscape(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, changefreq, priority }: UrlEntryParams): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>${changefreq ? `
    <changefreq>${changefreq}</changefreq>` : ""}${priority ? `
    <priority>${priority}</priority>` : ""}
  </url>`;
}

router.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const entries: string[] = [];

    // Static pages
    for (const page of STATIC_PAGES) {
      entries.push(
        urlEntry({
          loc: `${SITE_URL}${page.path}`,
          changefreq: page.changefreq,
          priority: page.priority,
        })
      );
    }

    // Live, active products only — same default your storefront already uses
    // (includeInactive defaults to false in db.getProducts).
    // URL format matches App.tsx's actual deep-link parsing:
    //   window.location.search -> params.get("product") -> productId
    // i.e. https://januzen.in/?product=m1   (NOT /product/m1 — there is no
    // server-side route for that; this app is fully client-state-driven).
    try {
      const products = await dbClient.getProducts({});
      for (const p of products) {
        entries.push(
          urlEntry({
            loc: `${SITE_URL}/?product=${encodeURIComponent(p.id)}`,
            changefreq: "weekly",
            priority: "0.7",
          })
        );
      }
    } catch (err: any) {
      console.error("Sitemap: failed to load products, continuing with static pages only:", err.message);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    res.status(500).send("Sitemap generation failed");
  }
});

export default router;
