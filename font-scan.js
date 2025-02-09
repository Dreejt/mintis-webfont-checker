import puppeteer from 'puppeteer';
import 'dotenv/config';
import { createInterface } from 'readline/promises';
import { execSync } from 'child_process';
import { URL } from 'url';

// 🚀 **Determine the start URL automatically**
const START_URL = process.env.WP_HOME || 'http://localhost';

// 🕷️ **Crawl function to collect all internal links**
async function getAllLinks(browser, baseUrl) {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href.startsWith(window.location.origin)); // Only internal links
  });

  await page.close();
  return [...new Set(links)]; // Remove duplicate links
}

// 🖋 **Font scan function: Retrieve ALL used fonts and weights**
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

// 🔍 **Check which fonts and font-weights are loaded via @font-face and preload links**
async function scanLoadedFonts(page) {
  const loadedFonts = new Map();

  // **Intercept ALL CSS files**
  const stylesheets = await page.evaluate(() =>
    Array.from(document.styleSheets)
      .filter(sheet => sheet.href) // Only external stylesheets
      .map(sheet => sheet.href)
  );

  for (const sheetUrl of stylesheets) {
    try {
      const response = await page.goto(sheetUrl);
      const cssContent = await response.text();

      // **Search for @font-face declarations in CSS**
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
      console.warn(`⚠️  Could not load stylesheet: ${sheetUrl}`);
    }
  }

  // **Detect preload fonts**
  const preloadFonts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'))
      .map(link => {
        const match = link.href.match(/.*\/([^\/]+)-latin-(\d+)(italic)?\.woff2/);
        if (match) {
          return {
            font: match[1].replace(/-/g, ' '), // Font name
            weight: match[2] + (match[3] ? ' italic' : ''), // Weight + italic if present
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

  console.log(`🔍 Starting crawl from: ${START_URL}`);

  // Collect ALL links on the site
  const allLinks = await getAllLinks(browser, START_URL);
  console.log(`📌 Found internal pages: ${allLinks.length}`);

  for (const pageUrl of allLinks) {
    if (visitedUrls.has(pageUrl)) continue;
    visitedUrls.add(pageUrl);

    console.log(`🔍 Analyzing: ${pageUrl}`);
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle2' });

    // Retrieve used fonts
    const pageFonts = await scanFontsOnPage(page);
    // Retrieve loaded fonts and weights (from stylesheets and preload links)
    const pageLoadedFonts = await scanLoadedFonts(page);
    
    // Add loaded fonts to the map
    pageLoadedFonts.forEach((weights, font) => {
      if (!loadedFonts.has(font)) {
        loadedFonts.set(font, new Set());
      }
      weights.forEach(weight => loadedFonts.get(font).add(weight));
    });

    // Add the results of this page to the total list
    pageFonts.forEach(({ font, weights }) => {
      if (!fontUsage.has(font)) {
        fontUsage.set(font, new Set());
      }
      weights.forEach(weight => fontUsage.get(font).add(weight));
    });

    await page.close();
  }

  await browser.close();

  // 🎨 **Print results**
  console.log('🚀 **Used font-weights & styles across the entire site:**');
  fontUsage.forEach((weights, font) => {
    console.log(`🎨 ${font}: ${[...weights].join(', ')}`);
  });

  console.log('\n🖋 **Loaded fonts and font-weights via @font-face and preload links:**');
  loadedFonts.forEach((weights, font) => {
    console.log(`🎨 ${font}: ${[...weights].join(', ')}`);
  });

  // 🆕 **Check missing fonts & suggest installing them**
  const missingFonts = [];
  fontUsage.forEach((weights, font) => {
    if (!loadedFonts.has(font)) {
      missingFonts.push(font);
    }
  });

  if (missingFonts.length > 0) {
    console.log('\n❌ **Missing fonts detected!**');
    console.log(missingFonts.join('\n'));

    console.log('\n💡 **Suggestion:** Install the missing fonts using Laravel Webfonts package.');
    console.log('1️⃣ Install the package if not installed:');
    console.log('   composer require log1x/laravel-webfonts');
    console.log('2️⃣ Add the missing fonts using artisan / wp acorn command:');
    console.log(`   wp acorn webfonts:add`);
  } else {
    console.log('\n✅ **All used fonts are correctly loaded!**');
  }
  

  console.log('\n✅ Scan complete! Check if you are loading unnecessary @font-face fonts.');
})();
