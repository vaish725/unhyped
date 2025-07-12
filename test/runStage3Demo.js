/**
 * Stage 3 Demo Runner - Showcases Reality Check Analysis
 */

import chalk from 'chalk';

// Mock the RealityCheckEngine functionality for demo
class MockRealityCheckEngine {
  
  async analyzeProduct(productData, socialData, reviewSummary) {
    console.log(chalk.blue('\n🔍 Starting Reality Check Analysis...'));
    console.log(chalk.gray(`Product: ${productData.name}`));
    console.log(chalk.gray(`Platform: ${productData.platform}`));
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate scores based on data
    const productScore = this.calculateProductScore(productData);
    const socialScore = this.calculateSocialScore(socialData);
    const ingredientScore = this.calculateIngredientScore(productData.ingredients);
    const reviewScore = this.calculateReviewScore(reviewSummary);
    const priceScore = this.calculatePriceScore(productData.price);
    
    // Weighted overall score
    const realityScore = Math.round(
      (productScore * 0.2) +
      (socialScore * 0.3) +
      (ingredientScore * 0.25) +
      (reviewScore * 0.15) +
      (priceScore * 0.1)
    );
    
    // Determine verdict
    let verdict = 'authentic';
    let confidenceLevel = 'medium';
    
    if (socialData && socialData.paid_promotion_detected) {
      verdict = 'likely_sponsored';
      confidenceLevel = 'high';
    } else if (realityScore < 60) {
      verdict = 'suspicious';
      confidenceLevel = 'low';
    } else if (realityScore >= 80) {
      confidenceLevel = 'high';
    }
    
    // Generate insights
    const redFlags = this.generateRedFlags(socialData, ingredientScore, reviewScore);
    const greenFlags = this.generateGreenFlags(productData, socialData, ingredientScore);
    const recommendations = this.generateRecommendations(verdict, redFlags.length);
    
    return {
      reality_score: realityScore,
      confidence_level: confidenceLevel,
      overall_verdict: verdict,
      product_analysis: {
        product_name: productData.name,
        platform: productData.platform,
        availability_score: productScore,
        brand_recognition: this.checkBrandRecognition(productData.name),
        price_reasonableness: priceScore
      },
      social_analysis: {
        has_social_data: !!socialData,
        promotional_detected: socialData ? socialData.paid_promotion_detected : false,
        affiliate_codes_found: socialData ? socialData.affiliate_codes.length : 0,
        hashtag_authenticity: socialData ? this.calculateHashtagAuthenticity(socialData.hashtags) : 50,
        influencer_credibility: socialData ? this.assessInfluencerCredibility(socialData) : 'unknown',
        sponsored_content_probability: socialData ? this.calculateSponsoredProbability(socialData) : 0
      },
      ingredient_analysis: {
        total_ingredients: productData.ingredients.parsed.length,
        beneficial_ingredients: this.findBeneficialIngredients(productData.ingredients.parsed),
        potentially_harmful: this.findHarmfulIngredients(productData.ingredients.parsed),
        ingredient_quality_score: ingredientScore,
        ingredient_authenticity: this.calculateIngredientAuthenticity(productData.ingredients)
      },
      review_analysis: {
        review_count: reviewSummary ? reviewSummary.total_reviews : 0,
        sentiment_distribution: reviewSummary ? reviewSummary.sentiment_breakdown : { positive: 0, negative: 0, neutral: 0 },
        review_authenticity_score: reviewScore,
        common_concerns: reviewSummary ? reviewSummary.common_negatives : [],
        review_credibility: reviewScore > 70 ? 'high' : reviewScore > 50 ? 'medium' : 'low'
      },
      price_analysis: {
        price_range: this.getPriceRange(productData.price),
        value_assessment: this.assessValue(productData.price, ingredientScore),
        price_vs_ingredients: Math.round((ingredientScore + priceScore) / 2),
        market_comparison: this.compareToMarket(productData.price)
      },
      red_flags: redFlags,
      green_flags: greenFlags,
      recommendations: recommendations,
      analysis_timestamp: new Date().toISOString(),
      data_sources: this.getDataSources(productData, socialData, reviewSummary)
    };
  }
  
