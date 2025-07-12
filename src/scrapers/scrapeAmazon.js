import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
/**
 * Scrapes product information from Amazon product pages
 * @param page - Puppeteer page instance
 * @param url - Amazon product URL
 * @returns Product data including name, price, rating, reviews, and ingredients
 */
export async function scrapeAmazon(page, url) {
    console.log('🔍 Scraping Amazon product:', url);
    try {
        // Navigate to the Amazon product page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Wait for the main product content to load
        await page.waitForSelector('#productTitle', { timeout: 15000 });
        // Extract product name
        const name = await page.$eval('#productTitle', (el) => el.textContent?.trim() || 'Unknown');
        // Extract price (Amazon has multiple price selectors)
        let price = 'Unknown';
        const priceSelectors = [
            '.a-price-whole',
            '.a-price .a-offscreen',
            '#price_inside_buybox',
            '.a-price-range'
        ];
        for (const selector of priceSelectors) {
            try {
                price = await page.$eval(selector, (el) => el.textContent?.trim() || 'Unknown');
                if (price !== 'Unknown')
                    break;
            }
            catch {
                // Continue to next selector if current one fails
                continue;
            }
        }
        // Extract rating
        let rating = null;
        try {
            rating = await page.$eval('[data-hook="average-star-rating"] .a-icon-alt', (el) => el.textContent?.match(/(\d+\.?\d*)/)?.[1] || null);
        }
        catch {
            console.warn('⚠️ Rating not found on Amazon product page.');
        }
        // Extract reviews (first few visible reviews)
        let reviews = [];
        try {
            reviews = await page.$$eval('[data-hook="review-body"] span', (els) => els.slice(0, 5).map(el => el.textContent?.trim() || '').filter(Boolean));
        }
        catch {
            console.warn('⚠️ Reviews not found on Amazon product page.');
        }
        // Extract ingredients from product description or features
        let ingredientsRaw = '';
        try {
            // Try multiple locations where ingredients might be listed
            const ingredientSelectors = [
                '#feature-bullets ul li span',
                '#productDescription p',
                '[data-feature-name="ingredients"] p'
            ];
            const allText = await page.evaluate(() => document.body.innerText);
            // Look for ingredients in various formats
            const ingMatch = allText.match(/ingredients?\s*:?\s*([^.]*(?:water|aqua|glycerin)[^.]*)/i) ||
                allText.match(/full ingredients?\s*:?\s*([^.]*)/i);
            if (ingMatch) {
                ingredientsRaw = ingMatch[1].trim();
            }
        }
        catch {
            console.warn('⚠️ Could not extract ingredients from Amazon product page.');
        }
        // Parse ingredients into individual components
        const parsedIngredients = ingredientsRaw
            .split(/,|\/|;|\|/)
            .map(ingredient => ingredient.trim().toLowerCase())
            .filter(ingredient => ingredient.length > 2); // Filter out very short strings
        return {
            name,
            price,
            rating,
            reviews,
            ingredients: {
                raw: ingredientsRaw,
                parsed: parsedIngredients
            }
        };
    }
    catch (error) {
        console.error('❌ Error scraping Amazon product:', error);
        throw new Error(`Failed to scrape Amazon product: ${error}`);
    }
}
