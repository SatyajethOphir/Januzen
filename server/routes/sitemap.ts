// routes/sitemap.ts
import { Router, Request, Response } from "express";
import { dbClient } from "../db";

const router = Router();
const SITE_URL = "https://januzen.in";

function xmlEscape(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface UrlEntryParams {
  loc: string;
  changefreq?: string;
  priority?: string;
}

function urlEntry({ loc, changefreq, priority }: UrlEntryParams): string {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>${changefreq ? `
    <changefreq>${changefreq}</changefreq>` : ""}${priority ? `
    <priority>${priority}</priority>` : ""}
  </url>`;
}

const STATIC_PAGES = [
  { path: "/",           changefreq: "daily",   priority: "1.0" },
  { path: "/medicals",   changefreq: "weekly",  priority: "0.8" },
  { path: "/stationery", changefreq: "weekly",  priority: "0.8" },
  { path: "/about",      changefreq: "monthly", priority: "0.5" },
  { path: "/contact",    changefreq: "monthly", priority: "0.5" },
];

router.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const entries: string[] = [];

    for (const page of STATIC_PAGES) {
      entries.push(urlEntry({
        loc: `${SITE_URL}${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
      }));
    }

    try {
      const products = await dbClient.getProducts({});
      for (const p of products) {
        entries.push(urlEntry({
          loc: `${SITE_URL}/product/${encodeURIComponent(p.id)}`,
          changefreq: "weekly",
          priority: "0.7",
        }));
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