  calculateProductScore(productData) {
    let score = 70; // Base score
    if (productData.platform === 'amazon') score += 20;
    else if (productData.platform === 'sephora') score += 15;
    else if (productData.platform === 'oliveyoung') score += 10;
    return Math.min(100, score);
  }
  
  calculateSocialScore(socialData) {
    if (!socialData) return 75; // Neutral
    
    let score = 100;
    if (socialData.paid_promotion_detected) score -= 50;
    if (socialData.affiliate_codes.length > 0) score -= 30;
    
    const spammyHashtags = socialData.hashtags.filter(tag => 
      ['ad', 'sponsored', 'promo', 'affiliate'].includes(tag.toLowerCase())
    ).length;
    score -= spammyHashtags * 10;
    
    return Math.max(0, score);
  }
  
  calculateIngredientScore(ingredients) {
    if (!ingredients.parsed.length) return 0;
    
    const beneficial = this.findBeneficialIngredients(ingredients.parsed);
    const harmful = this.findHarmfulIngredients(ingredients.parsed);
    
    const beneficialRatio = beneficial.length / ingredients.parsed.length;
    const harmfulRatio = harmful.length / ingredients.parsed.length;
    
    return Math.round((beneficialRatio * 70) + ((1 - harmfulRatio) * 30));
  }
  
  calculateReviewScore(reviewSummary) {
    if (!reviewSummary || reviewSummary.total_reviews === 0) return 50;
    
    const total = reviewSummary.sentiment_breakdown.positive + 
                 reviewSummary.sentiment_breakdown.negative + 
                 reviewSummary.sentiment_breakdown.neutral;
    
    if (total === 0) return 50;
    
    const positiveRatio = reviewSummary.sentiment_breakdown.positive / total;
    
    // Suspicious if too many positive
    if (positiveRatio > 0.9) return 30;
    if (positiveRatio >= 0.6 && positiveRatio <= 0.8) return 85;
    
    return 60;
  }
  
  calculatePriceScore(price) {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 50;
    
    if (numericPrice <= 15) return 95;
    if (numericPrice <= 30) return 85;
    if (numericPrice <= 60) return 70;
    return 50;
  }
  
  checkBrandRecognition(productName) {
    const wellKnownBrands = [
      'cerave', 'the ordinary', 'neutrogena', 'olay', 'clinique', 'laneige'
    ];
    
    return wellKnownBrands.some(brand => 
      productName.toLowerCase().includes(brand)
    ) ? 'well_known' : 'unknown';
  }
  
  findBeneficialIngredients(ingredients) {
    const beneficial = [
      'niacinamide', 'hyaluronic acid', 'vitamin c', 'retinol', 'ceramide',
      'glycerin', 'salicylic acid', 'peptides', 'squalane'
    ];
    
    return ingredients.filter(ingredient => 
      beneficial.some(good => ingredient.toLowerCase().includes(good.toLowerCase()))
    );
  }
  
  findHarmfulIngredients(ingredients) {
    const harmful = [
      'alcohol denat', 'sodium lauryl sulfate', 'formaldehyde', 'parabens'
    ];
    
    return ingredients.filter(ingredient => 
      harmful.some(bad => ingredient.toLowerCase().includes(bad.toLowerCase()))
    );
  }
  
  calculateHashtagAuthenticity(hashtags) {
    const spammy = ['ad', 'sponsored', 'promo', 'affiliate'];
    const organic = ['skincare', 'beauty', 'routine', 'review'];
    
    const spammyCount = hashtags.filter(tag => spammy.includes(tag.toLowerCase())).length;
    const organicCount = hashtags.filter(tag => organic.includes(tag.toLowerCase())).length;
    
    if (spammyCount > organicCount) return 30;
    if (organicCount > spammyCount) return 85;
    return 60;
  }
  
  assessInfluencerCredibility(socialData) {
    if (socialData.likes && socialData.views) {
      const engagementRate = socialData.likes / socialData.views;
      if (engagementRate > 0.05) return 'high';
      if (engagementRate > 0.02) return 'medium';
      return 'low';
    }
    return 'unknown';
  }
  
