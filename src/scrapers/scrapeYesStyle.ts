import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

/**
 * Scrapes product information from YesStyle product pages
 * @param page - Puppeteer page instance
 * @param url - YesStyle product URL
 * @returns Product data including name, price, rating, reviews, and ingredients
 */
export async function scrapeYesStyle(page: Page, url: string): Promise<{
  name: string;
  price: string;
  rating: string | null;
  reviews: string[];
  ingredients: {
    raw: string;
    parsed: string[];
  };
}> {
  console.log('🔍 Scraping YesStyle product:', url);

  try {
    // Navigate to the YesStyle product page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for JavaScript-rendered content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Wait for the main product content to load
    await page.waitForSelector('.product-title, .js-prd-name', { timeout: 15000 });

    // Extract product name (YesStyle uses different selectors)
    let name = 'Unknown';
    const nameSelectors = [
      '.product-title',
      '.js-prd-name',
      '.pdp-product-name',
      'h1[data-testid="product-name"]'
    ];
    
    for (const selector of nameSelectors) {
      try {
        name = await page.$eval(selector, (el: Element) => 
          el.textContent?.trim() || 'Unknown'
        );
        if (name !== 'Unknown') break;
      } catch {
        continue;
      }
    }

    // Extract price (YesStyle shows prices in multiple currencies)
    let price = 'Unknown';
    const priceSelectors = [
      '.product-price .price',
      '.js-prd-price',
      '.pdp-price-current',
      '[data-testid="price-current"]',
      '.price-current'
    ];
    
    for (const selector of priceSelectors) {
      try {
        price = await page.$eval(selector, (el: Element) => 
          el.textContent?.trim() || 'Unknown'
        );
        if (price !== 'Unknown') break;
      } catch {
        continue;
      }
    }

    // Extract rating
    let rating: string | null = null;
    try {
      const ratingSelectors = [
        '.rating-stars',
        '.js-rating-value',
        '[data-testid="rating-value"]'
      ];
      
      for (const selector of ratingSelectors) {
        try {
          rating = await page.$eval(selector, (el: Element) => 
            el.textContent?.match(/(\d+\.?\d*)/)?.[1] || null
          );
          if (rating) break;
        } catch {
          continue;
        }
      }
    } catch {
      console.warn('⚠️ Rating not found on YesStyle product page.');
    }

    // Extract reviews
    let reviews: string[] = [];
    try {
      const reviewSelectors = [
        '.review-item .review-content',
        '.js-review-text',
        '[data-testid="review-text"]'
      ];

      for (const selector of reviewSelectors) {
        try {
          reviews = await page.$$eval(selector, (els: Element[]) =>
            els.slice(0, 5).map(el => el.textContent?.trim() || '').filter(Boolean)
          );
          if (reviews.length > 0) break;
        } catch {
          continue;
        }
      }
    } catch {
      console.warn('⚠️ Reviews not found on YesStyle product page.');
    }

    // Extract ingredients from product details
    let ingredientsRaw = '';
    try {
      // YesStyle often has expandable product details section
      const expandButtons = await page.$$('.js-expand-btn, .expand-btn, [data-testid="expand-details"]');
      for (const button of expandButtons) {
        try {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch {
          // Continue if click fails
        }
      }

      // Extract all text from the page
      const allText = await page.evaluate(() => document.body.innerText);
      
      // Look for ingredients in various formats and languages
      const ingredientPatterns = [
        /ingredients?\s*:?\s*([^.]*(?:water|aqua|glycerin|dimethicone)[^.]*)/i,
        /성분\s*:?\s*([^.]*)/i, // Korean for "ingredients"
        /全成分\s*:?\s*([^.]*)/i, // Japanese for "all ingredients"
        /成分表\s*:?\s*([^.]*)/i // Chinese for "ingredient list"
      ];

      for (const pattern of ingredientPatterns) {
        const match = allText.match(pattern);
        if (match) {
          ingredientsRaw = match[1].trim();
          break;
        }
      }

      // If no ingredients found in main text, check product detail sections
      if (!ingredientsRaw) {
        const detailSections = await page.$$eval('.product-details p, .pdp-details p, .js-product-info p', 
          (els: Element[]) => els.map(el => el.textContent?.trim() || '')
        );
        
        for (const section of detailSections) {
          if (section.toLowerCase().includes('ingredient')) {
            ingredientsRaw = section;
            break;
          }
        }
      }
    } catch {
      console.warn('⚠️ Could not extract ingredients from YesStyle product page.');
    }

    // Parse ingredients into individual components
    const parsedIngredients = ingredientsRaw
      .split(/,|\/|;|\||·|、/) // Include various separators used in Asian markets
      .map(ingredient => ingredient.trim().toLowerCase())
      .filter(ingredient => ingredient.length > 1 && !ingredient.match(/^\d+$/)); // Filter out numbers and very short strings

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

  } catch (error) {
    console.error('❌ Error scraping YesStyle product:', error);
    throw new Error(`Failed to scrape YesStyle product: ${error}`);
  }
}
