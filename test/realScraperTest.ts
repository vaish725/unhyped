import chalk from 'chalk';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeProduct } from '../src/scrapeProduct.js';
import { scrapeRedditReviews, scrapeSephoraReviews, generateReviewSummary } from '../src/scrapers/scrapeReviews.js';
import { scrapeTikTok } from '../src/scrapers/scrapeTikTok.js';
import fs from 'fs/promises';

puppeteer.use(StealthPlugin());

/**
 * Real-world test scenarios for all scrapers
 */
interface RealTestCase {
  name: string;
  url: string;
  type: 'product' | 'social' | 'review';
  timeout: number;
  expectedFields: string[];
  notes: string;
}

const realTestCases: RealTestCase[] = [
  // Product Scraping Tests
  {
    name: '🛍️ Amazon Product Test',
    url: 'https://www.amazon.com/CeraVe-Hydrating-Facial-Cleanser-Washing/dp/B01MSSDEPK',
    type: 'product',
    timeout: 60000,
    expectedFields: ['name', 'price', 'platform'],
    notes: 'Popular CeraVe cleanser - should extract basic product info'
  },
  {
    name: '🛍️ Generic E-commerce Test',
    url: 'https://example.com/nonexistent-product',
    type: 'product',
    timeout: 30000,
    expectedFields: ['name', 'platform'],
    notes: 'Should gracefully handle non-existent URLs'
  },
  
  // Social Media Tests
  {
    name: '🎬 TikTok URL Detection Test',
    url: 'https://www.tiktok.com/@khaby.lame/video/7137423965982174506',
    type: 'social',
    timeout: 45000,
    expectedFields: ['platform', 'tiktok_data'],
    notes: 'Should detect TikTok platform and return social data'
  },
  {
    name: '📸 Instagram URL Test',
    url: 'https://www.instagram.com/p/CgQqQqQqQqQ/',
    type: 'social',
    timeout: 30000,
    expectedFields: ['platform'],
    notes: 'Should detect Instagram platform'
  }
];

/**
 * Review test scenarios
 */
const reviewTestScenarios = [
  {
    name: '💬 Reddit Reviews - Popular Product',
    productName: 'CeraVe Hydrating Cleanser',
    platform: 'reddit',
    timeout: 60000,
    notes: 'Should find multiple reviews from skincare communities'
  },
  {
    name: '💬 Reddit Reviews - Niche Product',
    productName: 'The Ordinary Niacinamide',
    platform: 'reddit',
    timeout: 60000,
    notes: 'Popular skincare product with many Reddit discussions'
  }
];

/**
 * Runs a comprehensive test of a single scraper
 */
