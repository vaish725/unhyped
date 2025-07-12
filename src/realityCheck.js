import { scrapeProduct } from './scrapeProduct.js';
import ingredientDB from '../data/ingredients.json' with { type: 'json' };
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { validateReport } from '../utils/validateSchema.js';
puppeteer.use(StealthPlugin());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Analyzes ingredients against user profile and ingredient database
 * @param ingredients - List of parsed ingredients
 * @param userProfile - User's skin profile and concerns
 * @returns Object containing safe and flagged ingredients
 */
function analyzeIngredients(ingredients, userProfile) {
    const safeIngredients = [];
    const flaggedIngredients = [];
    console.log(chalk.cyan('🔬 Analyzing ingredients against user profile...'));
    console.log(chalk.gray(`User profile: ${userProfile.skin_type} skin, concerns: ${userProfile.concerns.join(', ')}`));
    for (const ingredient of ingredients) {
        // Skip very short or invalid ingredient names
        if (ingredient.length < 3)
            continue;
        // Check against ingredient database
        const knownIssue = ingredientDB[ingredient.toLowerCase()];
        if (knownIssue) {
            // Check if this ingredient conflicts with user's skin type or concerns
            let shouldFlag = true;
            let customRecommendation = '';
            // Skin type specific recommendations
            if (userProfile.skin_type === 'sensitive' && knownIssue.severity === 'high') {
                customRecommendation = 'Especially avoid due to sensitive skin';
            }
            else if (userProfile.skin_type === 'oily' && ingredient.includes('oil') && knownIssue.issue === 'Comedogenic') {
                customRecommendation = 'May worsen oily skin concerns';
            }
            else if (userProfile.skin_type === 'dry' && knownIssue.issue === 'Drying') {
                customRecommendation = 'May worsen dry skin concerns';
            }
            // Concern-specific analysis
            if (userProfile.concerns.includes('acne') && knownIssue.issue === 'Comedogenic') {
                customRecommendation = 'May trigger acne breakouts';
            }
            else if (userProfile.concerns.includes('sensitivity') && knownIssue.severity === 'high') {
                customRecommendation = 'High risk for sensitive skin reactions';
            }
            flaggedIngredients.push({
                name: ingredient,
                issue: knownIssue.issue,
                severity: knownIssue.severity,
                recommendation: customRecommendation || `Consider avoiding due to ${knownIssue.issue.toLowerCase()}`
            });
        }
        else {
            // Consider it safe if not in our database of problematic ingredients
            safeIngredients.push(ingredient);
        }
    }
    return { safeIngredients, flaggedIngredients };
}
/**
 * Calculates a match score based on ingredient analysis and user profile
 * @param flaggedIngredients - List of problematic ingredients found
 * @param totalIngredients - Total number of ingredients
 * @param userProfile - User's skin profile
 * @returns Match score from 0-100
 */
function calculateMatchScore(flaggedIngredients, totalIngredients, userProfile) {
    if (totalIngredients === 0)
        return 0;
    // Base score starts at 100
    let score = 100;
    // Penalize based on flagged ingredients
    for (const flagged of flaggedIngredients) {
        let penalty = 0;
        switch (flagged.severity) {
            case 'high':
                penalty = 25;
                break;
            case 'medium':
                penalty = 15;
                break;
            case 'low':
                penalty = 5;
                break;
        }
        // Double penalty for sensitive skin users
        if (userProfile.skin_type === 'sensitive') {
            penalty *= 1.5;
        }
        score -= penalty;
    }
    // Ensure score doesn't go below 0
    return Math.max(0, Math.round(score));
}
/**
 * Calculates trust score based on various factors
 * @param handle - Influencer handle (if any)
 * @param productPrice - Product price
 * @param rating - Product rating
 * @returns Trust score from 0-100
 */
function calculateTrustScore(handle, productPrice, rating) {
    let trustScore = 100;
    // Reduce trust if promoted by influencer
    if (handle) {
        // Check for obvious promotional language
        const promoKeywords = ['ad', 'sponsored', 'discount', 'code', 'link', 'affiliate'];
        const hasPromoLanguage = promoKeywords.some(keyword => handle.toLowerCase().includes(keyword));
        if (hasPromoLanguage) {
            trustScore -= 30; // Heavy penalty for obvious promotions
        }
        else {
            trustScore -= 15; // Standard penalty for influencer promotion
        }
    }
    // Adjust based on price (very cheap products might be low quality)
    if (productPrice > 0) {
        if (productPrice < 5) {
            trustScore -= 10; // Very cheap products are suspicious
        }
        else if (productPrice > 100) {
            trustScore += 5; // Premium products might be more trustworthy
        }
    }
    // Adjust based on rating
    if (rating !== null) {
        if (rating < 3) {
            trustScore -= 25; // Poor ratings significantly reduce trust
        }
        else if (rating > 4.5) {
            trustScore += 10; // Excellent ratings increase trust
        }
    }
    return Math.max(0, Math.min(100, Math.round(trustScore)));
}
/**
 * Main function to run reality check analysis
 * @param url - Product URL to analyze
 * @param handle - Influencer handle (optional)
 * @param profilePath - Path to user profile JSON file
 */
