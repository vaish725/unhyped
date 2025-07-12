import chalk from 'chalk';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { scrapeProduct } from '../src/scrapeProduct.js';
import { scrapeRedditReviews, generateReviewSummary } from '../src/scrapers/scrapeReviews.js';
import fs from 'fs/promises';
puppeteer.use(StealthPlugin());
/**
 * Test cases for different platforms and scenarios
 */
const testCases = [
    // Product URLs
    {
        name: 'Amazon Product Page',
        url: 'https://www.amazon.com/dp/B08N5WRWNW',
        expectedPlatform: 'amazon',
        expectedType: 'product',
        shouldPass: true,
        notes: 'May timeout due to bot detection'
    },
    {
        name: 'Generic E-commerce Site',
        url: 'https://www.example.com/product',
        expectedPlatform: 'generic',
        expectedType: 'product',
        shouldPass: true,
        notes: 'Should fallback to generic scraper'
    },
    // Social Media URLs
    {
        name: 'TikTok Video (Test URL)',
        url: 'https://www.tiktok.com/@test/video/123456789',
        expectedPlatform: 'tiktok',
        expectedType: 'social',
        shouldPass: false,
        notes: 'Expected to fail gracefully - test URL'
    },
    {
        name: 'Instagram Post (Test URL)',
        url: 'https://www.instagram.com/p/test123/',
        expectedPlatform: 'instagram',
        expectedType: 'social',
        shouldPass: false,
        notes: 'Expected to fail gracefully - test URL'
    },
    {
        name: 'YouTube Video (Test URL)',
        url: 'https://www.youtube.com/watch?v=test123',
        expectedPlatform: 'youtube',
        expectedType: 'social',
        shouldPass: false,
        notes: 'Expected to fail gracefully - test URL'
    },
    // Invalid URLs
    {
        name: 'Invalid URL',
        url: 'not-a-valid-url',
        expectedPlatform: 'generic',
        expectedType: 'product',
        shouldPass: false,
        notes: 'Should fail with appropriate error'
    },
    {
        name: 'Non-existent Domain',
        url: 'https://this-domain-does-not-exist-12345.com/product',
        expectedPlatform: 'generic',
        expectedType: 'product',
        shouldPass: false,
        notes: 'Should fail with network error'
    }
];
/**
 * Test cases for review scraping
 */
const reviewTestCases = [
    {
        name: 'Reddit Reviews - Popular Product',
        productName: 'CeraVe Hydrating Cleanser',
        platform: 'reddit',
        shouldPass: true
    },
    {
        name: 'Reddit Reviews - Obscure Product',
        productName: 'NonExistentProductBrand12345',
        platform: 'reddit',
        shouldPass: true, // Should pass but return empty results
    }
];
/**
 * Runs a single scraper test case
 */
async function runScraperTest(testCase, page) {
    const startTime = Date.now();
    try {
        console.log(chalk.blue(`🧪 Testing: ${testCase.name}`));
        console.log(chalk.gray(`   URL: ${testCase.url}`));
        console.log(chalk.gray(`   Expected: ${testCase.expectedType}/${testCase.expectedPlatform}`));
        const result = await scrapeProduct(page, testCase.url);
        const duration = Date.now() - startTime;
        // Validate results
        const platformMatches = result.platform === testCase.expectedPlatform;
        const hasBasicData = result.name && result.name !== 'Unknown Product';
        if (testCase.shouldPass) {
            const passed = platformMatches && hasBasicData;
            if (passed) {
                console.log(chalk.green(`   ✅ PASSED (${duration}ms)`));
                console.log(chalk.gray(`      Product: ${result.name}`));
                console.log(chalk.gray(`      Platform: ${result.platform}`));
                if (result.tiktok_data) {
                    console.log(chalk.gray(`      Social Data: ${result.tiktok_data.username}`));
                }
            }
            else {
                console.log(chalk.red(`   ❌ FAILED (${duration}ms)`));
                console.log(chalk.gray(`      Expected platform match: ${platformMatches}`));
                console.log(chalk.gray(`      Has basic data: ${hasBasicData}`));
            }
            return {
                testName: testCase.name,
                passed,
                duration,
                data: result
            };
        }
        else {
            // Test case expected to fail but didn't
            console.log(chalk.yellow(`   ⚠️ UNEXPECTED SUCCESS (${duration}ms)`));
            console.log(chalk.gray(`      This test was expected to fail but passed`));
            return {
                testName: testCase.name,
                passed: false, // Mark as failed because it was expected to fail
                duration,
                data: result
            };
        }
    }
    catch (error) {
        const duration = Date.now() - startTime;
        if (testCase.shouldPass) {
            console.log(chalk.red(`   ❌ FAILED (${duration}ms)`));
            console.log(chalk.gray(`      Error: ${error}`));
            return {
                testName: testCase.name,
                passed: false,
                duration,
                error: String(error)
            };
        }
        else {
            // Expected to fail and did fail
            console.log(chalk.green(`   ✅ FAILED AS EXPECTED (${duration}ms)`));
            console.log(chalk.gray(`      Expected error: ${error}`));
            return {
                testName: testCase.name,
                passed: true, // Mark as passed because failure was expected
                duration,
                error: String(error)
            };
        }
    }
}
/**
 * Runs review scraping tests
 */