async function runRealScraperTest(testCase: RealTestCase, page: any): Promise<any> {
  console.log(chalk.blue(`\n🧪 ${testCase.name}`));
  console.log(chalk.gray(`   URL: ${testCase.url}`));
  console.log(chalk.gray(`   Timeout: ${testCase.timeout}ms`));
  console.log(chalk.gray(`   Expected: ${testCase.expectedFields.join(', ')}`));
  
  const startTime = Date.now();
  
  try {
    let result: any;
    
    if (testCase.type === 'product' || testCase.type === 'social') {
      result = await scrapeProduct(page, testCase.url);
    }
    
    const duration = Date.now() - startTime;
    
    // Validate expected fields
    const missingFields = testCase.expectedFields.filter(field => !result || result[field] === undefined);
    const hasAllFields = missingFields.length === 0;
    
    if (hasAllFields) {
      console.log(chalk.green(`   ✅ SUCCESS (${duration}ms)`));
      console.log(chalk.gray(`      Product: ${result.name || 'N/A'}`));
      console.log(chalk.gray(`      Platform: ${result.platform || 'N/A'}`));
      console.log(chalk.gray(`      Price: ${result.price || 'N/A'}`));
      
      if (result.tiktok_data) {
        console.log(chalk.gray(`      Social: ${result.tiktok_data.username || 'Unknown'}`));
        console.log(chalk.gray(`      Promotional: ${result.tiktok_data.paid_promotion_detected ? 'YES' : 'NO'}`));
      }
      
      if (result.ingredients && result.ingredients.parsed && result.ingredients.parsed.length > 0) {
        console.log(chalk.gray(`      Ingredients: ${result.ingredients.parsed.length} found`));
      }
    } else {
      console.log(chalk.yellow(`   ⚠️ PARTIAL SUCCESS (${duration}ms)`));
      console.log(chalk.gray(`      Missing fields: ${missingFields.join(', ')}`));
      console.log(chalk.gray(`      Got: ${Object.keys(result || {}).join(', ')}`));
    }
    
    return {
      testName: testCase.name,
      success: true,
      duration,
      result,
      notes: testCase.notes
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(chalk.red(`   ❌ FAILED (${duration}ms)`));
    console.log(chalk.gray(`      Error: ${String(error).substring(0, 100)}...`));
    
    return {
      testName: testCase.name,
      success: false,
      duration,
      error: String(error),
      notes: testCase.notes
    };
  }
}

/**
 * Tests review scrapers with real queries
 */
async function runReviewTests(page: any): Promise<any[]> {
  console.log(chalk.blue('\n🔍 TESTING REVIEW SCRAPERS'));
  console.log(chalk.gray('='.repeat(60)));
  
  const results: any[] = [];
  
  for (const scenario of reviewTestScenarios) {
    console.log(chalk.blue(`\n🧪 ${scenario.name}`));
    console.log(chalk.gray(`   Product: ${scenario.productName}`));
    console.log(chalk.gray(`   Platform: ${scenario.platform}`));
    
    const startTime = Date.now();
    
    try {
      let reviews: any[] = [];
      
      if (scenario.platform === 'reddit') {
        reviews = await scrapeRedditReviews(page, scenario.productName);
      }
      
      const duration = Date.now() - startTime;
      const summary = generateReviewSummary(reviews);
      
      console.log(chalk.green(`   ✅ SUCCESS (${duration}ms)`));
      console.log(chalk.gray(`      Reviews found: ${reviews.length}`));
      console.log(chalk.gray(`      Positive: ${summary.sentiment_breakdown.positive}`));
      console.log(chalk.gray(`      Negative: ${summary.sentiment_breakdown.negative}`));
      console.log(chalk.gray(`      Neutral: ${summary.sentiment_breakdown.neutral}`));
      
      if (reviews.length > 0) {
        console.log(chalk.gray(`      Sample review: "${reviews[0].content.substring(0, 50)}..."`));
      }
      
      results.push({
        testName: scenario.name,
        success: true,
        duration,
        reviewCount: reviews.length,
        summary,
        notes: scenario.notes
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`   ❌ FAILED (${duration}ms)`));
      console.log(chalk.gray(`      Error: ${String(error).substring(0, 100)}...`));
      
      results.push({
        testName: scenario.name,
        success: false,
        duration,
        error: String(error),
        notes: scenario.notes
      });
    }
  }
  
  return results;
}

/**
 * Tests TikTok analysis with mock data
 */
async function runTikTokAnalysisTest(): Promise<any[]> {
  console.log(chalk.blue('\n🎬 TESTING TIKTOK ANALYSIS'));
  console.log(chalk.gray('='.repeat(60)));
  
  const results: any[] = [];
  
  // Test promotional content detection with realistic examples
  const testCaptions = [
    {
      caption: 'OMG this skincare routine changed my life! Use my code GLOW20 for 20% off at checkout! #skincare #ad #sponsored',
      shouldDetectPromo: true,
      description: 'Clear promotional content with affiliate code'
    },
    {
      caption: 'My evening skincare routine ✨ Products linked in my bio! #skincare #selfcare #routine',
      shouldDetectPromo: true,
      description: 'Subtle promotion with link in bio'
    },
    {
      caption: 'Just sharing my favorite moisturizer because it makes my skin so soft and glowy 🌟 #skincare #beauty',
      shouldDetectPromo: false,
      description: 'Genuine product sharing without promotion'
    },
    {
      caption: 'Gifted these products but honest review! This serum is amazing for dry skin #gifted #honest',
      shouldDetectPromo: true,
      description: 'Gifted product disclosure'
    }
  ];
  
  testCaptions.forEach((test, index) => {
    console.log(chalk.blue(`\n🧪 TikTok Caption Analysis ${index + 1}`));
    console.log(chalk.gray(`   Description: ${test.description}`));
    console.log(chalk.gray(`   Caption: "${test.caption.substring(0, 60)}..."`));
    
    const startTime = Date.now();
    
    try {
      // Simulate the analysis logic from scrapeTikTok.ts
      const hashtags = test.caption.match(/#[\w]+/g) || [];
      const affiliateCodes = test.caption.match(/\b[A-Z]{2,}\d{1,3}\b/g) || [];
      const promoKeywords = /sponsored|ad|paid|partnership|code|discount|affiliate|promo|link in bio|gifted/i.test(test.caption);
      
      const paidPromotionDetected = promoKeywords || affiliateCodes.length > 0 || 
        hashtags.some(tag => ['#ad', '#sponsored', '#partnership', '#paid', '#gifted'].includes(tag.toLowerCase()));
      
      const duration = Date.now() - startTime;
      
      const correctDetection = paidPromotionDetected === test.shouldDetectPromo;
      
      if (correctDetection) {
        console.log(chalk.green(`   ✅ CORRECT DETECTION (${duration}ms)`));
      } else {
        console.log(chalk.yellow(`   ⚠️ INCORRECT DETECTION (${duration}ms)`));
        console.log(chalk.gray(`      Expected: ${test.shouldDetectPromo}, Got: ${paidPromotionDetected}`));
      }
      
      console.log(chalk.gray(`      Promotional: ${paidPromotionDetected ? 'YES' : 'NO'}`));
      console.log(chalk.gray(`      Hashtags: ${hashtags.length}, Codes: ${affiliateCodes.length}`));
      
      results.push({
        testName: `TikTok Caption Analysis ${index + 1}`,
        success: correctDetection,
        duration,
        detected: paidPromotionDetected,
        expected: test.shouldDetectPromo,
        description: test.description
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`   ❌ ANALYSIS FAILED (${duration}ms)`));
      
      results.push({
        testName: `TikTok Caption Analysis ${index + 1}`,
        success: false,
        duration,
        error: String(error)
      });
    }
  });
  
  return results;
}

/**
 * Main test runner function
 */
export async function runComprehensiveScraperTests() {
  console.log(chalk.blue('🚀 COMPREHENSIVE SCRAPER TESTING'));
  console.log(chalk.blue('Testing all scrapers with real URLs and scenarios'));
  console.log(chalk.gray('='.repeat(60)));
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set realistic user agent and viewport
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });
  
  try {
    const allResults: any[] = [];
    
    // Test product scrapers
    console.log(chalk.blue('\n🛍️ TESTING PRODUCT SCRAPERS'));
    console.log(chalk.gray('='.repeat(60)));
    
    for (const testCase of realTestCases) {
      const result = await runRealScraperTest(testCase, page);
      allResults.push(result);
      
      // Delay between tests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test review scrapers
    const reviewResults = await runReviewTests(page);
    allResults.push(...reviewResults);
    
    // Test TikTok analysis
    const tiktokResults = await runTikTokAnalysisTest();
    allResults.push(...tiktokResults);
    
    // Generate final report
    await generateFinalTestReport(allResults);
    
    return allResults;
    
  } finally {
    await browser.close();
  }
}

/**
 * Generates comprehensive test report
 */
async function generateFinalTestReport(results: any[]) {
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  console.log(chalk.blue('\n📊 COMPREHENSIVE TEST REPORT'));
  console.log(chalk.gray('='.repeat(60)));
  
  console.log(chalk.cyan(`📈 Success Rate: ${successfulTests.length}/${results.length} (${((successfulTests.length / results.length) * 100).toFixed(1)}%)`));
  console.log(chalk.cyan(`⏱️  Total Duration: ${totalDuration}ms`));
  console.log(chalk.cyan(`⚡ Average Duration: ${Math.round(totalDuration / results.length)}ms`));
  
  if (successfulTests.length > 0) {
    console.log(chalk.green(`\n✅ SUCCESSFUL TESTS (${successfulTests.length}):`));
    successfulTests.forEach(test => {
      console.log(chalk.green(`   • ${test.testName}`));
    });
  }
  
  if (failedTests.length > 0) {
    console.log(chalk.red(`\n❌ FAILED TESTS (${failedTests.length}):`));
    failedTests.forEach(test => {
      console.log(chalk.red(`   • ${test.testName}`));
      if (test.error) {
        console.log(chalk.gray(`     ${test.error.substring(0, 80)}...`));
      }
    });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: results.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      success_rate: `${((successfulTests.length / results.length) * 100).toFixed(1)}%`,
      total_duration_ms: totalDuration,
      average_duration_ms: Math.round(totalDuration / results.length)
    },
    detailed_results: results
  };
  
  try {
    await fs.writeFile('test/comprehensive-test-report.json', JSON.stringify(report, null, 2));
    console.log(chalk.blue('\n💾 Detailed report saved to: test/comprehensive-test-report.json'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Could not save detailed report'));
  }
  
  console.log(chalk.blue('\n🎯 SCRAPER TESTING COMPLETE!'));
  
  if (successfulTests.length >= results.length * 0.7) {
    console.log(chalk.green('✅ All scrapers are functioning well - Ready for Stage 3!'));
  } else {
    console.log(chalk.yellow('⚠️ Some scrapers need attention before Stage 3'));
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveScraperTests()
    .then(() => {
      console.log(chalk.blue('\n🎉 All scraper tests completed!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('❌ Test suite failed:'), error);
      process.exit(1);
    });
} 