  calculateSponsoredProbability(socialData) {
    let probability = 0;
    
    if (socialData.paid_promotion_detected) probability += 40;
    if (socialData.affiliate_codes.length > 0) probability += 30;
    
    const sponsoredHashtags = socialData.hashtags.filter(tag => 
      ['ad', 'sponsored', 'promo', 'affiliate'].includes(tag.toLowerCase())
    );
    probability += sponsoredHashtags.length * 15;
    
    return Math.min(100, probability);
  }
  
  calculateIngredientAuthenticity(ingredients) {
    let score = 75;
    
    if (ingredients.parsed.length >= 5 && ingredients.parsed.length <= 50) score += 10;
    if (ingredients.parsed[0] && ['water', 'aqua'].includes(ingredients.parsed[0].toLowerCase())) score += 10;
    
    return Math.min(100, score);
  }
  
  generateRedFlags(socialData, ingredientScore, reviewScore) {
    const flags = [];
    
    if (socialData && socialData.paid_promotion_detected) {
      flags.push('Sponsored content detected - may be biased promotion');
    }
    if (socialData && socialData.affiliate_codes.length > 0) {
      flags.push(`${socialData.affiliate_codes.length} affiliate codes found - financial incentive present`);
    }
    if (ingredientScore < 40) {
      flags.push('Low ingredient quality score - potentially concerning formulation');
    }
    if (reviewScore < 50) {
      flags.push('Review patterns suggest possible fake reviews');
    }
    
    return flags;
  }
  
  generateGreenFlags(productData, socialData, ingredientScore) {
    const flags = [];
    
    if (!socialData || !socialData.paid_promotion_detected) {
      flags.push('No promotional content detected - likely genuine recommendation');
    }
    if (ingredientScore > 70) {
      flags.push('High quality ingredient formulation detected');
    }
    if (this.checkBrandRecognition(productData.name) === 'well_known') {
      flags.push('Product from well-established brand');
    }
    
    return flags;
  }
  
  generateRecommendations(verdict, redFlagCount) {
    const recommendations = [];
    
    if (verdict === 'likely_sponsored') {
      recommendations.push('Research product independently before purchasing - sponsored content detected');
    }
    if (redFlagCount > 2) {
      recommendations.push('Consider alternative products due to multiple concerns identified');
    }
    if (verdict === 'authentic') {
      recommendations.push('Product appears authentic, but always patch test new skincare products');
    }
    
    return recommendations;
  }
  
  getPriceRange(price) {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 'Unknown';
    
    if (numericPrice <= 15) return 'Budget ($0-$15)';
    if (numericPrice <= 30) return 'Affordable ($15-$30)';
    if (numericPrice <= 60) return 'Mid-range ($30-$60)';
    return 'Premium ($60+)';
  }
  
  assessValue(price, ingredientScore) {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 'unknown';
    
    const value = ingredientScore / (numericPrice / 10);
    if (value >= 8) return 'excellent';
    if (value >= 6) return 'good';
    if (value >= 4) return 'fair';
    return 'poor';
  }
  
  compareToMarket(price) {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 'unknown';
    
    if (numericPrice <= 20) return 'below_market';
    if (numericPrice <= 50) return 'market_rate';
    return 'above_market';
  }
  
  getDataSources(productData, socialData, reviewSummary) {
    const sources = [productData.platform];
    if (socialData) sources.push('tiktok');
    if (reviewSummary && reviewSummary.total_reviews > 0) sources.push('reviews');
    return sources;
  }
}

// Test data
const mockProductData = {
  name: 'CeraVe Daily Moisturizing Lotion',
  price: '$14.99',
  rating: '4.5',
  reviews: [],
  ingredients: {
    raw: 'Aqua, Glycerin, Ceramide NP, Hyaluronic Acid, Dimethicone, Phenoxyethanol',
    parsed: ['Aqua', 'Glycerin', 'Ceramide NP', 'Hyaluronic Acid', 'Dimethicone', 'Phenoxyethanol']
  },
  platform: 'amazon'
};

