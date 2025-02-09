<?php

if (!defined('ABSPATH')) {
    exit; // Prevent direct access
}

class Webfont_CLI_Command {

    /**
     * Starts a webfont scan using Node.js.
     *
     * @when after_wp_load
     */
    public function scan() {
        $plugin_dir = __DIR__;
        $node_script = $plugin_dir . '/font-scan.js';

        if (!defined('WP_CLI')) {
            die("❌ WP-CLI is required to use this tool. Please install WP-CLI and try again.\n");
        }
        
        // Check if Node.js is installed
        $node_bin = trim(shell_exec('which node'));
        if (empty($node_bin)) {
            WP_CLI::error("❌ Node.js is not installed! Please install Node.js first.");
        }

        // Check if Puppeteer is installed
        if (!file_exists($plugin_dir . '/node_modules/puppeteer')) {
            WP_CLI::log("📦 Puppeteer not found, installing...");
            shell_exec("cd " . escapeshellarg($plugin_dir) . " && npm install puppeteer 2>&1");
        }

        // Execute the scan using Node.js
        WP_CLI::log("🚀 Starting Webfont Scan...");
        $output = shell_exec(escapeshellarg($node_bin) . " " . escapeshellarg($node_script) . " 2>&1");
        WP_CLI::log($output);
    }
}

if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('webfont', 'Webfont_CLI_Command');
}
