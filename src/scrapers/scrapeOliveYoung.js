import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
puppeteer.use(StealthPlugin());
/**
 * Scrapes product information from OliveYoung product pages
 * @param page - Puppeteer page instance (currently creates its own browser)
 * @param url - OliveYoung product URL
 * @returns Standardized product data or null on failure
 */
export async function scrapeOliveYoung(url) {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
    try {
        console.log(`🔍 Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
        // Wait for JS-rendered content
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Save HTML and screenshot for debugging (only in output folder)
        try {
            await fs.writeFile('output/oliveyoung_debug.html', await page.content());
            await page.screenshot({ path: 'output/oliveyoung_debug.png', fullPage: true });
        }
        catch (debugError) {
            console.warn('⚠️ Could not save debug files:', debugError);
        }
        await page.waitForSelector('.prd-brand-info', { timeout: 15000 });
        const basicData = await page.evaluate(() => {
            const product_name = document.querySelector('.prd-brand-info dl dt')?.textContent?.trim() || 'N/A';
            const brand = document.querySelector('.prd-brand-info h3 a')?.textContent?.trim() || 'N/A';
            const price_usd = document.querySelector('.prd-price-info .price span')?.textContent?.trim() || 'N/A';
            const stock_status = document.querySelector('.btn.btn-buy') ? 'In Stock' : 'Out of Stock';
            return { product_name, brand, price_usd, stock_status };
        });
        const detailData = await page.evaluate(() => {
            const infoBlocks = document.querySelectorAll('#productDetailInfo dl > div');
            const result = {};
            infoBlocks.forEach((div) => {
                const label = div.querySelector('dt')?.textContent?.trim();
                const value = div.querySelector('dd')?.textContent?.trim();
                if (label && value) {
                    result[label.toLowerCase()] = value;
                }
            });
            const rawIngredients = result['ingredients'] || '';
            const rawDescription = result['how to use'] || 'N/A';
            return {
                ingredients: rawIngredients.split(',').map(i => i.trim()).filter(Boolean),
                description: rawDescription
            };
        });
        const data = { ...basicData, ...detailData };
        console.log('✅ Scraped OliveYoung Product Data:', data);
        await browser.close();
        return data;
    }
    catch (error) {
        console.error('❌ Error scraping OliveYoung:', error);
        await browser.close();
        return null;
    }
}