export async function runRealityCheck(url, handle, profilePath) {
    console.log(chalk.blue('🧴 TikTok vs Truth Reality Checker'));
    console.log(chalk.green(`🔗 Product: ${url}`));
    if (handle)
        console.log(chalk.yellow(`💬 Influencer: ${handle}`));
    try {
        // Load user profile
        const userProfileRaw = await fs.readFile(profilePath, 'utf-8');
        const userProfile = JSON.parse(userProfileRaw);
        console.log(chalk.cyan(`📄 Skin Profile Loaded:`));
        console.log(chalk.gray(`  Skin Type: ${userProfile.skin_type}`));
        console.log(chalk.gray(`  Concerns: ${userProfile.concerns.join(', ')}`));
        // Launch browser and scrape product
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        console.log(chalk.blue('🔍 Scraping product information...'));
        const productData = await scrapeProduct(page, url);
        // Close browser after scraping
        await browser.close();
        // Check if ingredients were found
        if (!productData.ingredients || productData.ingredients.parsed.length === 0) {
            console.log(chalk.red('\n⚠️ No ingredients found. Skipping detailed analysis.'));
            console.log(chalk.yellow('💡 Tip: Some products may not list ingredients online. Check the physical packaging.'));
            return;
        }
        console.log(chalk.green(`✅ Found ${productData.ingredients.parsed.length} ingredients`));
        // Analyze ingredients against user profile
        const analysis = analyzeIngredients(productData.ingredients.parsed, userProfile);
        // Calculate scores
        const matchScore = calculateMatchScore(analysis.flaggedIngredients, productData.ingredients.parsed.length, userProfile);
        const trustScore = calculateTrustScore(handle, parseFloat(productData.price.replace(/[^0-9.]/g, '')) || 0, productData.rating ? parseFloat(productData.rating) : null);
        // Detect paid promotions
        const paidPromotionsDetected = handle ?
            /ad|sponsored|discount|code|link|affiliate|promo/i.test(handle) : false;
        // Extract brand from product name or URL (basic implementation)
        const brand = extractBrand(productData.name, url);
        // Create comprehensive report
        const report = {
            product_name: productData.name,
            brand: brand,
            price: parseFloat(productData.price.replace(/[^0-9.]/g, '')) || 0,
            rating: productData.rating ? parseFloat(productData.rating) : null,
            reviews_summary: productData.reviews.length > 0 ?
                productData.reviews.join(' ').substring(0, 200) + '...' :
                'No reviews found',
            safe_ingredients: analysis.safeIngredients,
            flagged_ingredients: analysis.flaggedIngredients,
            match_score: matchScore,
            trust_score: trustScore,
            paid_promotions_detected: paidPromotionsDetected,
            analysis_summary: {
                total_ingredients: productData.ingredients.parsed.length,
                flagged_count: analysis.flaggedIngredients.length,
                user_skin_type: userProfile.skin_type,
                user_concerns: userProfile.concerns
            }
        };
        // Validate report against schema
        console.log(chalk.blue('🔍 Validating report against schema...'));
        const isValid = validateReport(report);
        if (!isValid) {
            console.log(chalk.yellow('⚠️ Report does not match expected schema, but proceeding...'));
            console.log(chalk.gray('This might indicate missing required fields or incorrect data types.'));
        }
        else {
            console.log(chalk.green('✅ Report structure validated'));
        }
        // Save report to output directory
        await fs.writeFile('output/report.json', JSON.stringify(report, null, 2));
        // Display results
        console.log(chalk.green('\n📊 ANALYSIS RESULTS'));
        console.log(chalk.green('='.repeat(50)));
        if (analysis.flaggedIngredients.length > 0) {
            console.log(chalk.red(`⚠️  Found ${analysis.flaggedIngredients.length} potentially problematic ingredients:`));
            analysis.flaggedIngredients.forEach(ingredient => {
                const severityColor = ingredient.severity === 'high' ? chalk.red :
                    ingredient.severity === 'medium' ? chalk.yellow : chalk.gray;
                console.log(severityColor(`   • ${ingredient.name}: ${ingredient.issue} (${ingredient.severity})`));
                if (ingredient.recommendation) {
                    console.log(chalk.gray(`     → ${ingredient.recommendation}`));
                }
            });
        }
        else {
            console.log(chalk.green('✅ No problematic ingredients found in our database!'));
        }
        console.log(chalk.cyan(`\n📈 Match Score: ${matchScore}/100`));
        console.log(chalk.cyan(`🔒 Trust Score: ${trustScore}/100`));
        if (paidPromotionsDetected) {
            console.log(chalk.red('💰 Paid promotion detected - extra scrutiny recommended'));
        }
        console.log(chalk.green('\n✅ Detailed report saved to output/report.json'));
    }
    catch (err) {
        console.error(chalk.red('❌ Error during analysis:'), err);
        process.exit(1);
    }
}
/**
 * Attempts to extract brand name from product name or URL
 * @param productName - Product name from scraping
 * @param url - Product URL
 * @returns Extracted brand name or 'Unknown'
 */
function extractBrand(productName, url) {
    // Common beauty brands to look for in product names
    const knownBrands = [
        'CeraVe', 'The Ordinary', 'Neutrogena', 'Olay', 'L\'Oreal', 'Maybelline',
        'Clinique', 'Estee Lauder', 'Lancome', 'SK-II', 'Shiseido', 'COSRX',
        'Some By Mi', 'Innisfree', 'The Face Shop', 'Etude House', 'Laneige',
        'Sulwhasoo', 'Drunk Elephant', 'Paula\'s Choice', 'Cetaphil', 'Aveeno'
    ];
    // Check product name for known brands
    for (const brand of knownBrands) {
        if (productName.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
        }
    }
    // Try to extract from URL domain
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        if (domain.includes('oliveyoung'))
            return 'Olive Young';
        if (domain.includes('amazon'))
            return 'Amazon Brand';
        if (domain.includes('yesstyle'))
            return 'YesStyle Brand';
    }
    catch {
        // Invalid URL, continue
    }
    // Try to extract first word from product name as potential brand
    const words = productName.split(' ');
    if (words.length > 0 && words[0].length > 2) {
        return words[0];
    }
    return 'Unknown';
}
