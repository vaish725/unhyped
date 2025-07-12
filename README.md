# 🧴 TikTok vs Truth Reality Checker

A comprehensive CLI tool that analyzes beauty products and detects potentially harmful ingredients, helping users make informed decisions about products promoted on social media platforms.

## ✨ Features

- **Multi-Platform Support**: Scrapes product data from OliveYoung, Amazon, YesStyle, and generic e-commerce sites
- **Intelligent Ingredient Analysis**: Analyzes 50+ common cosmetic ingredients against user's skin profile
- **Personalized Recommendations**: Tailored advice based on skin type and concerns
- **Influencer Promotion Detection**: Identifies paid promotions and sponsored content
- **Trust Score Calculation**: Evaluates product trustworthiness based on multiple factors
- **Schema Validation**: Ensures data integrity and consistent report format
- **Comprehensive Reporting**: Generates detailed JSON reports with analysis summary

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/unhyped.git
cd unhyped

# Install dependencies
npm install

# Create your skin profile
cp data/profile.json data/my-profile.json
# Edit data/my-profile.json with your skin information
```

### Basic Usage

```bash
# Analyze a product
npm run run "https://global.oliveyoung.com/product/detail?prdtNo=123"

# Analyze with influencer context
npm run run "https://amazon.com/product/xyz" "@skincare_guru"

# Use custom profile
npm run run "https://yesstyle.com/product/123" "" "data/my-profile.json"

# Get help
npm run run -- --help
```

## 📋 Configuration

### User Profile Structure

Create a JSON file with your skin information:

```json
{
  "skin_type": "oily",
  "concerns": ["acne", "sensitivity"],
  "age_range": "20-30",
  "allergies": ["fragrance", "sulfates"]
}
```

**Supported skin types**: `oily`, `dry`, `combination`, `sensitive`, `normal`

**Common concerns**: `acne`, `sensitivity`, `aging`, `hyperpigmentation`, `dehydration`

## 🛠️ Major Fixes & Improvements

### 1. **Complete Platform Implementation**
- ✅ Implemented missing Amazon scraper with robust selector fallbacks
- ✅ Implemented missing YesStyle scraper with multi-language support
- ✅ Added generic scraper for unsupported platforms
- ✅ Intelligent URL-based platform detection

### 2. **Advanced Ingredient Analysis**
- ✅ Expanded ingredient database from 3 to 50+ ingredients
- ✅ Personalized analysis based on user skin type and concerns
- ✅ Severity-based scoring system (low/medium/high)
- ✅ Custom recommendations for each skin type

### 3. **Intelligent Scoring System**
- ✅ Dynamic match score calculation based on flagged ingredients
- ✅ Trust score with multiple factors (price, rating, promotion detection)
- ✅ Enhanced penalty system for sensitive skin users
- ✅ Contextual recommendations

### 4. **Robust Error Handling**
- ✅ Comprehensive input validation
- ✅ Graceful fallback to generic scraper
- ✅ Detailed error messages with helpful suggestions
- ✅ Profile file validation with clear error reporting

### 5. **Enhanced CLI Experience**
- ✅ Professional command-line interface with Commander.js
- ✅ Comprehensive help system and usage examples
- ✅ Input validation and error handling
- ✅ Colorized output for better readability

### 6. **Data Integrity & Validation**
- ✅ Schema validation for all generated reports
- ✅ Brand extraction from product names and URLs
- ✅ Standardized data interfaces across all scrapers
- ✅ Comprehensive logging and debugging

## 📊 Output Format

The tool generates a detailed JSON report in `output/report.json`:

```json
{
  "product_name": "Advanced Retinol Serum",
  "brand": "The Ordinary",
  "price": 25.99,
  "rating": 4.2,
  "safe_ingredients": ["hyaluronic acid", "niacinamide", "ceramides"],
  "flagged_ingredients": [
    {
      "name": "fragrance",
      "issue": "Irritant",
      "severity": "high",
      "recommendation": "Especially avoid due to sensitive skin"
    }
  ],
  "match_score": 75,
  "trust_score": 85,
  "paid_promotions_detected": false,
  "analysis_summary": {
    "total_ingredients": 15,
    "flagged_count": 1,
    "user_skin_type": "sensitive",
    "user_concerns": ["acne", "sensitivity"]
  }
}
```

## 🔍 Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| OliveYoung | ✅ Full Support | Name, price, ingredients, reviews |
| Amazon | ✅ Full Support | Multiple price selectors, rating extraction |
| YesStyle | ✅ Full Support | Multi-language ingredient parsing |
| Generic Sites | ✅ Fallback | Basic product info extraction |

## 🧪 Ingredient Database

The tool analyzes 50+ common cosmetic ingredients including:

- **Irritants**: Fragrance, alcohol denat, essential oils
- **Comedogenic**: Coconut oil, petroleum jelly, isopropyl myristate
- **Harmful Preservatives**: Parabens, formaldehyde releasers
- **Toxic Substances**: Mercury, lead, toluene
- **Hormone Disruptors**: Oxybenzone, octinoxate
- **Carcinogens**: Coal tar, formaldehyde

Each ingredient is classified by:
- **Issue Type**: The specific concern (irritant, comedogenic, etc.)
- **Severity Level**: Low, medium, or high risk
- **Personalized Recommendations**: Based on your skin profile

## 🎯 Trust Score Factors

The trust score (0-100) considers:

- **Influencer Promotion**: -15 to -30 points for sponsored content
- **Product Price**: Adjustments for suspiciously cheap or premium products  
- **Customer Reviews**: Rating-based trust adjustments
- **Promotional Language**: Detection of affiliate links and discount codes

## 🛡️ Privacy & Security

- No data is sent to external servers
- All analysis is performed locally
- User profiles are stored locally only
- Debug files are saved to output directory only

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Additional platform scrapers (Sephora, Ulta, etc.)
- Expanded ingredient database
- Enhanced brand recognition
- Multi-language support
- Mobile app integration

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Ingredient data sourced from cosmetic science research
- Platform scraping techniques for educational purposes only
- Community feedback for ingredient database expansion

---

**Disclaimer**: This tool is for educational and informational purposes only. Always consult with dermatologists or skincare professionals for personalized advice. The developers are not responsible for any adverse reactions or decisions made based on this tool's output. 