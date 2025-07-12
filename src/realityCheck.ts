import { scrapeProduct } from './scrapeProduct.js';
import ingredientDB from '../data/ingredients.json' with { type: 'json' };
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { validateReport } from '../utils/validateSchema.js';
import { ProductData } from './scrapeProduct.js';
import { TikTokVideoData } from './scrapers/scrapeTikTok.js';
import { ReviewSummary } from './scrapers/scrapeReviews.js';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Interface for user profile data
 */
interface UserProfile {
  skin_type: 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';
  concerns: string[];
  age_range?: string;
  allergies?: string[];
}

/**
 * Interface for ingredient analysis
 */
interface IngredientAnalysis {
  name: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}

/**
 * Ingredient analysis sub-component - Overall analysis result
 */
interface OverallIngredientAnalysis {
  total_ingredients: number;
  beneficial_ingredients: string[];
  potentially_harmful: string[];
  ingredient_quality_score: number; // 0-100 scale
  ingredient_authenticity: number; // How likely the ingredient list is real
}

/**
 * Interface for reality check analysis result
 */
export interface RealityCheckResult {
  // Overall assessment
  reality_score: number; // 0-100 scale
  confidence_level: 'high' | 'medium' | 'low';
  overall_verdict: 'authentic' | 'suspicious' | 'likely_sponsored';
  
  // Detailed analysis
  product_analysis: ProductAnalysis;
  social_analysis: SocialAnalysis;
  ingredient_analysis: OverallIngredientAnalysis;
  review_analysis: ReviewAnalysis;
  price_analysis: PriceAnalysis;
  
  // Summary and recommendations
  red_flags: string[];
  green_flags: string[];
  recommendations: string[];
  
  // Metadata
  analysis_timestamp: string;
  data_sources: string[];
}

/**
 * Product analysis sub-component
 */
interface ProductAnalysis {
  product_name: string;
  platform: string;
  availability_score: number; // How widely available the product is
  brand_recognition: 'well_known' | 'emerging' | 'unknown';
  price_reasonableness: number; // 0-100 scale
}

/**
 * Social media analysis sub-component
 */
interface SocialAnalysis {
  has_social_data: boolean;
  promotional_detected: boolean;
  affiliate_codes_found: number;
  hashtag_authenticity: number; // 0-100 scale
  influencer_credibility: 'high' | 'medium' | 'low' | 'unknown';
  sponsored_content_probability: number; // 0-100 scale
}

/**
 * Review analysis sub-component
 */
interface ReviewAnalysis {
  review_count: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  review_authenticity_score: number; // 0-100 scale
  common_concerns: string[];
  review_credibility: 'high' | 'medium' | 'low';
}

/**
 * Price analysis sub-component
 */
interface PriceAnalysis {
  price_range: string;
  value_assessment: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  price_vs_ingredients: number; // 0-100 scale
  market_comparison: 'below_market' | 'market_rate' | 'above_market' | 'premium';
}

/**
 * Analyzes ingredients against user profile and ingredient database
 * @param ingredients - List of parsed ingredients
 * @param userProfile - User's skin profile and concerns
 * @returns Object containing safe and flagged ingredients
 */
function analyzeIngredients(ingredients: string[], userProfile: UserProfile): {
  safeIngredients: string[];
  flaggedIngredients: IngredientAnalysis[];
} {
  const safeIngredients: string[] = [];
  const flaggedIngredients: IngredientAnalysis[] = [];

  console.log(chalk.cyan('🔬 Analyzing ingredients against user profile...'));
  console.log(chalk.gray(`User profile: ${userProfile.skin_type} skin, concerns: ${userProfile.concerns.join(', ')}`));

  for (const ingredient of ingredients) {
    // Skip very short or invalid ingredient names
    if (ingredient.length < 3) continue;

    // Check against ingredient database
    const knownIssue = ingredientDB[ingredient.toLowerCase() as keyof typeof ingredientDB];
    
    if (knownIssue) {
      // Check if this ingredient conflicts with user's skin type or concerns
      let shouldFlag = true;
      let customRecommendation = '';

      // Skin type specific recommendations
      if (userProfile.skin_type === 'sensitive' && knownIssue.severity === 'high') {
        customRecommendation = 'Especially avoid due to sensitive skin';
      } else if (userProfile.skin_type === 'oily' && ingredient.includes('oil') && knownIssue.issue === 'Comedogenic') {
        customRecommendation = 'May worsen oily skin concerns';
      } else if (userProfile.skin_type === 'dry' && knownIssue.issue === 'Drying') {
        customRecommendation = 'May worsen dry skin concerns';
      }

      // Concern-specific analysis
      if (userProfile.concerns.includes('acne') && knownIssue.issue === 'Comedogenic') {
        customRecommendation = 'May trigger acne breakouts';
      } else if (userProfile.concerns.includes('sensitivity') && knownIssue.severity === 'high') {
        customRecommendation = 'High risk for sensitive skin reactions';
      }

      flaggedIngredients.push({
        name: ingredient,
        issue: knownIssue.issue,
        severity: knownIssue.severity as 'low' | 'medium' | 'high',
        recommendation: customRecommendation || `Consider avoiding due to ${knownIssue.issue.toLowerCase()}`
      });
    } else {
      // Consider it safe if not in our database of problematic ingredients
      safeIngredients.push(ingredient);
    }
  }

  return { safeIngredients, flaggedIngredients };
}

