// sitemap-generator.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your site URL
const SITE_URL = 'https://zarium.dev';

// Define your routes
const routes = [
  {
    path: '/',
    priority: 1.0,
    changefreq: 'weekly',
    lastmod: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD
  },
  {
    path: '/pricing',
    priority: 0.8,
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    path: '/login',
    priority: 0.5,
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    path: '/register',
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    path: '/terms',
    priority: 0.3,
    changefreq: 'yearly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    path: '/privacy',
    priority: 0.3,
    changefreq: 'yearly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  {
    path: '/help',
    priority: 0.6,
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0]
  }
];

// Generate sitemap XML
function generateSitemap(routes) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  routes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${route.path}</loc>\n`;
    xml += `    <lastmod>${route.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>';
  return xml;
}

// Write sitemap to file
const sitemap = generateSitemap(routes);

// Make sure public directory exists
const publicDir = path.resolve(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.resolve(publicDir, 'sitemap.xml');

fs.writeFileSync(outputPath, sitemap);
console.log(`Sitemap generated at ${outputPath}`);