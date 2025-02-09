# Webfont Checker

## Overview
Webfont Checker is a powerful tool designed to analyze the fonts used on a WordPress website. It scans all internal pages, detects which fonts and font-weights are actively used, and identifies unnecessary fonts loaded via `@font-face` or preload links.

This tool is particularly useful for optimizing performance by removing unused webfonts, reducing page load times, and improving overall efficiency.

## Features
- **Automatic site crawling**: Scans all internal pages to ensure complete font analysis.
- **Font weight detection**: Identifies all font-weights used across the website.
- **Preload & @font-face analysis**: Detects fonts loaded via `@font-face` rules and preload links.
- **Identifies unused fonts**: Helps optimize performance by suggesting font removals.
- **Supports WordPress WP-CLI**: Easily integrate with WordPress via WP-CLI commands.

## Requirements
- **Node.js** (must be installed and available in the system path)
- **Puppeteer** (automatically installed if missing)
- **WP-CLI** (WordPress Command Line Interface)

## Installation
### 1. Install via Composer 
`composer require mintis/webfont-checker --dev`

### 2. Activate WP-CLI Command
After installation, WP-CLI should automatically register the `webfont` command.
To verify installation, run:
`wp webfont scan`

If the command is not found, ensure WP-CLI is properly installed and that the package is correctly registered.

## Usage
### Running a Font Scan
To perform a full scan of your website, use the following command:
`wp webfont scan`

### Example Output

🔍 Starting crawl from: http://yourwebsite.com/
📌 Found internal pages: 12
🔍 Analyzing: http://yourwebsite.com/home
...
🚀 **Used font-weights & styles across the entire site:**
🎨 Roboto: 400, 700, 900
🎨 Open Sans: 300, 400 italic

🖋 **Loaded fonts and font-weights via @font-face and preload links:**
🎨 Lato: 100, 300, 400, 700, 900

❌ **Unused loaded fonts and weights! Consider removing these:**
Lato (100, 300, 700, 900)

✅ Scan complete! Check if you are loading unnecessary @font-face fonts.


## Troubleshooting

### Node.js Not Found
If Node.js is not detected, install it using:

# macOS
`brew install node`

# Linux (Debian-based)
`sudo apt install nodejs npm`

# Windows
Download from https://nodejs.org/


### WP-CLI Not Found
Ensure WP-CLI is installed by running:
`wp --info`

If WP-CLI is missing, install it by following the official guide: [WP-CLI Installation](https://wp-cli.org/)

### Manually Installing Dependencies
If Puppeteer is not installed, manually install it using:
`cd path/to/webfont-checker`
`npm install puppeteer`

## Contributing
Feel free to contribute to Webfont Checker by submitting pull requests or reporting issues in the GitHub repository.

## License
This project is licensed under the MIT License.

## Contact
For support or inquiries, visit [Mintis](https://www.mintis.nl).