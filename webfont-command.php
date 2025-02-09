<?php

if (!defined('ABSPATH')) {
    exit; // Blokkeer directe toegang
}

class Webfont_CLI_Command {

    /**
     * Start een webfont scan via Node.js
     *
     * @when after_wp_load
     */
    public function scan() {
        $plugin_dir = __DIR__;
        $node_script = $plugin_dir . '/font-scan.js';

        // Controleer of Node.js is geïnstalleerd
        $node_bin = trim(shell_exec('which node'));
        if (empty($node_bin)) {
            WP_CLI::error("❌ Node.js is niet geïnstalleerd! Installeer Node.js eerst.");
        }

        // Controleer of Puppeteer is geïnstalleerd
        if (!file_exists($plugin_dir . '/node_modules/puppeteer')) {
            WP_CLI::log("📦 Puppeteer niet gevonden, installeren...");
            shell_exec("cd " . escapeshellarg($plugin_dir) . " && npm install puppeteer 2>&1");
        }

        // Voer de scan uit met Node.js
        WP_CLI::log("🚀 Start Webfont Scan...");
        $output = shell_exec(escapeshellarg($node_bin) . " " . escapeshellarg($node_script) . " 2>&1");
        WP_CLI::log($output);
    }
}

if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('webfont', 'Webfont_CLI_Command');
}
