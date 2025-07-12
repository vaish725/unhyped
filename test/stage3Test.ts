/**
 * Stage 3: Reality Check Analysis - Comprehensive Test Suite
 * Tests the complete integration of all Unhyped components
 */

import chalk from 'chalk';
import { RealityCheckEngine, RealityCheckResult } from '../src/realityCheck.js';
import { ProductData } from '../src/scrapeProduct.js';
import { TikTokVideoData } from '../src/scrapers/scrapeTikTok.js';
import { ReviewSummary } from '../src/scrapers/scrapeReviews.js';

/**
 * Mock data for testing Stage 3 functionality
 */
class Stage3TestData {
  
  /**
   * Returns mock product data for testing
   */
  static getMockProductData(): ProductData {
    return {
      name: 'CeraVe Daily Moisturizing Lotion',
      price: '$14.99',
      rating: '4.5',
      reviews: [],
      ingredients: {
        raw: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Behentrimonium Methosulfate, Cetearyl Alcohol, Cetyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Phenoxyethanol, Mineral Oil, Behentrimonium Methosulfate, Ethylhexylglycerin, Sodium Lauroyl Lactylate, Cholesterol, Hyaluronic Acid, Xanthan Gum, Tocopherol',
        parsed: [
          'Aqua', 'Glycerin', 'Caprylic/Capric Triglyceride', 'Behentrimonium Methosulfate',
          'Cetearyl Alcohol', 'Cetyl Alcohol', 'Ceramide NP', 'Ceramide AP', 'Ceramide EOP',
          'Carbomer', 'Dimethicone', 'Phenoxyethanol', 'Mineral Oil', 'Ethylhexylglycerin',
          'Sodium Lauroyl Lactylate', 'Cholesterol', 'Hyaluronic Acid', 'Xanthan Gum', 'Tocopherol'
        ]
      },
      platform: 'amazon'
    };
  }
  
  /**
   * Returns mock TikTok data representing authentic content
   */
  static getMockTikTokDataAuthentic(): TikTokVideoData {
    return {
      username: 'skincare_enthusiast',
      video_url: 'https://tiktok.com/@skincare_enthusiast/video/12345',
      caption: 'Been using this CeraVe lotion for 3 months and my skin feels so much better! No more dry patches 🙌 #skincare #dryskin #cerave #routine',
      hashtags: ['skincare', 'dryskin', 'cerave', 'routine', 'skincaretips'],
      mentions: [],
      likes: 2543,
      comments: 89,
      shares: 23,
      views: 45231,
      posting_date: '2024-01-15',
      promotional_keywords: [],
      affiliate_codes: [],
      paid_promotion_detected: false
    };
  }
  
  /**
   * Returns mock TikTok data representing sponsored content
   */
  static getMockTikTokDataSponsored(): TikTokVideoData {
    return {
      username: 'beauty_influencer',
      video_url: 'https://tiktok.com/@beauty_influencer/video/67890',
      caption: 'OMG you guys HAVE to try this new moisturizer! Use my code BEAUTY20 for 20% off - link in bio! #ad #sponsored #skincare #affiliate #gifted',
      hashtags: ['ad', 'sponsored', 'skincare', 'affiliate', 'gifted', 'promo', 'discount'],
      mentions: [],
      likes: 15643,
      comments: 324,
      shares: 156,
      views: 234567,
      posting_date: '2024-01-10',
      promotional_keywords: ['HAVE to try', 'link in bio', 'discount', 'promo code'],
      affiliate_codes: ['BEAUTY20'],
      paid_promotion_detected: true
    };
  }
  
  /**
   * Returns mock review summary with balanced sentiment
   */
  static getMockReviewSummaryBalanced(): ReviewSummary {
    return {
      total_reviews: 156,
      sentiment_breakdown: {
        positive: 89,
        negative: 23,
        neutral: 44
      },
      common_positives: ['moisturizing', 'gentle', 'non-greasy', 'effective', 'good value'],
      common_negatives: ['sticky feeling', 'strong fragrance', 'broke out'],
      average_rating: 4.2,
      recent_reviews: [],
      top_helpful_reviews: []
    };
  }
  
  /**
   * Returns mock review summary with suspicious patterns (too positive)
   */
  static getMockReviewSummarySuspicious(): ReviewSummary {
    return {
      total_reviews: 87,
      sentiment_breakdown: {
        positive: 84,
        negative: 2,
        neutral: 1
      },
      common_positives: ['amazing', 'life-changing', 'best product ever', 'miracle', 'perfect'],
      common_negatives: ['none'],
      average_rating: 4.9,
      recent_reviews: [],
      top_helpful_reviews: []
    };
  }
}

