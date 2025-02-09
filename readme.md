## 📌 Installatie

1. **Installeer de WP-CLI extensie**:
   `wp package install mintis/webfont-checker`

2. Zorg ervoor dat Node.js is geïnstalleerd:`node -v`

3. Controleer of Puppeteer correct is geïnstalleerd:
    `npm install puppeteer`

🔥 Gebruik
Run de scan met: `wp webfont scan`

De tool zal:

✅ Alle pagina’s crawlen en font-gegevens verzamelen.
✅ Bekijken welke fonts worden ingeladen via @font-face of preload.
✅ Controleren welke fonts ongebruikt zijn en voorstellen om ze te verwijderen.