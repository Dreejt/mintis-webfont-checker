import puppeteer from 'puppeteer';
import 'dotenv/config'; // Automatisch `.env` inlezen

import { URL } from 'url';

// 🚀 **Bepaal de start-URL automatisch**
const START_URL = process.env.WP_HOME || 'http://localhost';

// 🕷️ **Crawlfunctie om alle interne links te verzamelen**
async function getAllLinks(browser, baseUrl) {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.startsWith(window.location.origin)); // Alleen interne links
  });

  await page.close();
  return [...new Set(links)]; // Verwijder dubbele links
}

// 🖋 **Font-scanfunctie: Haal ALLE gebruikte fonts en weights op**
async function scanFontsOnPage(page) {
  return await page.evaluate(() => {
    const fontMap = new Map();

    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const fontFamily = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      const fontWeight = style.fontWeight;
      const fontStyle = style.fontStyle;

      if (!fontMap.has(fontFamily)) {
        fontMap.set(fontFamily, new Set());
      }
      fontMap.get(fontFamily).add(`${fontWeight}${fontStyle !== 'normal' ? ' ' + fontStyle : ''}`);
    });

    return Array.from(fontMap.entries()).map(([font, weights]) => ({
      font,
      weights: [...weights],
    }));
  });
}

// 🔍 **Check welke fonts en font-weights worden ingeladen via @font-face en preload links**
async function scanLoadedFonts(page) {
  const loadedFonts = new Map();

  // **Intercepteer ALLE CSS-bestanden**
  const stylesheets = await page.evaluate(() =>
    Array.from(document.styleSheets)
      .filter(sheet => sheet.href) // Alleen externe stylesheets
      .map(sheet => sheet.href)
  );

  for (const sheetUrl of stylesheets) {
    try {
      const response = await page.goto(sheetUrl);
      const cssContent = await response.text();

      // **Zoek naar @font-face declaraties in de CSS**
      const fontFaceMatches = cssContent.matchAll(/@font-face\s*{[^}]*font-family:\s*["']?([^;"'}]+)["']?;[^}]*font-weight:\s*(\d{3})/g);
      for (const match of fontFaceMatches) {
        const fontFamily = match[1].trim();
        const fontWeight = match[2].trim();
        
        if (!loadedFonts.has(fontFamily)) {
          loadedFonts.set(fontFamily, new Set());
        }
        loadedFonts.get(fontFamily).add(fontWeight);
      }
    } catch (error) {
      console.warn(`⚠️  Kon stylesheet niet laden: ${sheetUrl}`);
    }
  }

  // **Detecteer preload fonts**
  const preloadFonts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'))
      .map(link => {
        const match = link.href.match(/.*\/([^\/]+)-latin-(\d+)(italic)?\.woff2/);
        if (match) {
          return {
            font: match[1].replace(/-/g, ' '), // Font naam
            weight: match[2] + (match[3] ? ' italic' : ''), // Weight + italic indien aanwezig
          };
        }
        return null;
      })
      .filter(Boolean);
  });

  preloadFonts.forEach(({ font, weight }) => {
    if (!loadedFonts.has(font)) {
      loadedFonts.set(font, new Set());
    }
    loadedFonts.get(font).add(weight);
  });

  return loadedFonts;
}

(async () => {
  const browser = await puppeteer.launch();
  const fontUsage = new Map();
  const visitedUrls = new Set();
  let loadedFonts = new Map();

  console.log(`🔍 Start met crawlen vanaf: ${START_URL}`);

  // Verzamel ALLE links op de site
  const allLinks = await getAllLinks(browser, START_URL);
  console.log(`📌 Gevonden interne pagina’s: ${allLinks.length}`);

  for (const pageUrl of allLinks) {
    if (visitedUrls.has(pageUrl)) continue;
    visitedUrls.add(pageUrl);

    console.log(`🔍 Analyseren van: ${pageUrl}`);
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle2' });

    // Haal gebruikte fonts op
    const pageFonts = await scanFontsOnPage(page);
    // Haal ingeladen fonts en weights op (uit stylesheets en preload links)
    const pageLoadedFonts = await scanLoadedFonts(page);
    
    // Voeg ingeladen fonts toe aan de map
    pageLoadedFonts.forEach((weights, font) => {
      if (!loadedFonts.has(font)) {
        loadedFonts.set(font, new Set());
      }
      weights.forEach(weight => loadedFonts.get(font).add(weight));
    });

    // Voeg de resultaten van deze pagina toe aan de totale lijst
    pageFonts.forEach(({ font, weights }) => {
      if (!fontUsage.has(font)) {
        fontUsage.set(font, new Set());
      }
      weights.forEach(weight => fontUsage.get(font).add(weight));
    });

    await page.close();
  }

  await browser.close();

  // 🎨 **Print de resultaten**
  console.log('🚀 **Gebruikte font-weights & stijlen op de gehele site:**');
  fontUsage.forEach((weights, font) => {
    console.log(`🎨 ${font}: ${[...weights].join(', ')}`);
  });

  console.log('\n🖋 **Ingeladen fonts en font-weights via @font-face en preload links:**');
  loadedFonts.forEach((weights, font) => {
    console.log(`🎨 ${font}: ${[...weights].join(', ')}`);
  });

  // 🔍 **Check ongebruikte fonts en weights**
  const unusedFonts = [];
  loadedFonts.forEach((weights, font) => {
    const usedWeights = fontUsage.get(font) || new Set();
    const unusedWeights = [...weights].filter(weight => !usedWeights.has(weight));
    if (unusedWeights.length > 0) {
      unusedFonts.push(`${font} (${unusedWeights.join(', ')})`);
    }
  });

  if (unusedFonts.length > 0) {
    console.log('\n❌ **Ongebruikte ingeladen fonts en weights! Overweeg deze te verwijderen:**');
    console.log(unusedFonts.join('\n'));
  } else {
    console.log('\n✅ **Alle ingeladen fonts en weights worden gebruikt!**');
  }

  console.log('\n✅ Scan voltooid! Controleer of je overbodige @font-face fonts laadt.');
})();