/**
 * Main Stage 3 Test Suite
 */
class Stage3TestSuite {
  private realityEngine: RealityCheckEngine;
  private testResults: { name: string; passed: boolean; details: string }[] = [];
  
  constructor() {
    this.realityEngine = new RealityCheckEngine();
  }
  
  /**
   * Runs all Stage 3 tests
   */
  async runAllTests(): Promise<void> {
    console.log(chalk.blue.bold('\n🧪 STAGE 3: REALITY CHECK ANALYSIS - TEST SUITE'));
    console.log(chalk.gray('=========================================================\n'));
    
    // Test 1: Basic Reality Check Engine Functionality
    await this.testBasicRealityCheck();
    
    // Test 2: Authentic Product Analysis
    await this.testAuthenticProductAnalysis();
    
    // Test 3: Sponsored Content Detection
    await this.testSponsoredContentDetection();
    
    // Test 4: Ingredient Quality Analysis
    await this.testIngredientQualityAnalysis();
    
    // Test 5: Review Authenticity Detection
    await this.testReviewAuthenticity();
    
    // Test 6: Price Value Assessment
    await this.testPriceValueAssessment();
    
    // Test 7: Overall Scoring Logic
    await this.testOverallScoringLogic();
    
    // Test 8: Complete Integration Test
    await this.testCompleteIntegration();
    
    // Display results summary
    this.displayTestSummary();
  }
  
