import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chalk from 'chalk';
import { scrapeOliveYoung } from './scrapers/scrapeOliveYoung.js';
import { scrapeAmazon } from './scrapers/scrapeAmazon.js';
import { scrapeYesStyle } from './scrapers/scrapeYesStyle.js';
import { scrapeTikTok } from './scrapers/scrapeTikTok.js';
puppeteer.use(StealthPlugin());
/**
 * Detects the platform type from URL (product or social media)
 * @param url - URL to analyze
 * @returns Platform information object
 */
function detectPlatform(url) {
    const urlLower = url.toLowerCase();
    // Social media platforms
    if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) {
        return { type: 'social', platform: 'tiktok' };
    }
    else if (urlLower.includes('instagram.com')) {
        return { type: 'social', platform: 'instagram' };
    }
    else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return { type: 'social', platform: 'youtube' };
    }
    // E-commerce platforms
    else if (urlLower.includes('oliveyoung.') || urlLower.includes('올리브영')) {
        return { type: 'product', platform: 'oliveyoung' };
    }
    else if (urlLower.includes('amazon.')) {
        return { type: 'product', platform: 'amazon' };
    }
    else if (urlLower.includes('yesstyle.')) {
        return { type: 'product', platform: 'yesstyle' };
    }
    else if (urlLower.includes('sephora.')) {
        return { type: 'product', platform: 'sephora' };
    }
    else if (urlLower.includes('ulta.')) {
        return { type: 'product', platform: 'ulta' };
    }
    else if (urlLower.includes('stylevana.')) {
        return { type: 'product', platform: 'stylevana' };
    }
    return { type: 'unknown', platform: 'generic' };
}
/**
 * Handles social media URL analysis to extract promotional data
 * @param page - Puppeteer page instance
 * @param url - Social media URL
 * @param platformInfo - Platform detection result
 * @returns Social media analysis data
 */
async function handleSocialMediaUrl(page, url, platformInfo) {
    console.log(chalk.cyan(`🎬 Analyzing ${platformInfo.platform} content for promotional indicators...`));
    let social_data;
    switch (platformInfo.platform) {
        case 'tiktok':
            social_data = await scrapeTikTok(page, url);
            break;
        case 'instagram':
            // Instagram scraper would go here - for now return basic structure
            console.log(chalk.yellow('📸 Instagram scraping not yet implemented - using basic analysis'));
            social_data = {
                username: 'Unknown',
                caption: '',
                hashtags: [],
                mentions: [],
                likes: null,
                views: null,
                comments: null,
                shares: null,
                affiliate_codes: [],
                promotional_keywords: [],
                paid_promotion_detected: false,
                video_url: url,
                posting_date: null
            };
            break;
        case 'youtube':
            // YouTube scraper would go here
            console.log(chalk.yellow('📺 YouTube scraping not yet implemented - using basic analysis'));
            social_data = {
                username: 'Unknown',
                caption: '',
                hashtags: [],
                mentions: [],
                likes: null,
                views: null,
                comments: null,
                shares: null,
                affiliate_codes: [],
                promotional_keywords: [],
                paid_promotion_detected: false,
                video_url: url,
                posting_date: null
            };
            break;
        default:
            throw new Error(`Unsupported social platform: ${platformInfo.platform}`);
    }
    return {
        social_data,
        requires_product_url: true // Social media URLs require a separate product URL
    };
}
/**
 * Generic fallback scraper for unknown platforms
 * @param page - Puppeteer page instance
 * @param url - Product URL
 * @returns Basic product data with generic selectors
 */
async function scrapeGeneric(page, url) {
    console.log('🔍 Using generic scraper for:', url);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Generic selectors that might work on many e-commerce sites
        const genericSelectors = {
            name: [
                'h1', '.product-title', '.product-name', '#product-title',
                '[data-testid="product-name"]', '.product-info h1'
            ],
            price: [
                '.price', '.product-price', '.current-price', '.sale-price',
                '[data-testid="price"]', '.price-current'
            ],
            rating: [
                '.rating', '.stars', '.star-rating', '.product-rating',
                '[data-testid="rating"]'
            ]
        };
        // Try to extract product name
        let name = 'Unknown Product';
        for (const selector of genericSelectors.name) {
            try {
                name = await page.$eval(selector, (el) => el.textContent?.trim() || 'Unknown Product');
                if (name !== 'Unknown Product')
                    break;
            }
            catch {
                continue;
            }
        }
        // Try to extract price
        let price = 'Price Not Available';
        for (const selector of genericSelectors.price) {
            try {
                price = await page.$eval(selector, (el) => el.textContent?.trim() || 'Price Not Available');
                if (price !== 'Price Not Available')
                    break;
            }
            catch {
                continue;
            }
        }
        // Try to extract rating
        let rating = null;
        for (const selector of genericSelectors.rating) {
            try {
                rating = await page.$eval(selector, (el) => el.textContent?.match(/(\d+\.?\d*)/)?.[1] || null);
                if (rating)
                    break;
            }
            catch {
                continue;
            }
        }
        // Extract ingredients from page text
        let ingredientsRaw = '';
        try {
            const allText = await page.evaluate(() => document.body.innerText);
            const ingMatch = allText.match(/ingredients?\s*:?\s*([^.]*(?:water|aqua|glycerin)[^.]*)/i);
            if (ingMatch) {
                ingredientsRaw = ingMatch[1].trim();
            }
        }
        catch {
            console.warn('⚠️ Could not extract ingredients using generic scraper.');
        }
        const parsedIngredients = ingredientsRaw
            .split(/,|\/|·|;/)
            .map(i => i.trim().toLowerCase())
            .filter(i => i.length > 0);
        return {
            name,
            price,
            rating,
            reviews: [], // Generic scraper doesn't extract reviews
            ingredients: {
                raw: ingredientsRaw,
                parsed: parsedIngredients
            },
            platform: 'generic'
        };
    }
    catch (err) {
        console.error('❌ Error with generic scraper:', err);
        throw err;
    }
}
/**
 * Main scraping function that routes to appropriate platform scraper
 * @param page - Puppeteer page instance
 * @param url - URL to scrape (product or social media)
 * @param productUrl - Optional separate product URL (if main URL is social media)
 * @returns Standardized data with optional social media analysis
 */
