#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { scrapeProduct } from './scrapeProduct.js';
import { scrapeTikTok } from './scrapers/scrapeTikTok.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { RealityCheckEngine, RealityCheckResult } from './realityCheck.js';

// Configure puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Main CLI entry point with comprehensive reality check analysis
 */
class UnhypedCLI {
  private realityEngine: RealityCheckEngine;
  
  constructor() {
    // Initialize the Reality Check Engine
    this.realityEngine = new RealityCheckEngine();
  }
  
  /**
   * Scrapes product data using browser automation
   */
  private async scrapeProductData(url: string) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      const result = await scrapeProduct(page, url);
      return result;
    } finally {
      await browser.close();
    }
  }
  
  /**
   * Scrapes TikTok data using browser automation
   */
  private async scrapeTikTokData(url: string) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      const result = await scrapeTikTok(page, url);
      return result;
    } finally {
      await browser.close();
    }
  }
  
  /**
   * Mock review scraper for now (since the actual scraper has issues)
   */
  private async scrapeReviewData(productName: string) {
    // For now, return mock data until we fix the review scraper
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
  
  /**
   * Main analysis function that orchestrates all data gathering and analysis
   * @param productUrl - URL of the product to analyze
   * @param socialUrl - Optional social media URL (TikTok, Instagram, etc.)
   * @param options - CLI options
   */
  public async analyzeProduct(
    productUrl: string, 
    socialUrl?: string, 
    options: { output?: string; format?: string; profile?: string } = {}
  ): Promise<void> {
    
    console.log(chalk.blue.bold('\n🔍 UNHYPED - Reality Check Analysis'));
    console.log(chalk.gray('=======================================\n'));
    
    try {
      // Step 1: Scrape product data
      console.log(chalk.cyan('📦 Step 1: Analyzing product...'));
      const productData = await this.scrapeProductData(productUrl);
      
      if (!productData) {
        console.error(chalk.red('❌ Failed to scrape product data'));
        return;
      }
      
      console.log(chalk.green(`✅ Product data collected: ${productData.name}`));
      console.log(chalk.gray(`   Platform: ${productData.platform}`));
      console.log(chalk.gray(`   Price: ${productData.price}`));
      console.log(chalk.gray(`   Ingredients: ${productData.ingredients.parsed.length} found`));
      
      // Step 2: Scrape social media data (if provided)
      let socialData = undefined;
      if (socialUrl) {
        console.log(chalk.cyan('\n🎬 Step 2: Analyzing social media content...'));
        
        if (socialUrl.includes('tiktok.com')) {
          socialData = await this.scrapeTikTokData(socialUrl);
          if (socialData) {
            console.log(chalk.green('✅ TikTok data collected'));
            console.log(chalk.gray(`   Creator: @${socialData.username}`));
            console.log(chalk.gray(`   Engagement: ${socialData.likes} likes, ${socialData.views} views`));
            console.log(chalk.gray(`   Promotional content: ${socialData.paid_promotion_detected ? 'DETECTED' : 'Not detected'}`));
          } else {
            console.log(chalk.yellow('⚠️ Could not extract TikTok data'));
          }
        } else {
          console.log(chalk.yellow('⚠️ Social media platform not yet supported'));
        }
      } else {
        console.log(chalk.gray('⏭️ Step 2: No social media URL provided, skipping social analysis'));
      }
      
      // Step 3: Scrape reviews (if available)
      console.log(chalk.cyan('\n💬 Step 3: Gathering review data...'));
      let reviewSummary = undefined;
      
      try {
        // Try to get reviews for the product
        const productName = productData.name;
        reviewSummary = await this.scrapeReviewData(productName);
        
        if (reviewSummary && reviewSummary.total_reviews > 0) {
          console.log(chalk.green(`✅ Review data collected: ${reviewSummary.total_reviews} reviews`));
          console.log(chalk.gray(`   Sentiment: ${reviewSummary.sentiment_breakdown.positive}+ / ${reviewSummary.sentiment_breakdown.negative}- / ${reviewSummary.sentiment_breakdown.neutral}=`));
        } else {
          console.log(chalk.yellow('⚠️ No review data found'));
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️ Could not gather review data'));
      }
      
      // Step 4: Run comprehensive reality check analysis
      console.log(chalk.cyan('\n🤖 Step 4: Running Reality Check Analysis...'));
      const realityResult = await this.realityEngine.analyzeProduct(
        productData,
        socialData,
        reviewSummary
      );
      
      // Step 5: Display results
      console.log(chalk.cyan('\n📊 Step 5: Generating report...'));
      await this.displayResults(realityResult, options);
      
      // Step 6: Save results (if requested)
      if (options.output) {
        await this.saveResults(realityResult, options);
      }
      
    } catch (error) {
      console.error(chalk.red('\n❌ Analysis failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  }
  
  /**
   * Displays the reality check results in a formatted way
   */
  private async displayResults(result: RealityCheckResult, options: any): Promise<void> {
    console.log(chalk.blue.bold('\n🎯 REALITY CHECK RESULTS'));
    console.log(chalk.gray('========================\n'));
    
    // Overall verdict
    const verdictColor = result.overall_verdict === 'authentic' ? chalk.green :
                        result.overall_verdict === 'suspicious' ? chalk.yellow : chalk.red;
    
    console.log(chalk.cyan('Overall Assessment:'));
    console.log(`   ${verdictColor('●')} Verdict: ${verdictColor(result.overall_verdict.toUpperCase())}`);
    console.log(`   🎯 Reality Score: ${this.getScoreColor(result.reality_score)}${result.reality_score}/100${chalk.reset()}`);
    console.log(`   📊 Confidence: ${result.confidence_level.toUpperCase()}`);
    
    // Detailed breakdown
    console.log(chalk.cyan('\nDetailed Analysis:'));
    console.log(`   📦 Product: ${result.product_analysis.product_name}`);
    console.log(`   🏪 Platform: ${result.product_analysis.platform} (availability: ${result.product_analysis.availability_score}/100)`);
    console.log(`   🏷️ Brand: ${result.product_analysis.brand_recognition === 'well_known' ? 'Well-known' : 'Unknown/Emerging'}`);
    
    if (result.social_analysis.has_social_data) {
      console.log(`   🎬 Social Media: Promotional probability ${result.social_analysis.sponsored_content_probability}%`);
      console.log(`   📱 Affiliate Codes: ${result.social_analysis.affiliate_codes_found} found`);
    } else {
      console.log(`   🎬 Social Media: No data available`);
    }
    
    console.log(`   🧪 Ingredients: ${result.ingredient_analysis.total_ingredients} total (quality score: ${result.ingredient_analysis.ingredient_quality_score}/100)`);
    
    if (result.ingredient_analysis.beneficial_ingredients.length > 0) {
      console.log(`   ✅ Beneficial: ${result.ingredient_analysis.beneficial_ingredients.slice(0, 3).join(', ')}${result.ingredient_analysis.beneficial_ingredients.length > 3 ? '...' : ''}`);
    }
    
    if (result.ingredient_analysis.potentially_harmful.length > 0) {
      console.log(`   ⚠️ Concerning: ${result.ingredient_analysis.potentially_harmful.slice(0, 3).join(', ')}${result.ingredient_analysis.potentially_harmful.length > 3 ? '...' : ''}`);
    }
    
    console.log(`   💬 Reviews: ${result.review_analysis.review_count} reviews (credibility: ${result.review_analysis.review_credibility})`);
    console.log(`   💰 Price: ${result.price_analysis.price_range} (value: ${result.price_analysis.value_assessment})`);
    
    // Red flags (if any)
    if (result.red_flags.length > 0) {
      console.log(chalk.red('\n🚩 Red Flags:'));
      result.red_flags.forEach(flag => {
        console.log(chalk.red(`   • ${flag}`));
      });
    }
    
    // Green flags (if any)
    if (result.green_flags.length > 0) {
      console.log(chalk.green('\n✅ Green Flags:'));
      result.green_flags.forEach(flag => {
        console.log(chalk.green(`   • ${flag}`));
      });
    }
    
    // Recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.cyan('\n💡 Recommendations:'));
      result.recommendations.forEach(rec => {
        console.log(chalk.cyan(`   • ${rec}`));
      });
    }
    
    // Data sources
    console.log(chalk.gray(`\n📊 Analysis based on data from: ${result.data_sources.join(', ')}`));
    console.log(chalk.gray(`🕒 Generated: ${new Date(result.analysis_timestamp).toLocaleString()}`));
  }
  
  /**
   * Returns appropriate color for reality score
   */
  private getScoreColor(score: number): any {
    if (score >= 80) return chalk.green;
    if (score >= 60) return chalk.yellow;
    if (score >= 40) return chalk.yellowBright;
    return chalk.red;
  }
  
  /**
   * Saves results to file
   */
  private async saveResults(result: RealityCheckResult, options: any): Promise<void> {
    try {
      const outputPath = options.output || 'output/reality_check_report.json';
      const outputDir = path.dirname(outputPath);
      
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Format based on requested format
      let outputData: string;
      if (options.format === 'json' || outputPath.endsWith('.json')) {
        outputData = JSON.stringify(result, null, 2);
      } else {
        // Default to JSON
        outputData = JSON.stringify(result, null, 2);
      }
      
      await fs.writeFile(outputPath, outputData, 'utf8');
      console.log(chalk.green(`\n💾 Results saved to: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to save results:'), error);
    }
  }
}

// CLI Setup
const program = new Command();
const cli = new UnhypedCLI();

program
  .name('unhyped')
  .description('Reality check for skincare product recommendations')
  .version('3.0.0');

program
  .command('analyze')
  .description('Analyze a skincare product for authenticity and quality')
  .argument('<product-url>', 'URL of the product to analyze')
  .option('-s, --social <url>', 'Social media URL (TikTok, Instagram, etc.)')
  .option('-o, --output <path>', 'Output file path for results')
  .option('-f, --format <format>', 'Output format (json)', 'json')
  .option('-p, --profile <path>', 'User profile JSON file (optional)', 'data/profile.json')
  .action(async (productUrl: string, options: any) => {
    await cli.analyzeProduct(productUrl, options.social, {
      output: options.output,
      format: options.format,
      profile: options.profile
    });
  });

// Quick test command for development
program
  .command('test')
  .description('Run a quick test with sample data')
  .action(async () => {
    console.log(chalk.blue('🧪 Running quick test...'));
    
    // Test with a sample product URL
    const testUrl = 'https://www.amazon.com/dp/B08P2V3V8J'; // Sample CeraVe product
    await cli.analyzeProduct(testUrl);
  });

// Display help if no arguments provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