  /**
   * Test 1: Basic Reality Check Engine functionality
   */
  private async testBasicRealityCheck(): Promise<void> {
    console.log(chalk.cyan('🔍 Test 1: Basic Reality Check Engine...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const result = await this.realityEngine.analyzeProduct(mockProduct);
      
      const passed = result && 
                    typeof result.reality_score === 'number' &&
                    result.reality_score >= 0 && result.reality_score <= 100 &&
                    ['authentic', 'suspicious', 'likely_sponsored'].includes(result.overall_verdict) &&
                    ['high', 'medium', 'low'].includes(result.confidence_level);
      
      this.testResults.push({
        name: 'Basic Reality Check Engine',
        passed,
        details: passed ? 
          `Reality score: ${result.reality_score}, Verdict: ${result.overall_verdict}` :
          'Failed to generate valid reality check result'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Basic Reality Check Engine',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 2: Authentic product analysis
   */
  private async testAuthenticProductAnalysis(): Promise<void> {
    console.log(chalk.cyan('🏆 Test 2: Authentic Product Analysis...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const authenticTikTok = Stage3TestData.getMockTikTokDataAuthentic();
      const balancedReviews = Stage3TestData.getMockReviewSummaryBalanced();
      
      const result = await this.realityEngine.analyzeProduct(mockProduct, authenticTikTok, balancedReviews);
      
      const passed = result.reality_score >= 60 &&  // Should score reasonably well
                    !result.social_analysis.promotional_detected &&
                    result.social_analysis.affiliate_codes_found === 0 &&
                    result.red_flags.length <= result.green_flags.length;  // More positives than negatives
      
      this.testResults.push({
        name: 'Authentic Product Analysis',
        passed,
        details: passed ? 
          `Score: ${result.reality_score}, Red flags: ${result.red_flags.length}, Green flags: ${result.green_flags.length}` :
          `Score: ${result.reality_score}, Failed authenticity checks`
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Authentic Product Analysis',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 3: Sponsored content detection
   */
  private async testSponsoredContentDetection(): Promise<void> {
    console.log(chalk.cyan('🎬 Test 3: Sponsored Content Detection...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const sponsoredTikTok = Stage3TestData.getMockTikTokDataSponsored();
      
      const result = await this.realityEngine.analyzeProduct(mockProduct, sponsoredTikTok);
      
      const passed = result.social_analysis.promotional_detected &&
                    result.social_analysis.affiliate_codes_found > 0 &&
                    result.social_analysis.sponsored_content_probability > 50 &&
                    (result.overall_verdict === 'likely_sponsored' || result.overall_verdict === 'suspicious') &&
                    result.red_flags.some(flag => flag.includes('sponsored') || flag.includes('affiliate'));
      
      this.testResults.push({
        name: 'Sponsored Content Detection',
        passed,
        details: passed ? 
          `Promotional detected: ${result.social_analysis.promotional_detected}, Affiliate codes: ${result.social_analysis.affiliate_codes_found}, Sponsored probability: ${result.social_analysis.sponsored_content_probability}%` :
          'Failed to detect sponsored content properly'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Sponsored Content Detection',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 4: Ingredient quality analysis
   */
  private async testIngredientQualityAnalysis(): Promise<void> {
    console.log(chalk.cyan('🧪 Test 4: Ingredient Quality Analysis...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const result = await this.realityEngine.analyzeProduct(mockProduct);
      
      const passed = result.ingredient_analysis.total_ingredients > 0 &&
                    result.ingredient_analysis.ingredient_quality_score >= 0 &&
                    result.ingredient_analysis.ingredient_quality_score <= 100 &&
                    result.ingredient_analysis.ingredient_authenticity >= 50 &&  // Should look authentic
                    Array.isArray(result.ingredient_analysis.beneficial_ingredients) &&
                    Array.isArray(result.ingredient_analysis.potentially_harmful);
      
      this.testResults.push({
        name: 'Ingredient Quality Analysis',
        passed,
        details: passed ? 
          `Total ingredients: ${result.ingredient_analysis.total_ingredients}, Quality score: ${result.ingredient_analysis.ingredient_quality_score}, Beneficial: ${result.ingredient_analysis.beneficial_ingredients.length}, Harmful: ${result.ingredient_analysis.potentially_harmful.length}` :
          'Failed ingredient analysis validation'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Ingredient Quality Analysis',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 5: Review authenticity detection
   */
  private async testReviewAuthenticity(): Promise<void> {
    console.log(chalk.cyan('💬 Test 5: Review Authenticity Detection...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      
      // Test with balanced reviews (should be more authentic)
      const balancedReviews = Stage3TestData.getMockReviewSummaryBalanced();
      const balancedResult = await this.realityEngine.analyzeProduct(mockProduct, undefined, balancedReviews);
      
      // Test with suspicious reviews (too positive)
      const suspiciousReviews = Stage3TestData.getMockReviewSummarySuspicious();
      const suspiciousResult = await this.realityEngine.analyzeProduct(mockProduct, undefined, suspiciousReviews);
      
      const passed = balancedResult.review_analysis.review_authenticity_score > suspiciousResult.review_analysis.review_authenticity_score &&
                    balancedResult.review_analysis.review_credibility !== 'low' &&
                    suspiciousResult.review_analysis.review_authenticity_score < 70;  // Suspicious reviews should score lower
      
      this.testResults.push({
        name: 'Review Authenticity Detection',
        passed,
        details: passed ? 
          `Balanced reviews score: ${balancedResult.review_analysis.review_authenticity_score}, Suspicious reviews score: ${suspiciousResult.review_analysis.review_authenticity_score}` :
          'Failed to differentiate between authentic and suspicious reviews'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Review Authenticity Detection',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 6: Price value assessment
   */
  private async testPriceValueAssessment(): Promise<void> {
    console.log(chalk.cyan('💰 Test 6: Price Value Assessment...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const result = await this.realityEngine.analyzeProduct(mockProduct);
      
      const passed = ['excellent', 'good', 'fair', 'poor', 'unknown'].includes(result.price_analysis.value_assessment) &&
                    ['below_market', 'market_rate', 'above_market', 'premium'].includes(result.price_analysis.market_comparison) &&
                    result.price_analysis.price_vs_ingredients >= 0 &&
                    result.price_analysis.price_vs_ingredients <= 100 &&
                    result.price_analysis.price_range.length > 0;
      
      this.testResults.push({
        name: 'Price Value Assessment',
        passed,
        details: passed ? 
          `Value: ${result.price_analysis.value_assessment}, Market comparison: ${result.price_analysis.market_comparison}, Price range: ${result.price_analysis.price_range}` :
          'Failed price analysis validation'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Price Value Assessment',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 7: Overall scoring logic
   */
  private async testOverallScoringLogic(): Promise<void> {
    console.log(chalk.cyan('🎯 Test 7: Overall Scoring Logic...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      
      // Test authentic scenario (should score higher)
      const authenticResult = await this.realityEngine.analyzeProduct(
        mockProduct, 
        Stage3TestData.getMockTikTokDataAuthentic(), 
        Stage3TestData.getMockReviewSummaryBalanced()
      );
      
      // Test sponsored scenario (should score lower)
      const sponsoredResult = await this.realityEngine.analyzeProduct(
        mockProduct, 
        Stage3TestData.getMockTikTokDataSponsored(),
        Stage3TestData.getMockReviewSummarySuspicious()
      );
      
      const passed = authenticResult.reality_score > sponsoredResult.reality_score &&
                    authenticResult.overall_verdict !== 'likely_sponsored' &&
                    (sponsoredResult.overall_verdict === 'likely_sponsored' || sponsoredResult.overall_verdict === 'suspicious');
      
      this.testResults.push({
        name: 'Overall Scoring Logic',
        passed,
        details: passed ? 
          `Authentic scenario: ${authenticResult.reality_score} (${authenticResult.overall_verdict}), Sponsored scenario: ${sponsoredResult.reality_score} (${sponsoredResult.overall_verdict})` :
          'Scoring logic failed to differentiate scenarios properly'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Overall Scoring Logic',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Test 8: Complete integration test
   */
  private async testCompleteIntegration(): Promise<void> {
    console.log(chalk.cyan('🔄 Test 8: Complete Integration Test...'));
    
    try {
      const mockProduct = Stage3TestData.getMockProductData();
      const mockTikTok = Stage3TestData.getMockTikTokDataAuthentic();
      const mockReviews = Stage3TestData.getMockReviewSummaryBalanced();
      
      const result = await this.realityEngine.analyzeProduct(mockProduct, mockTikTok, mockReviews);
      
      // Validate all major components are present and valid
      const passed = result &&
                    // Overall analysis
                    typeof result.reality_score === 'number' &&
                    result.overall_verdict &&
                    result.confidence_level &&
                    // Component analyses
                    result.product_analysis &&
                    result.social_analysis &&
                    result.ingredient_analysis &&
                    result.review_analysis &&
                    result.price_analysis &&
                    // Insights
                    Array.isArray(result.red_flags) &&
                    Array.isArray(result.green_flags) &&
                    Array.isArray(result.recommendations) &&
                    // Metadata
                    result.analysis_timestamp &&
                    Array.isArray(result.data_sources) &&
                    result.data_sources.length > 0;
      
      this.testResults.push({
        name: 'Complete Integration Test',
        passed,
        details: passed ? 
          `All components validated successfully. Data sources: ${result.data_sources.join(', ')}, Generated insights: ${result.red_flags.length + result.green_flags.length + result.recommendations.length}` :
          'Integration validation failed - missing or invalid components'
      });
      
      console.log(passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED'));
      
    } catch (error) {
      this.testResults.push({
        name: 'Complete Integration Test',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
      console.log(chalk.red('❌ FAILED'));
    }
  }
  
  /**
   * Displays comprehensive test summary
   */
  private displayTestSummary(): void {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log(chalk.blue.bold('\n📊 STAGE 3 TEST SUMMARY'));
    console.log(chalk.gray('========================\n'));
    
    console.log(chalk.cyan(`Total Tests: ${totalTests}`));
    console.log(chalk.green(`Passed: ${passedTests}`));
    console.log(chalk.red(`Failed: ${failedTests}`));
    console.log(chalk.yellow(`Success Rate: ${successRate}%\n`));
    
    // Detailed results
    console.log(chalk.cyan('Detailed Results:'));
    this.testResults.forEach((test, index) => {
      const status = test.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`   ${index + 1}. ${test.name}: ${status}`);
      if (!test.passed || process.env.VERBOSE) {
        console.log(chalk.gray(`      ${test.details}`));
      }
    });
    
    // Overall verdict
    if (passedTests === totalTests) {
      console.log(chalk.green.bold('\n🎉 STAGE 3: REALITY CHECK ANALYSIS - FULLY OPERATIONAL!'));
      console.log(chalk.green('All tests passed. Stage 3 is ready for production use.'));
    } else if (successRate >= '80.0') {
      console.log(chalk.yellow.bold('\n⚠️ STAGE 3: MOSTLY OPERATIONAL'));
      console.log(chalk.yellow('Most tests passed, but some issues need attention.'));
    } else {
      console.log(chalk.red.bold('\n❌ STAGE 3: NEEDS ATTENTION'));
      console.log(chalk.red('Multiple critical issues detected. Please review failures.'));
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new Stage3TestSuite();
  testSuite.runAllTests().catch(console.error);
}

export { Stage3TestSuite }; 