/**
 * Calculates a match score based on ingredient analysis and user profile
 * @param flaggedIngredients - List of problematic ingredients found
 * @param totalIngredients - Total number of ingredients
 * @param userProfile - User's skin profile
 * @returns Match score from 0-100
 */
function calculateMatchScore(flaggedIngredients: IngredientAnalysis[], totalIngredients: number, userProfile: UserProfile): number {
  if (totalIngredients === 0) return 0;

  // Base score starts at 100
  let score = 100;

  // Penalize based on flagged ingredients
  for (const flagged of flaggedIngredients) {
    let penalty = 0;
    
    switch (flagged.severity) {
      case 'high':
        penalty = 25;
        break;
      case 'medium':
        penalty = 15;
        break;
      case 'low':
        penalty = 5;
        break;
    }

    // Double penalty for sensitive skin users
    if (userProfile.skin_type === 'sensitive') {
      penalty *= 1.5;
    }

    score -= penalty;
  }

  // Ensure score doesn't go below 0
  return Math.max(0, Math.round(score));
}

/**
 * Calculates trust score based on various factors
 * @param handle - Influencer handle (if any)
 * @param productPrice - Product price
 * @param rating - Product rating
 * @returns Trust score from 0-100
 */
function calculateTrustScore(handle: string, productPrice: number, rating: number | null): number {
  let trustScore = 100;

  // Reduce trust if promoted by influencer
  if (handle) {
    // Check for obvious promotional language
    const promoKeywords = ['ad', 'sponsored', 'discount', 'code', 'link', 'affiliate'];
    const hasPromoLanguage = promoKeywords.some(keyword => 
      handle.toLowerCase().includes(keyword)
    );
    
    if (hasPromoLanguage) {
      trustScore -= 30; // Heavy penalty for obvious promotions
    } else {
      trustScore -= 15; // Standard penalty for influencer promotion
    }
  }

  // Adjust based on price (very cheap products might be low quality)
  if (productPrice > 0) {
    if (productPrice < 5) {
      trustScore -= 10; // Very cheap products are suspicious
    } else if (productPrice > 100) {
      trustScore += 5; // Premium products might be more trustworthy
    }
  }

  // Adjust based on rating
  if (rating !== null) {
    if (rating < 3) {
      trustScore -= 25; // Poor ratings significantly reduce trust
    } else if (rating > 4.5) {
      trustScore += 10; // Excellent ratings increase trust
    }
  }

  return Math.max(0, Math.min(100, Math.round(trustScore)));
}

/**
 * Main function to run reality check analysis
 * @param url - Product URL to analyze
 * @param handle - Influencer handle (optional)
 * @param profilePath - Path to user profile JSON file
 */
