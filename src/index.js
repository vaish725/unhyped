import path from 'path';
import { fileURLToPath } from 'url';
import { runRealityCheck } from './realityCheck.js';
import chalk from 'chalk';
import { Command } from 'commander';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Displays usage information for the CLI
 */
function displayUsage() {
    console.log(chalk.blue('\n🧴 TikTok vs Truth Reality Checker'));
    console.log(chalk.gray('A tool to analyze beauty products and detect potentially harmful ingredients\n'));
    console.log(chalk.yellow('Usage:'));
    console.log('  npm run run <product-url> [influencer-handle] [profile-path]');
    console.log('  npm run run -- --help\n');
    console.log(chalk.yellow('Arguments:'));
    console.log('  product-url       URL of the beauty product to analyze (required)');
    console.log('  influencer-handle TikTok/Instagram handle promoting the product (optional)');
    console.log('  profile-path      Path to your skin profile JSON file (default: data/profile.json)\n');
    console.log(chalk.yellow('Examples:'));
    console.log('  npm run run "https://global.oliveyoung.com/product/detail?prdtNo=123"');
    console.log('  npm run run "https://amazon.com/product/xyz" "@skincare_guru"');
    console.log('  npm run run "https://yesstyle.com/product/123" "" "data/my-profile.json"\n');
    console.log(chalk.yellow('Supported Platforms:'));
    console.log('  • OliveYoung Global');
    console.log('  • Amazon');
    console.log('  • YesStyle');
    console.log('  • Generic sites (fallback)\n');
    console.log(chalk.cyan('For more information, visit: https://github.com/your-repo/unhyped'));
}
/**
 * Validates if a string is a valid URL
 * @param string - String to validate
 * @returns True if valid URL, false otherwise
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validates if a profile file exists and has the correct structure
 * @param profilePath - Path to profile file
 * @returns True if valid, false otherwise
 */
async function validateProfileFile(profilePath) {
    try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(profilePath, 'utf-8');
        const profile = JSON.parse(content);
        // Check required fields
        if (!profile.skin_type || !profile.concerns) {
            console.error(chalk.red('❌ Profile file missing required fields: skin_type, concerns'));
            return false;
        }
        // Validate skin_type
        const validSkinTypes = ['oily', 'dry', 'combination', 'sensitive', 'normal'];
        if (!validSkinTypes.includes(profile.skin_type)) {
            console.error(chalk.red(`❌ Invalid skin_type. Must be one of: ${validSkinTypes.join(', ')}`));
            return false;
        }
        // Validate concerns is an array
        if (!Array.isArray(profile.concerns)) {
            console.error(chalk.red('❌ Profile concerns must be an array'));
            return false;
        }
        return true;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            console.error(chalk.red(`❌ Profile file not found: ${profilePath}`));
        }
        else {
            console.error(chalk.red(`❌ Invalid profile file: ${error}`));
        }
        return false;
    }
}
/**
 * Main CLI entry point
 */
async function main() {
    const program = new Command();
    program
        .name('unhyped')
        .description('TikTok vs Truth Reality Checker for beauty products')
        .version('1.0.0')
        .argument('<product-url>', 'URL of the beauty product to analyze')
        .argument('[influencer-handle]', 'TikTok/Instagram handle promoting the product')
        .argument('[profile-path]', 'Path to your skin profile JSON file', 'data/profile.json')
        .helpOption('-h, --help', 'Display help information')
        .action(async (url, handle = '', profileRelativePath = 'data/profile.json') => {
        console.log(chalk.blue('\n🧴 TikTok vs Truth Reality Checker'));
        console.log(chalk.gray('Initializing analysis...\n'));
        // Validate URL
        if (!isValidUrl(url)) {
            console.error(chalk.red('❌ Invalid URL provided. Please provide a valid product URL.'));
            console.log(chalk.yellow('\nExample: npm run run "https://global.oliveyoung.com/product/detail?prdtNo=123"'));
            process.exit(1);
        }
        // Resolve profile path
        const profilePath = path.resolve(__dirname, '..', profileRelativePath);
        // Validate profile file
        const isProfileValid = await validateProfileFile(profilePath);
        if (!isProfileValid) {
            console.log(chalk.yellow('\n💡 Create a profile file with this structure:'));
            console.log(chalk.gray('{\n  "skin_type": "oily",\n  "concerns": ["acne", "sensitivity"]\n}'));
            process.exit(1);
        }
        // Show configuration
        console.log(chalk.cyan('📋 Configuration:'));
        console.log(chalk.gray(`  Product URL: ${url}`));
        if (handle)
            console.log(chalk.gray(`  Influencer: ${handle}`));
        console.log(chalk.gray(`  Profile: ${profilePath}\n`));
        try {
            await runRealityCheck(url, handle, profilePath);
        }
        catch (error) {
            console.error(chalk.red('\n❌ Analysis failed:'), error);
            // Provide helpful error suggestions
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    console.log(chalk.yellow('💡 Try: The website might be slow. Please try again.'));
                }
                else if (error.message.includes('selector')) {
                    console.log(chalk.yellow('💡 Try: This product page format might not be supported yet.'));
                }
                else if (error.message.includes('network')) {
                    console.log(chalk.yellow('💡 Try: Check your internet connection and try again.'));
                }
            }
            process.exit(1);
        }
    });
    // Handle case where no arguments provided
    if (process.argv.length <= 2) {
        displayUsage();
        process.exit(0);
    }
    // Parse command line arguments
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        console.error(chalk.red('❌ Command parsing failed:'), error);
        displayUsage();
        process.exit(1);
    }
}
// Run the main function
main().catch((error) => {
    console.error(chalk.red('❌ Unexpected error:'), error);
    process.exit(1);
});