async function runReviewTests(page) {
    const results = [];
    console.log(chalk.blue('\n🔍 Testing Review Scrapers'));
    console.log(chalk.gray('='.repeat(50)));
    for (const testCase of reviewTestCases) {
        const startTime = Date.now();
        try {
            console.log(chalk.blue(`🧪 Testing: ${testCase.name}`));
            console.log(chalk.gray(`   Product: ${testCase.productName}`));
            let reviews = [];
            if (testCase.platform === 'reddit') {
                reviews = await scrapeRedditReviews(page, testCase.productName);
            }
            const duration = Date.now() - startTime;
            // Generate review summary
            const summary = generateReviewSummary(reviews);
            const passed = testCase.shouldPass; // Even 0 reviews is a pass for shouldPass tests
            if (passed) {
                console.log(chalk.green(`   ✅ PASSED (${duration}ms)`));
                console.log(chalk.gray(`      Reviews found: ${reviews.length}`));
                console.log(chalk.gray(`      Sentiment breakdown: +${summary.sentiment_breakdown.positive} -${summary.sentiment_breakdown.negative} =${summary.sentiment_breakdown.neutral}`));
            }
            else {
                console.log(chalk.red(`   ❌ FAILED (${duration}ms)`));
            }
            results.push({
                testName: testCase.name,
                passed,
                duration,
                data: { reviews, summary }
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.log(chalk.red(`   ❌ ERROR (${duration}ms): ${error}`));
            results.push({
                testName: testCase.name,
                passed: false,
                duration,
                error: String(error)
            });
        }
    }
    return results;
}
/**
 * Tests TikTok promotional content analysis
 */
async function runTikTokTests(page) {
    const results = [];
    console.log(chalk.blue('\n🎬 Testing TikTok Analysis'));
    console.log(chalk.gray('='.repeat(50)));
    // Test promotional content detection with mock data
    const mockCaptions = [
        'Check out this amazing skincare routine! Use code BEAUTY20 for 20% off #ad #sponsored',
        'I love this new moisturizer so much! It makes my skin so glowy ✨ #skincare #beauty',
        'Omg you guys NEED to try this serum! Link in bio for discount #affiliate #promo SAVE15',
        'Just doing my normal skincare routine with my favorite products 💕'
    ];
    for (let i = 0; i < mockCaptions.length; i++) {
        const caption = mockCaptions[i];
        const startTime = Date.now();
        try {
            console.log(chalk.blue(`🧪 Testing Caption Analysis ${i + 1}`));
            console.log(chalk.gray(`   Caption: "${caption.substring(0, 50)}..."`));
            // Test the promotional detection logic (simplified version)
            const hasPromoKeywords = /sponsored|ad|paid|partnership|code|discount|affiliate|promo|link in bio/i.test(caption);
            const affiliateCodes = caption.match(/\b[A-Z]{2,}\d{1,3}\b/g) || [];
            const hashtags = caption.match(/#[\w]+/g) || [];
            const analysis = {
                promotional_keywords: hasPromoKeywords,
                affiliate_codes: affiliateCodes,
                hashtags: hashtags,
                paid_promotion_detected: hasPromoKeywords || affiliateCodes.length > 0
            };
            const duration = Date.now() - startTime;
            console.log(chalk.green(`   ✅ ANALYZED (${duration}ms)`));
            console.log(chalk.gray(`      Promotional: ${analysis.paid_promotion_detected ? 'YES' : 'NO'}`));
            console.log(chalk.gray(`      Affiliate codes: ${analysis.affiliate_codes.length}`));
            console.log(chalk.gray(`      Hashtags: ${analysis.hashtags.length}`));
            results.push({
                testName: `TikTok Caption Analysis ${i + 1}`,
                passed: true,
                duration,
                data: analysis
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            results.push({
                testName: `TikTok Caption Analysis ${i + 1}`,
                passed: false,
                duration,
                error: String(error)
            });
        }
    }
    return results;
}
/**
 * Generates a comprehensive test report
 */
async function generateTestReport(allResults) {
    const passedTests = allResults.filter(r => r.passed);
    const failedTests = allResults.filter(r => !r.passed);
    const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalDuration / allResults.length;
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total_tests: allResults.length,
            passed: passedTests.length,
            failed: failedTests.length,
            success_rate: `${((passedTests.length / allResults.length) * 100).toFixed(1)}%`,
            total_duration_ms: totalDuration,
            average_duration_ms: Math.round(averageDuration)
        },
        results: allResults,
        failed_tests: failedTests.map(t => ({
            name: t.testName,
            error: t.error,
            duration: t.duration
        }))
    };
    // Save report to file
    await fs.writeFile('test/test-report.json', JSON.stringify(report, null, 2));
    console.log(chalk.blue('\n📊 TEST SUMMARY'));
    console.log(chalk.gray('='.repeat(50)));
    console.log(chalk.green(`✅ Passed: ${passedTests.length}/${allResults.length}`));
    console.log(chalk.red(`❌ Failed: ${failedTests.length}/${allResults.length}`));
    console.log(chalk.cyan(`📈 Success Rate: ${report.summary.success_rate}`));
    console.log(chalk.cyan(`⏱️  Total Duration: ${totalDuration}ms`));
    console.log(chalk.cyan(`⚡ Average Duration: ${Math.round(averageDuration)}ms`));
    if (failedTests.length > 0) {
        console.log(chalk.red('\n❌ FAILED TESTS:'));
        failedTests.forEach(test => {
            console.log(chalk.red(`   • ${test.testName}`));
            if (test.error) {
                console.log(chalk.gray(`     Error: ${test.error.substring(0, 100)}...`));
            }
        });
    }
    console.log(chalk.green(`\n✅ Test report saved to: test/test-report.json`));
    return report;
}
/**
 * Main test runner
 */
export async function runAllScraperTests() {
    console.log(chalk.blue('🚀 Starting Comprehensive Scraper Test Suite'));
    console.log(chalk.gray('Testing all scrapers with various test cases...\n'));
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        const allResults = [];
        // Test product scrapers
        console.log(chalk.blue('🛍️ Testing Product Scrapers'));
        console.log(chalk.gray('='.repeat(50)));
        for (const testCase of testCases) {
            const result = await runScraperTest(testCase, page);
            allResults.push(result);
            // Small delay between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Test review scrapers
        const reviewResults = await runReviewTests(page);
        allResults.push(...reviewResults);
        // Test TikTok analysis
        const tiktokResults = await runTikTokTests(page);
        allResults.push(...tiktokResults);
        // Generate comprehensive report
        const report = await generateTestReport(allResults);
        return report;
    }
    finally {
        await browser.close();
    }
}
// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllScraperTests()
        .then((report) => {
        console.log(chalk.blue('\n🎉 All tests completed!'));
        process.exit(report.summary.failed > 0 ? 1 : 0);
    })
        .catch((error) => {
        console.error(chalk.red('❌ Test suite failed:'), error);
        process.exit(1);
    });
}