export async function runRealityCheck(url: string, handle: string, profilePath: string) {
  console.log(chalk.blue('🧴 TikTok vs Truth Reality Checker'));
  console.log(chalk.green(`🔗 Product: ${url}`));
  if (handle) console.log(chalk.yellow(`💬 Influencer: ${handle}`));

  try {
    // Load user profile
    const userProfileRaw = await fs.readFile(profilePath, 'utf-8');
    const userProfile: UserProfile = JSON.parse(userProfileRaw);
    console.log(chalk.cyan(`📄 Skin Profile Loaded:`));
    console.log(chalk.gray(`  Skin Type: ${userProfile.skin_type}`));
    console.log(chalk.gray(`  Concerns: ${userProfile.concerns.join(', ')}`));

    // Launch browser and scrape product
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    console.log(chalk.blue('🔍 Scraping product information...'));
    const productData = await scrapeProduct(page, url);
    
    // Close browser after scraping
    await browser.close();

    // Check if ingredients were found
    if (!productData.ingredients || productData.ingredients.parsed.length === 0) {
      console.log(chalk.red('\n⚠️ No ingredients found. Skipping detailed analysis.'));
      console.log(chalk.yellow('💡 Tip: Some products may not list ingredients online. Check the physical packaging.'));
      return;
    }

    console.log(chalk.green(`✅ Found ${productData.ingredients.parsed.length} ingredients`));

    // Analyze ingredients against user profile
    const analysis = analyzeIngredients(productData.ingredients.parsed, userProfile);
    
    // Calculate scores
    const matchScore = calculateMatchScore(
      analysis.flaggedIngredients, 
      productData.ingredients.parsed.length, 
      userProfile
    );
    
    const trustScore = calculateTrustScore(
      handle, 
      parseFloat(productData.price.replace(/[^0-9.]/g, '')) || 0,
      productData.rating ? parseFloat(productData.rating) : null
    );

    // Detect paid promotions
    const paidPromotionsDetected = handle ? 
      /ad|sponsored|discount|code|link|affiliate|promo/i.test(handle) : false;

    // Extract brand from product name or URL (basic implementation)
    const brand = extractBrand(productData.name, url);

    // Create comprehensive report
    const report = {
      product_name: productData.name,
      brand: brand,
      price: parseFloat(productData.price.replace(/[^0-9.]/g, '')) || 0,
      rating: productData.rating ? parseFloat(productData.rating) : null,
      reviews_summary: productData.reviews.length > 0 ? 
        productData.reviews.join(' ').substring(0, 200) + '...' : 
        'No reviews found',
      safe_ingredients: analysis.safeIngredients,
      flagged_ingredients: analysis.flaggedIngredients,
      match_score: matchScore,
      trust_score: trustScore,
      paid_promotions_detected: paidPromotionsDetected,
      analysis_summary: {
        total_ingredients: productData.ingredients.parsed.length,
        flagged_count: analysis.flaggedIngredients.length,
        user_skin_type: userProfile.skin_type,
        user_concerns: userProfile.concerns
      }
    };

    // Validate report against schema
    console.log(chalk.blue('🔍 Validating report against schema...'));
    const isValid = validateReport(report);
    
    if (!isValid) {
      console.log(chalk.yellow('⚠️ Report does not match expected schema, but proceeding...'));
      console.log(chalk.gray('This might indicate missing required fields or incorrect data types.'));
    } else {
      console.log(chalk.green('✅ Report structure validated'));
    }

    // Save report to output directory
    await fs.writeFile('output/report.json', JSON.stringify(report, null, 2));
    
    // Display results
    console.log(chalk.green('\n📊 ANALYSIS RESULTS'));
    console.log(chalk.green('=' .repeat(50)));
    
    if (analysis.flaggedIngredients.length > 0) {
      console.log(chalk.red(`⚠️  Found ${analysis.flaggedIngredients.length} potentially problematic ingredients:`));
      analysis.flaggedIngredients.forEach(ingredient => {
        const severityColor = ingredient.severity === 'high' ? chalk.red : 
                             ingredient.severity === 'medium' ? chalk.yellow : chalk.gray;
        console.log(severityColor(`   • ${ingredient.name}: ${ingredient.issue} (${ingredient.severity})`));
        if (ingredient.recommendation) {
          console.log(chalk.gray(`     → ${ingredient.recommendation}`));
        }
      });
    } else {
      console.log(chalk.green('✅ No problematic ingredients found in our database!'));
    }

    console.log(chalk.cyan(`\n📈 Match Score: ${matchScore}/100`));
    console.log(chalk.cyan(`🔒 Trust Score: ${trustScore}/100`));
    
    if (paidPromotionsDetected) {
      console.log(chalk.red('💰 Paid promotion detected - extra scrutiny recommended'));
    }

    console.log(chalk.green('\n✅ Detailed report saved to output/report.json'));

  } catch (err) {
    console.error(chalk.red('❌ Error during analysis:'), err);
    process.exit(1);
  }
}

/**
 * Attempts to extract brand name from product name or URL
 * @param productName - Product name from scraping
 * @param url - Product URL
 * @returns Extracted brand name or 'Unknown'
 */