export async function scrapeProduct(page, url, productUrl) {
    const platformInfo = detectPlatform(url);
    console.log(chalk.blue(`🔍 Detected: ${platformInfo.type} (${platformInfo.platform})`));
    try {
        // Handle social media URLs
        if (platformInfo.type === 'social') {
            const socialResult = await handleSocialMediaUrl(page, url, platformInfo);
            console.log(chalk.cyan('📊 Social Media Analysis:'));
            console.log(chalk.gray(`  Username: ${socialResult.social_data.username}`));
            console.log(chalk.gray(`  Hashtags: ${socialResult.social_data.hashtags.length}`));
            console.log(chalk.gray(`  Affiliate Codes: ${socialResult.social_data.affiliate_codes.length}`));
            console.log(chalk.gray(`  Paid Promotion: ${socialResult.social_data.paid_promotion_detected ? 'YES' : 'NO'}`));
            // If no product URL provided, return social data only
            if (!productUrl) {
                console.log(chalk.yellow('⚠️ No product URL provided. Analysis limited to social media data.'));
                return {
                    name: `Social Media Post by ${socialResult.social_data.username}`,
                    price: 'N/A',
                    rating: null,
                    reviews: [],
                    ingredients: { raw: '', parsed: [] },
                    platform: platformInfo.platform,
                    tiktok_data: socialResult.social_data
                };
            }
            // Scrape the actual product from provided URL
            console.log(chalk.blue(`🛍️ Now analyzing product: ${productUrl}`));
            const productData = await scrapeProduct(page, productUrl); // Recursive call for product URL
            // Combine social and product data
            return {
                ...productData,
                tiktok_data: socialResult.social_data
            };
        }
        // Handle product URLs (existing logic)
        let productData;
        switch (platformInfo.platform) {
            case 'oliveyoung':
                const oliveYoungData = await scrapeOliveYoung(url);
                if (!oliveYoungData) {
                    throw new Error('OliveYoung scraper returned null');
                }
                productData = {
                    name: oliveYoungData.product_name,
                    price: oliveYoungData.price_usd,
                    rating: null,
                    reviews: [],
                    ingredients: {
                        raw: oliveYoungData.ingredients.join(', '),
                        parsed: oliveYoungData.ingredients
                    },
                    platform: 'oliveyoung'
                };
                break;
            case 'amazon':
                productData = await scrapeAmazon(page, url);
                break;
            case 'yesstyle':
                productData = await scrapeYesStyle(page, url);
                break;
            default:
                console.log(chalk.yellow(`⚠️ Platform '${platformInfo.platform}' not specifically supported. Using generic scraper...`));
                productData = await scrapeGeneric(page, url);
                break;
        }
        // Ensure all required fields are present
        const result = {
            name: productData.name || 'Unknown Product',
            price: productData.price || 'Price Not Available',
            rating: productData.rating || null,
            reviews: productData.reviews || [],
            ingredients: productData.ingredients || {
                raw: '',
                parsed: []
            },
            platform: platformInfo.platform
        };
        console.log(chalk.green(`✅ Successfully scraped from ${platformInfo.platform}: ${result.name}`));
        return result;
    }
    catch (err) {
        console.error(chalk.red(`❌ Error scraping from ${platformInfo.platform}:`), err);
        // If platform-specific scraper fails, try generic scraper as fallback
        if (platformInfo.platform !== 'generic' && platformInfo.type === 'product') {
            console.log('🔄 Attempting fallback with generic scraper...');
            try {
                return await scrapeGeneric(page, url);
            }
            catch (fallbackErr) {
                console.error('❌ Generic scraper also failed:', fallbackErr);
            }
        }
        throw err;
    }
}
