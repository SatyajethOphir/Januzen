import { Router } from "express";
import { dbClient } from "../db";

const router = Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const products = await dbClient.getProducts({});
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Homepage
    xml += `  <url>\n`;
    xml += `    <loc>https://januzen.in/</loc>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;
    
    // Products
    for (const p of products) {
      xml += `  <url>\n`;
      xml += `    <loc>https://januzen.in/?product=${p.id}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }
    
    xml += `</urlset>`;
    
    res.header("Content-Type", "application/xml");
    res.status(200).send(xml);
  } catch (err) {
    console.error("[SITEMAP] Failed to generate sitemap:", err);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;