function extractBrand(productName: string, url: string): string {
  // Common beauty brands to look for in product names
  const knownBrands = [
    'CeraVe', 'The Ordinary', 'Neutrogena', 'Olay', 'L\'Oreal', 'Maybelline',
    'Clinique', 'Estee Lauder', 'Lancome', 'SK-II', 'Shiseido', 'COSRX',
    'Some By Mi', 'Innisfree', 'The Face Shop', 'Etude House', 'Laneige',
    'Sulwhasoo', 'Drunk Elephant', 'Paula\'s Choice', 'Cetaphil', 'Aveeno'
  ];

  // Check product name for known brands
  for (const brand of knownBrands) {
    if (productName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  // Try to extract from URL domain
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (domain.includes('oliveyoung')) return 'Olive Young';
    if (domain.includes('amazon')) return 'Amazon Brand';
    if (domain.includes('yesstyle')) return 'YesStyle Brand';
  } catch {
    // Invalid URL, continue
  }

  // Try to extract first word from product name as potential brand
  const words = productName.split(' ');
  if (words.length > 0 && words[0].length > 2) {
    return words[0];
  }

  return 'Unknown';
}

/**
 * Main Reality Check Engine
 */
export class RealityCheckEngine {
  private ingredientsDatabase: any = null;
  
  constructor() {
    // Load ingredients database if available
    this.loadIngredientsDatabase();
  }
  
  /**
   * Loads the ingredients database for analysis
   */
  private async loadIngredientsDatabase(): Promise<void> {
    try {
      const ingredientsPath = path.join(process.cwd(), 'data', 'ingredients.json');
      const data = await fs.readFile(ingredientsPath, 'utf8');
      this.ingredientsDatabase = JSON.parse(data);
      console.log(chalk.green('✅ Ingredients database loaded successfully'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not load ingredients database, using built-in data'));
      // Fallback to built-in ingredient knowledge
      this.ingredientsDatabase = this.getBuiltInIngredientData();
    }
  }
  
  /**
   * Built-in ingredient knowledge for when database is not available
   */
  private getBuiltInIngredientData(): any {
    return {
      beneficial: [
        'niacinamide', 'hyaluronic acid', 'vitamin c', 'retinol', 'ceramide',
        'glycerin', 'salicylic acid', 'lactic acid', 'peptides', 'squalane',
        'vitamin e', 'allantoin', 'panthenol', 'zinc oxide', 'titanium dioxide'
      ],
      potentially_harmful: [
        'alcohol denat', 'sodium lauryl sulfate', 'formaldehyde', 'parabens',
        'phthalates', 'mineral oil', 'petrolatum', 'artificial fragrance'
      ],
      common_irritants: [
        'fragrance', 'essential oils', 'menthol', 'eucalyptus', 'lemon extract'
      ]
    };
  }
  
  /**
   * Main analysis function - generates comprehensive reality check
   * @param productData - Scraped product data
   * @param socialData - Optional social media data
   * @param reviewSummary - Optional review summary
   * @returns Complete reality check analysis
   */
  public async analyzeProduct(
    productData: ProductData,
    socialData?: TikTokVideoData,
    reviewSummary?: ReviewSummary
  ): Promise<RealityCheckResult> {
    
    console.log(chalk.blue('\n🔍 Starting Reality Check Analysis...'));
    console.log(chalk.gray(`Product: ${productData.name}`));
    console.log(chalk.gray(`Platform: ${productData.platform}`));
    
    // Perform individual analyses
    const productAnalysis = this.analyzeProduct_Internal(productData);
    const socialAnalysis = this.analyzeSocialMedia(socialData);
    const ingredientAnalysis = this.analyzeIngredients(productData.ingredients);
    const reviewAnalysis = this.analyzeReviews(reviewSummary);
    const priceAnalysis = this.analyzePrice(productData.price, ingredientAnalysis.ingredient_quality_score);
    
    // Calculate overall reality score
    const realityScore = this.calculateOverallScore(
      productAnalysis,
      socialAnalysis,
      ingredientAnalysis,
      reviewAnalysis,
      priceAnalysis
    );
    
    // Determine confidence level and verdict
    const { confidenceLevel, verdict } = this.determineVerdict(realityScore, socialAnalysis);
    
    // Generate flags and recommendations
    const { redFlags, greenFlags, recommendations } = this.generateInsights(
      productAnalysis,
      socialAnalysis,
      ingredientAnalysis,
      reviewAnalysis,
      priceAnalysis
    );
    
    const result: RealityCheckResult = {
      reality_score: realityScore,
      confidence_level: confidenceLevel,
      overall_verdict: verdict,
      product_analysis: productAnalysis,
      social_analysis: socialAnalysis,
      ingredient_analysis: ingredientAnalysis,
      review_analysis: reviewAnalysis,
      price_analysis: priceAnalysis,
      red_flags: redFlags,
      green_flags: greenFlags,
      recommendations: recommendations,
      analysis_timestamp: new Date().toISOString(),
      data_sources: this.getDataSources(productData, socialData, reviewSummary)
    };
    
    console.log(chalk.green('✅ Reality Check Analysis Complete'));
    console.log(chalk.cyan(`🎯 Reality Score: ${realityScore}/100`));
    console.log(chalk.cyan(`🔮 Verdict: ${verdict.toUpperCase()}`));
    
    return result;
  }
  
  /**
   * Analyzes product-specific data
   */
  private analyzeProduct_Internal(productData: ProductData): ProductAnalysis {
    console.log(chalk.blue('📦 Analyzing product data...'));
    
    // Determine brand recognition based on common skincare brands
    const wellKnownBrands = [
      'cerave', 'the ordinary', 'neutrogena', 'olay', 'clinique', 'l\'oreal',
      'nivea', 'aveeno', 'eucerin', 'la roche posay', 'vichy', 'skinceuticals',
      'drunk elephant', 'paula\'s choice', 'cosrx', 'innisfree', 'laneige'
    ];
    
    const productNameLower = productData.name.toLowerCase();
    const brandRecognition = wellKnownBrands.some(brand => 
      productNameLower.includes(brand)
    ) ? 'well_known' : 'unknown';
    
    // Calculate availability score based on platform
    let availabilityScore = 50; // Default
    if (productData.platform === 'amazon') availabilityScore = 90;
    else if (productData.platform === 'sephora') availabilityScore = 85;
    else if (productData.platform === 'oliveyoung') availabilityScore = 70;
    else if (productData.platform === 'yesstyle') availabilityScore = 65;
    
    // Basic price reasonableness (will be refined in price analysis)
    const priceReasonableness = this.assessPriceReasonableness(productData.price);
    
    return {
      product_name: productData.name,
      platform: productData.platform,
      availability_score: availabilityScore,
      brand_recognition: brandRecognition,
      price_reasonableness: priceReasonableness
    };
  }
  
  /**
   * Analyzes social media data for authenticity
   */
  private analyzeSocialMedia(socialData?: TikTokVideoData): SocialAnalysis {
    console.log(chalk.blue('🎬 Analyzing social media data...'));
    
    if (!socialData) {
      return {
        has_social_data: false,
        promotional_detected: false,
        affiliate_codes_found: 0,
        hashtag_authenticity: 50, // Neutral when no data
        influencer_credibility: 'unknown',
        sponsored_content_probability: 0
      };
    }
    
    // Calculate hashtag authenticity score
    const hashtagAuthenticityScore = this.calculateHashtagAuthenticity(socialData.hashtags);
    
    // Determine influencer credibility based on engagement
    const influencerCredibility = this.assessInfluencerCredibility(socialData);
    
    // Calculate sponsored content probability
    const sponsoredProbability = this.calculateSponsoredProbability(socialData);
    
    return {
      has_social_data: true,
      promotional_detected: socialData.paid_promotion_detected,
      affiliate_codes_found: socialData.affiliate_codes.length,
      hashtag_authenticity: hashtagAuthenticityScore,
      influencer_credibility: influencerCredibility,
      sponsored_content_probability: sponsoredProbability
    };
  }
  
  /**
   * Analyzes ingredient list for quality and authenticity
   */
  private analyzeIngredients(ingredients: { raw: string; parsed: string[] }): OverallIngredientAnalysis {
    console.log(chalk.blue('🧪 Analyzing ingredients...'));
    
    if (!ingredients.parsed || ingredients.parsed.length === 0) {
      return {
        total_ingredients: 0,
        beneficial_ingredients: [],
        potentially_harmful: [],
        ingredient_quality_score: 0,
        ingredient_authenticity: 50 // Neutral when no data
      };
    }
    
    const beneficial = this.findBeneficialIngredients(ingredients.parsed);
    const harmful = this.findHarmfulIngredients(ingredients.parsed);
    
    // Calculate quality score based on beneficial vs harmful ratio
    const qualityScore = this.calculateIngredientQualityScore(beneficial.length, harmful.length, ingredients.parsed.length);
    
    // Calculate authenticity based on ingredient list structure
    const authenticity = this.calculateIngredientAuthenticity(ingredients);
    
    return {
      total_ingredients: ingredients.parsed.length,
      beneficial_ingredients: beneficial,
      potentially_harmful: harmful,
      ingredient_quality_score: qualityScore,
      ingredient_authenticity: authenticity
    };
  }
  
  /**
   * Analyzes review data for credibility and patterns
   */
  private analyzeReviews(reviewSummary?: ReviewSummary): ReviewAnalysis {
    console.log(chalk.blue('💬 Analyzing reviews...'));
    
    if (!reviewSummary || reviewSummary.total_reviews === 0) {
      return {
        review_count: 0,
        sentiment_distribution: { positive: 0, negative: 0, neutral: 0 },
        review_authenticity_score: 50, // Neutral when no data
        common_concerns: [],
        review_credibility: 'low' as const
      };
    }
    
    // Calculate review authenticity score based on sentiment distribution
    const authenticityScore = this.calculateReviewAuthenticity(reviewSummary.sentiment_breakdown);
    
    // Determine review credibility
    const credibility = this.assessReviewCredibility(reviewSummary, authenticityScore);
    
    return {
      review_count: reviewSummary.total_reviews,
      sentiment_distribution: reviewSummary.sentiment_breakdown,
      review_authenticity_score: authenticityScore,
      common_concerns: reviewSummary.common_negatives,
      review_credibility: credibility
    };
  }
  
  /**
   * Analyzes price reasonableness and value
   */
  private analyzePrice(price: string, ingredientQualityScore: number): PriceAnalysis {
    console.log(chalk.blue('💰 Analyzing price and value...'));
    
    // Extract numeric price if possible
    const numericPrice = this.extractNumericPrice(price);
    
    if (numericPrice === null) {
      return {
        price_range: price,
        value_assessment: 'unknown',
        price_vs_ingredients: 50,
        market_comparison: 'market_rate' as const
      };
    }
    
    // Assess value based on price and ingredient quality
    const valueAssessment = this.assessValueForMoney(numericPrice, ingredientQualityScore);
    
    // Compare to market rates
    const marketComparison = this.compareToMarket(numericPrice);
    
    // Calculate price vs ingredients score
    const priceVsIngredients = this.calculatePriceIngredientRatio(numericPrice, ingredientQualityScore);
    
    return {
      price_range: this.getPriceRange(numericPrice),
      value_assessment: valueAssessment,
      price_vs_ingredients: priceVsIngredients,
      market_comparison: marketComparison
    };
  }
  
  /**
   * Calculates overall reality score from all analyses
   */
  private calculateOverallScore(
    product: ProductAnalysis,
    social: SocialAnalysis,
    ingredient: OverallIngredientAnalysis,
    review: ReviewAnalysis,
    price: PriceAnalysis
  ): number {
    
    // Weighted scoring system
    const weights = {
      product: 0.2,      // 20% - product legitimacy and availability
      social: 0.3,       // 30% - social media authenticity (key factor)
      ingredient: 0.25,  // 25% - ingredient quality and authenticity
      review: 0.15,      // 15% - review credibility
      price: 0.1         // 10% - price reasonableness
    };
    
    // Calculate component scores
    const productScore = (product.availability_score + product.price_reasonableness) / 2;
    const socialScore = social.has_social_data ? 
      (100 - social.sponsored_content_probability + social.hashtag_authenticity) / 2 : 75; // Neutral if no social data
    const ingredientScore = (ingredient.ingredient_quality_score + ingredient.ingredient_authenticity) / 2;
    const reviewScore = review.review_count > 0 ? review.review_authenticity_score : 75; // Neutral if no reviews
    const priceScore = price.price_vs_ingredients;
    
    // Calculate weighted average
    const overallScore = 
      (productScore * weights.product) +
      (socialScore * weights.social) +
      (ingredientScore * weights.ingredient) +
      (reviewScore * weights.review) +
      (priceScore * weights.price);
    
    return Math.round(Math.max(0, Math.min(100, overallScore)));
  }
  
  /**
   * Determines verdict and confidence level based on scores
   */
  private determineVerdict(realityScore: number, socialAnalysis: SocialAnalysis): {
    confidenceLevel: 'high' | 'medium' | 'low';
    verdict: 'authentic' | 'suspicious' | 'likely_sponsored';
  } {
    
    let verdict: 'authentic' | 'suspicious' | 'likely_sponsored';
    let confidenceLevel: 'high' | 'medium' | 'low';
    
    // Determine verdict
    if (socialAnalysis.promotional_detected || socialAnalysis.sponsored_content_probability > 70) {
      verdict = 'likely_sponsored';
    } else if (realityScore >= 70) {
      verdict = 'authentic';
    } else {
      verdict = 'suspicious';
    }
    
    // Determine confidence level
    if (socialAnalysis.has_social_data && realityScore > 80) {
      confidenceLevel = 'high';
    } else if (socialAnalysis.has_social_data || realityScore > 60) {
      confidenceLevel = 'medium';
    } else {
      confidenceLevel = 'low';
    }
    
    return { confidenceLevel, verdict };
  }
  
  // Helper methods for specific calculations
  
  private calculateHashtagAuthenticity(hashtags: string[]): number {
    if (hashtags.length === 0) return 75; // Neutral
    
    const spammy = ['ad', 'sponsored', 'promo', 'affiliate', 'linkinbio'];
    const organic = ['skincare', 'beauty', 'selfcare', 'routine', 'review'];
    
    const spammyCount = hashtags.filter(tag => spammy.some(spam => tag.toLowerCase().includes(spam))).length;
    const organicCount = hashtags.filter(tag => organic.some(org => tag.toLowerCase().includes(org))).length;
    
    if (spammyCount > organicCount) return 30;
    if (organicCount > spammyCount) return 85;
    return 60; // Mixed
  }
  
  private assessInfluencerCredibility(socialData: TikTokVideoData): 'high' | 'medium' | 'low' | 'unknown' {
    // Simple heuristic based on engagement
    if (socialData.likes && socialData.views) {
      const engagementRate = socialData.likes / socialData.views;
      if (engagementRate > 0.05) return 'high';
      if (engagementRate > 0.02) return 'medium';
      return 'low';
    }
    return 'unknown';
  }
  
  private calculateSponsoredProbability(socialData: TikTokVideoData): number {
    let probability = 0;
    
    if (socialData.paid_promotion_detected) probability += 40;
    if (socialData.affiliate_codes.length > 0) probability += 30;
    if (socialData.promotional_keywords.length > 0) probability += 20;
    
    // Hashtag analysis
    const sponsoredHashtags = socialData.hashtags.filter(tag => 
      ['ad', 'sponsored', 'promo', 'affiliate', 'gifted'].includes(tag.toLowerCase())
    );
    probability += sponsoredHashtags.length * 10;
    
    return Math.min(100, probability);
  }
  
  private findBeneficialIngredients(ingredients: string[]): string[] {
    if (!this.ingredientsDatabase) return [];
    
    return ingredients.filter(ingredient => 
      this.ingredientsDatabase.beneficial.some((beneficial: string) => 
        ingredient.toLowerCase().includes(beneficial.toLowerCase())
      )
    );
  }
  
  private findHarmfulIngredients(ingredients: string[]): string[] {
    if (!this.ingredientsDatabase) return [];
    
    return ingredients.filter(ingredient => 
      this.ingredientsDatabase.potentially_harmful.some((harmful: string) => 
        ingredient.toLowerCase().includes(harmful.toLowerCase())
      )
    );
  }
  
  private calculateIngredientQualityScore(beneficial: number, harmful: number, total: number): number {
    if (total === 0) return 0;
    
    const beneficialRatio = beneficial / total;
    const harmfulRatio = harmful / total;
    
    // Score based on beneficial ingredients and lack of harmful ones
    let score = (beneficialRatio * 70) + ((1 - harmfulRatio) * 30);
    
    // Bonus for having good ingredients without harmful ones
    if (beneficial > 0 && harmful === 0) score += 10;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }
  
  private calculateIngredientAuthenticity(ingredients: { raw: string; parsed: string[] }): number {
    // Check if ingredient list looks realistic
    let score = 75; // Base score
    
    // Realistic length (most products have 10-30 ingredients)
    if (ingredients.parsed.length >= 5 && ingredients.parsed.length <= 50) score += 10;
    
    // Water/aqua typically first ingredient
    if (ingredients.parsed[0] && ['water', 'aqua'].includes(ingredients.parsed[0].toLowerCase())) score += 10;
    
    // Has preservatives (realistic for skincare)
    const hasPreservatives = ingredients.parsed.some(ing => 
      ['phenoxyethanol', 'ethylhexylglycerin', 'benzyl alcohol'].includes(ing.toLowerCase())
    );
    if (hasPreservatives) score += 5;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }
  
  private calculateReviewAuthenticity(sentimentBreakdown: { positive: number; negative: number; neutral: number }): number {
    const total = sentimentBreakdown.positive + sentimentBreakdown.negative + sentimentBreakdown.neutral;
    if (total === 0) return 50;
    
    const positiveRatio = sentimentBreakdown.positive / total;
    const negativeRatio = sentimentBreakdown.negative / total;
    
    // Suspicious if too many positive or too many negative
    if (positiveRatio > 0.9 || negativeRatio > 0.8) return 30;
    
    // Good mix of sentiments indicates authenticity
    if (positiveRatio >= 0.4 && positiveRatio <= 0.8 && negativeRatio >= 0.1 && negativeRatio <= 0.4) return 85;
    
    return 60; // Average authenticity
  }
  
  private assessReviewCredibility(reviewSummary: ReviewSummary, authenticityScore: number): 'high' | 'medium' | 'low' {
    if (reviewSummary.total_reviews >= 20 && authenticityScore >= 70) return 'high';
    if (reviewSummary.total_reviews >= 5 && authenticityScore >= 50) return 'medium';
    return 'low';
  }
  
  private assessPriceReasonableness(price: string): number {
    const numericPrice = this.extractNumericPrice(price);
    if (numericPrice === null) return 50; // Unknown
    
    // Basic skincare price ranges (very rough estimates)
    if (numericPrice <= 15) return 95;  // Very reasonable
    if (numericPrice <= 30) return 85;  // Reasonable
    if (numericPrice <= 60) return 70;  // Fair
    if (numericPrice <= 100) return 50; // Expensive but possibly justified
    return 30; // Very expensive
  }
  
  private extractNumericPrice(price: string): number | null {
    const match = price.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
  }
  
  private assessValueForMoney(price: number, ingredientQuality: number): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    const value = ingredientQuality / (price / 10); // Rough value calculation
    
    if (value >= 8) return 'excellent';
    if (value >= 6) return 'good';
    if (value >= 4) return 'fair';
    return 'poor';
  }
  
  private compareToMarket(price: number): 'below_market' | 'market_rate' | 'above_market' | 'premium' {
    // Very rough market comparison for skincare
    if (price <= 20) return 'below_market';
    if (price <= 50) return 'market_rate';
    if (price <= 100) return 'above_market';
    return 'premium';
  }
  
  private calculatePriceIngredientRatio(price: number, qualityScore: number): number {
    // Higher quality should justify higher price
    const expectedPrice = qualityScore * 0.8; // Rough calculation
    const actualVsExpected = expectedPrice / Math.max(price, 1);
    
    return Math.round(Math.max(0, Math.min(100, actualVsExpected * 100)));
  }
  
  private getPriceRange(price: number): string {
    if (price <= 15) return 'Budget ($0-$15)';
    if (price <= 30) return 'Affordable ($15-$30)';
    if (price <= 60) return 'Mid-range ($30-$60)';
    if (price <= 100) return 'Premium ($60-$100)';
    return 'Luxury ($100+)';
  }
  
  private generateInsights(
    product: ProductAnalysis,
    social: SocialAnalysis,
    ingredient: OverallIngredientAnalysis,
    review: ReviewAnalysis,
    price: PriceAnalysis
  ): { redFlags: string[]; greenFlags: string[]; recommendations: string[] } {
    
    const redFlags: string[] = [];
    const greenFlags: string[] = [];
    const recommendations: string[] = [];
    
    // Red flags
    if (social.promotional_detected) {
      redFlags.push('Sponsored content detected - may be biased promotion');
    }
    if (social.affiliate_codes_found > 0) {
      redFlags.push(`${social.affiliate_codes_found} affiliate codes found - financial incentive present`);
    }
    if (ingredient.potentially_harmful.length > 0) {
      redFlags.push(`Contains potentially irritating ingredients: ${ingredient.potentially_harmful.join(', ')}`);
    }
    if (review.review_authenticity_score < 50) {
      redFlags.push('Review patterns suggest possible fake reviews');
    }
    if (price.value_assessment === 'poor') {
      redFlags.push('Poor value for money - high price relative to ingredient quality');
    }
    
    // Green flags
    if (!social.promotional_detected && social.has_social_data) {
      greenFlags.push('No promotional content detected - likely genuine recommendation');
    }
    if (ingredient.beneficial_ingredients.length > 0) {
      greenFlags.push(`Contains beneficial ingredients: ${ingredient.beneficial_ingredients.join(', ')}`);
    }
    if (product.brand_recognition === 'well_known') {
      greenFlags.push('Product from well-established brand');
    }
    if (review.review_credibility === 'high') {
      greenFlags.push('Reviews appear authentic and credible');
    }
    if (price.value_assessment === 'excellent' || price.value_assessment === 'good') {
      greenFlags.push('Good value for money based on ingredient quality');
    }
    
    // Recommendations
    if (social.promotional_detected) {
      recommendations.push('Research product independently before purchasing - sponsored content detected');
    }
    if (ingredient.potentially_harmful.length > 0) {
      recommendations.push('Patch test recommended due to potentially irritating ingredients');
    }
    if (review.review_count < 10) {
      recommendations.push('Look for more reviews from multiple sources before deciding');
    }
    if (price.market_comparison === 'premium') {
      recommendations.push('Consider if premium price is justified by your specific skincare needs');
    }
    
    return { redFlags, greenFlags, recommendations };
  }
  
  private getDataSources(productData: ProductData, socialData?: TikTokVideoData, reviewSummary?: ReviewSummary): string[] {
    const sources = [productData.platform];
    
    if (socialData) {
      sources.push('tiktok');
    }
    if (reviewSummary && reviewSummary.total_reviews > 0) {
      sources.push('reviews');
    }
    
    return sources;
  }
}
