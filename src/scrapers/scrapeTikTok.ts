import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

/**
 * Interface for TikTok video data
 */
export interface TikTokVideoData {
  username: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  likes: number | null;
  views: number | null;
  comments: number | null;
  shares: number | null;
  affiliate_codes: string[];
  promotional_keywords: string[];
  paid_promotion_detected: boolean;
  video_url: string;
  posting_date: string | null;
}

/**
 * Scrapes TikTok video for promotional content analysis
 * @param page - Puppeteer page instance
 * @param url - TikTok video URL
 * @returns TikTok video data with promotion analysis
 */
export async function scrapeTikTok(page: Page, url: string): Promise<TikTokVideoData> {
  console.log('🎬 Scraping TikTok video:', url);

  try {
    // Navigate to TikTok video page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for video content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract video data
    const videoData = await page.evaluate(() => {
      // TikTok uses various selectors, we'll try multiple approaches
      const getTextContent = (selector: string): string | null => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || null : null;
      };

      const getTextContents = (selector: string): string[] => {
        const elements = document.querySelectorAll(selector);
        return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
      };

      // Extract username - try multiple selectors
      const usernameSelectors = [
        '[data-e2e="video-author-uniqueid"]',
        '[data-e2e="browse-video-author-uniqueid"]',
        '.video-author-uniqueid',
        '.author-uniqueid'
      ];
      
      let username = '';
      for (const selector of usernameSelectors) {
        const result = getTextContent(selector);
        if (result) {
          username = result.replace('@', '');
          break;
        }
      }

      // Extract caption/description - try multiple selectors
      const captionSelectors = [
        '[data-e2e="video-desc"]',
        '[data-e2e="browse-video-desc"]',
        '.video-meta-caption',
        '.tt-video-meta-caption'
      ];
      
      let caption = '';
      for (const selector of captionSelectors) {
        const result = getTextContent(selector);
        if (result) {
          caption = result;
          break;
        }
      }

      // Extract engagement metrics - try multiple selectors
      const likesSelectors = [
        '[data-e2e="video-like-count"]',
        '[data-e2e="browse-like-count"]',
        '.like-count'
      ];
      
      let likes: number | null = null;
      for (const selector of likesSelectors) {
        const result = getTextContent(selector);
        if (result) {
          // Parse numbers like "1.2M", "123K", etc.
          const match = result.match(/(\d+\.?\d*)\s*([KMB]?)/i);
          if (match) {
            let num = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase();
            if (unit === 'K') num *= 1000;
            else if (unit === 'M') num *= 1000000;
            else if (unit === 'B') num *= 1000000000;
            likes = Math.round(num);
          }
          break;
        }
      }

      // Extract views count
      const viewsSelectors = [
        '[data-e2e="video-views"]',
        '.video-count'
      ];
      
      let views: number | null = null;
      for (const selector of viewsSelectors) {
        const result = getTextContent(selector);
        if (result) {
          const match = result.match(/(\d+\.?\d*)\s*([KMB]?)/i);
          if (match) {
            let num = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase();
            if (unit === 'K') num *= 1000;
            else if (unit === 'M') num *= 1000000;
            else if (unit === 'B') num *= 1000000000;
            views = Math.round(num);
          }
          break;
        }
      }

      // Extract comments count
      const commentsSelectors = [
        '[data-e2e="video-comment-count"]',
        '[data-e2e="browse-comment-count"]'
      ];
      
      let comments: number | null = null;
      for (const selector of commentsSelectors) {
        const result = getTextContent(selector);
        if (result) {
          const match = result.match(/(\d+\.?\d*)\s*([KMB]?)/i);
          if (match) {
            let num = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase();
            if (unit === 'K') num *= 1000;
            else if (unit === 'M') num *= 1000000;
            else if (unit === 'B') num *= 1000000000;
            comments = Math.round(num);
          }
          break;
        }
      }

      // Extract shares count
      const sharesSelectors = [
        '[data-e2e="video-share-count"]',
        '[data-e2e="browse-share-count"]'
      ];
      
      let shares: number | null = null;
      for (const selector of sharesSelectors) {
        const result = getTextContent(selector);
        if (result) {
          const match = result.match(/(\d+\.?\d*)\s*([KMB]?)/i);
          if (match) {
            let num = parseFloat(match[1]);
            const unit = match[2]?.toUpperCase();
            if (unit === 'K') num *= 1000;
            else if (unit === 'M') num *= 1000000;
            else if (unit === 'B') num *= 1000000000;
            shares = Math.round(num);
          }
          break;
        }
      }

      // Try to extract posting date
      const dateSelectors = [
        '[data-e2e="video-create-time"]',
        '.video-create-time'
      ];
      
      let posting_date: string | null = null;
      for (const selector of dateSelectors) {
        const result = getTextContent(selector);
        if (result) {
          posting_date = result;
          break;
        }
      }

      return {
        username,
        caption,
        likes,
        views,
        comments,
        shares,
        posting_date
      };
    });

    // Analyze caption for hashtags, mentions, and promotional content
    const caption = videoData.caption || '';
    
    // Extract hashtags
    const hashtags = caption.match(/#[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || [];
    const cleanHashtags = hashtags.map(tag => tag.replace('#', '').toLowerCase());

    // Extract mentions
    const mentions = caption.match(/@[\w\u00c0-\u024f\u1e00-\u1eff]+/g) || [];
    const cleanMentions = mentions.map(mention => mention.replace('@', '').toLowerCase());

    // Extract affiliate codes (common patterns)
    const affiliateCodePatterns = [
      /\b[A-Z]{2,}\d{1,3}\b/g,           // Like "LENA20", "SARAH15"
      /\b[A-Z]+\d+\b/g,                  // Like "CODE20", "SAVE15"
      /\buse\s+code\s+([A-Z0-9]+)/gi,    // "use code BEAUTY20"
      /\bpromo\s+code\s+([A-Z0-9]+)/gi,  // "promo code SKINCARE"
      /\blink\s+in\s+bio/gi              // "link in bio"
    ];

    let affiliate_codes: string[] = [];
    for (const pattern of affiliateCodePatterns) {
      const matches = caption.match(pattern);
      if (matches) {
        affiliate_codes.push(...matches);
      }
    }

    // Remove duplicates and clean up
    affiliate_codes = [...new Set(affiliate_codes.map(code => code.toUpperCase()))];

    // Detect promotional keywords
    const promotionalKeywords = [
      'sponsored', 'ad', 'paid', 'partnership', 'collab', 'gifted',
      'discount', 'code', 'link', 'affiliate', 'promo', 'sale',
      'swipe up', 'link in bio', 'use my code', 'get yours',
      'limited time', 'exclusive', 'special offer'
    ];

    const foundPromotionalKeywords = promotionalKeywords.filter(keyword => 
      caption.toLowerCase().includes(keyword.toLowerCase())
    );

    // Determine if paid promotion is detected
    const paid_promotion_detected = 
      foundPromotionalKeywords.length > 0 || 
      affiliate_codes.length > 0 ||
      cleanHashtags.some(tag => ['ad', 'sponsored', 'partnership', 'paid'].includes(tag));

    const result: TikTokVideoData = {
      username: videoData.username || 'Unknown',
      caption: caption,
      hashtags: cleanHashtags,
      mentions: cleanMentions,
      likes: videoData.likes,
      views: videoData.views,
      comments: videoData.comments,
      shares: videoData.shares,
      affiliate_codes: affiliate_codes,
      promotional_keywords: foundPromotionalKeywords,
      paid_promotion_detected: paid_promotion_detected,
      video_url: url,
      posting_date: videoData.posting_date
    };

    console.log('✅ TikTok video analysis complete:', {
      username: result.username,
      hashtags_count: result.hashtags.length,
      promotional_keywords_count: result.promotional_keywords.length,
      paid_promotion_detected: result.paid_promotion_detected
    });

    return result;

  } catch (error) {
    console.error('❌ Error scraping TikTok video:', error);
    
    // Return minimal data structure even on error
    return {
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
  }
} 