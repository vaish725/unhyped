import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
/**
 * Scrapes reviews from Sephora product pages
 * @param page - Puppeteer page instance
 * @param productUrl - Sephora product URL
 * @returns Array of review data
 */
export async function scrapeSephoraReviews(page, productUrl) {
    console.log('💄 Scraping Sephora reviews:', productUrl);
    try {
        await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // Wait for reviews section to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Extract review data
        const reviews = await page.evaluate(() => {
            const reviewElements = document.querySelectorAll([
                '[data-comp="ReviewCard"]',
                '.review-card',
                '.reviews-review',
                '.ProductReview'
            ].join(', '));
            return Array.from(reviewElements).map(element => {
                // Extract author
                const authorSelectors = [
                    '[data-at="review_author_name"]',
                    '.review-author',
                    '.reviewer-name'
                ];
                let author = 'Anonymous';
                for (const selector of authorSelectors) {
                    const authorEl = element.querySelector(selector);
                    if (authorEl?.textContent?.trim()) {
                        author = authorEl.textContent.trim();
                        break;
                    }
                }
                // Extract rating
                let rating = null;
                const ratingEl = element.querySelector('[data-at="star_rating"], .stars-rating, .rating-stars');
                if (ratingEl) {
                    const ariaLabel = ratingEl.getAttribute('aria-label');
                    if (ariaLabel) {
                        const match = ariaLabel.match(/(\d+\.?\d*)\s*out\s*of\s*5/i);
                        if (match) {
                            rating = parseFloat(match[1]);
                        }
                    }
                }
                // Extract title and content
                const titleEl = element.querySelector('[data-at="review_title"], .review-title, .review-headline');
                const contentEl = element.querySelector('[data-at="review_content"], .review-content, .review-text, .review-body');
                const title = titleEl?.textContent?.trim() || '';
                const content = contentEl?.textContent?.trim() || '';
                return { author, rating, title, content };
            }).filter(review => review.content.length > 10);
        });
        // Process reviews with sentiment analysis
        const processedReviews = reviews.map(review => ({
            platform: 'sephora',
            author: review.author,
            rating: review.rating,
            title: review.title,
            content: review.content,
            upvotes: null,
            downvotes: null,
            date: null,
            verified_purchase: false,
            helpful_count: null,
            sentiment: analyzeSentiment(review.content, review.rating),
            key_phrases: extractKeyPhrases(review.content)
        }));
        console.log(`✅ Extracted ${processedReviews.length} Sephora reviews`);
        return processedReviews;
    }
    catch (error) {
        console.error('❌ Error scraping Sephora reviews:', error);
        return [];
    }
}
/**
 * Scrapes reviews from Reddit (skincare communities)
 * @param page - Puppeteer page instance
 * @param productName - Product name to search for
 * @returns Array of review data
 */
export async function scrapeRedditReviews(page, productName) {
    console.log('🔴 Scraping Reddit reviews for:', productName);
    try {
        const searchQuery = encodeURIComponent(`${productName} review`);
        const url = `https://www.reddit.com/r/SkincareAddiction/search/?q=${searchQuery}&restrict_sr=1&sort=top&t=year`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        const reviews = await page.evaluate((productName) => {
            const posts = document.querySelectorAll('[data-testid="post-container"]');
            const results = [];
            Array.from(posts).slice(0, 5).forEach(post => {
                const titleEl = post.querySelector('h3');
                const contentEl = post.querySelector('[data-testid="post-content"]');
                const authorEl = post.querySelector('[data-testid="post_author_link"]');
                const title = titleEl?.textContent?.trim() || '';
                const content = contentEl?.textContent?.trim() || '';
                const author = authorEl?.textContent?.trim() || 'Anonymous';
                if ((title.toLowerCase().includes(productName.toLowerCase()) ||
                    content.toLowerCase().includes(productName.toLowerCase())) &&
                    content.length > 50) {
                    results.push({ author, title, content });
                }
            });
            return results;
        }, productName);
        const processedReviews = reviews.map(review => ({
            platform: 'reddit',
            author: review.author,
            rating: null,
            title: review.title,
            content: review.content,
            upvotes: null,
            downvotes: null,
            date: null,
            verified_purchase: false,
            helpful_count: null,
            sentiment: analyzeSentiment(review.content),
            key_phrases: extractKeyPhrases(review.content)
        }));
        console.log(`✅ Extracted ${processedReviews.length} Reddit reviews`);
        return processedReviews;
    }
    catch (error) {
        console.error('❌ Error scraping Reddit reviews:', error);
        return [];
    }
}
/**
 * Analyzes sentiment of review content
 */
function analyzeSentiment(content, rating) {
    if (rating !== null && rating !== undefined) {
        if (rating >= 4)
            return 'positive';
        if (rating <= 2)
            return 'negative';
        return 'neutral';
    }
    const positiveKeywords = [
        'love', 'amazing', 'great', 'excellent', 'recommend', 'best', 'good', 'works', 'effective'
    ];
    const negativeKeywords = [
        'hate', 'terrible', 'awful', 'bad', 'broke out', 'irritating', 'allergic', 'waste'
    ];
    const lowerContent = content.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    positiveKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword))
            positiveScore++;
    });
    negativeKeywords.forEach(keyword => {
        if (lowerContent.includes(keyword))
            negativeScore++;
    });
    if (positiveScore > negativeScore)
        return 'positive';
    if (negativeScore > positiveScore)
        return 'negative';
    return 'neutral';
}
/**
 * Extracts key phrases from review content
 */
function extractKeyPhrases(content) {
    const skinCareKeywords = [
        'moisturizing', 'hydrating', 'drying', 'irritating', 'gentle', 'harsh',
        'breaking out', 'acne', 'sensitive skin', 'oily skin', 'dry skin',
        'absorption', 'texture', 'scent', 'results', 'glow'
    ];
    const lowerContent = content.toLowerCase();
    return skinCareKeywords.filter(phrase => lowerContent.includes(phrase));
}
/**
 * Generates a comprehensive review summary
 */
export function generateReviewSummary(reviews) {
    if (reviews.length === 0) {
        return {
            total_reviews: 0,
            average_rating: null,
            sentiment_breakdown: { positive: 0, negative: 0, neutral: 0 },
            common_positives: [],
            common_negatives: [],
            recent_reviews: [],
            top_helpful_reviews: []
        };
    }
    const ratingsWithValues = reviews.filter(r => r.rating !== null);
    const average_rating = ratingsWithValues.length > 0 ?
        ratingsWithValues.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsWithValues.length : null;
    const sentiment_breakdown = {
        positive: reviews.filter(r => r.sentiment === 'positive').length,
        negative: reviews.filter(r => r.sentiment === 'negative').length,
        neutral: reviews.filter(r => r.sentiment === 'neutral').length
    };
    const positiveReviews = reviews.filter(r => r.sentiment === 'positive');
    const negativeReviews = reviews.filter(r => r.sentiment === 'negative');
    const common_positives = extractCommonPhrases(positiveReviews);
    const common_negatives = extractCommonPhrases(negativeReviews);
    return {
        total_reviews: reviews.length,
        average_rating,
        sentiment_breakdown,
        common_positives,
        common_negatives,
        recent_reviews: reviews.slice(-5),
        top_helpful_reviews: reviews.slice(0, 5)
    };
}
function extractCommonPhrases(reviews) {
    const allPhrases = reviews.flatMap(r => r.key_phrases);
    const phraseCount = new Map();
    allPhrases.forEach(phrase => {
        phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1);
    });
    return Array.from(phraseCount.entries())
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([phrase, _]) => phrase)
        .slice(0, 10);
}