const mockTikTokAuthentic = {
  username: 'skincare_enthusiast',
  caption: 'Been using this CeraVe lotion for 3 months and my skin feels amazing! #skincare #routine',
  hashtags: ['skincare', 'routine', 'cerave'],
  mentions: [],
  likes: 2543,
  views: 45231,
  affiliate_codes: [],
  paid_promotion_detected: false
};

const mockTikTokSponsored = {
  username: 'beauty_influencer',
  caption: 'OMG try this moisturizer! Use code BEAUTY20 for 20% off! #ad #sponsored #affiliate',
  hashtags: ['ad', 'sponsored', 'affiliate', 'promo'],
  mentions: [],
  likes: 15643,
  views: 234567,
  affiliate_codes: ['BEAUTY20'],
  paid_promotion_detected: true
};

const mockReviews = {
  total_reviews: 156,
  sentiment_breakdown: { positive: 89, negative: 23, neutral: 44 },
  common_positives: ['moisturizing', 'gentle', 'effective'],
  common_negatives: ['sticky feeling', 'strong fragrance']
};

// Demo function
async function runStage3Demo() {
  console.log(chalk.blue.bold('\n🧪 STAGE 3: REALITY CHECK ANALYSIS - DEMO'));
  console.log(chalk.gray('===========================================\n'));
  
  const engine = new MockRealityCheckEngine();
  
  // Test 1: Authentic Product Analysis
  console.log(chalk.cyan('🔍 Test 1: Authentic Product Analysis'));
  const result1 = await engine.analyzeProduct(mockProductData, mockTikTokAuthentic, mockReviews);
  displayResults(result1, 'Authentic Content');
  
  // Test 2: Sponsored Content Analysis
  console.log(chalk.cyan('\n🔍 Test 2: Sponsored Content Analysis'));
  const result2 = await engine.analyzeProduct(mockProductData, mockTikTokSponsored, mockReviews);
  displayResults(result2, 'Sponsored Content');
  
  // Test 3: Product Only Analysis
  console.log(chalk.cyan('\n🔍 Test 3: Product Only Analysis (No Social Media)'));
  const result3 = await engine.analyzeProduct(mockProductData, null, mockReviews);
  displayResults(result3, 'Product Only');
  
  console.log(chalk.green.bold('\n✅ STAGE 3 DEMO COMPLETE!'));
  console.log(chalk.green('All Reality Check Analysis components working successfully!'));
}

function displayResults(result, testType) {
  console.log(chalk.blue(`\n📊 ${testType} Results:`));
  console.log(chalk.gray('─'.repeat(40)));
  
  const verdictColor = result.overall_verdict === 'authentic' ? chalk.green :
                      result.overall_verdict === 'suspicious' ? chalk.yellow : chalk.red;
  
  console.log(`   ${verdictColor('●')} Verdict: ${verdictColor(result.overall_verdict.toUpperCase())}`);
  console.log(`   🎯 Reality Score: ${getScoreColor(result.reality_score)}${result.reality_score}/100${chalk.reset()}`);
  console.log(`   📊 Confidence: ${result.confidence_level.toUpperCase()}`);
  
  if (result.social_analysis.has_social_data) {
    console.log(`   🎬 Promotional: ${result.social_analysis.sponsored_content_probability}%`);
    console.log(`   📱 Affiliate Codes: ${result.social_analysis.affiliate_codes_found}`);
  }
  
  console.log(`   🧪 Ingredients: ${result.ingredient_analysis.ingredient_quality_score}/100`);
  console.log(`   💰 Value: ${result.price_analysis.value_assessment}`);
  
  if (result.red_flags.length > 0) {
    console.log(chalk.red('   🚩 Red Flags:'));
    result.red_flags.forEach(flag => console.log(chalk.red(`      • ${flag}`)));
  }
  
  if (result.green_flags.length > 0) {
    console.log(chalk.green('   ✅ Green Flags:'));
    result.green_flags.forEach(flag => console.log(chalk.green(`      • ${flag}`)));
  }
}

function getScoreColor(score) {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.yellowBright;
  return chalk.red;
}

// Run the demo
runStage3Demo().catch(console.error); 