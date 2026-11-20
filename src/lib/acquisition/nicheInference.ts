export interface InferredSiteProfile {
  industry: string;
  nicheKeywords: string[];
  country: string;
  city: string | null;
}

const NICHE_PATTERNS: Array<{
  pattern: RegExp;
  industry: string;
  coreModifiers: string[];
}> = [
  {
    pattern: /\b(car|cars|auto|autos|vehicle|vehicles|motor|motors|dealership|sedan|suv|truck|used car)\b/i,
    industry: 'Auto dealership & cars',
    coreModifiers: [
      'used cars',
      'cars for sale',
      'buy used cars',
      'affordable cars',
      'certified pre-owned cars',
      'car dealership near me',
      'best car deals',
      'used SUVs for sale',
      'used sedans for sale',
      'auto financing',
      'quality pre-owned vehicles',
      'local car dealer',
    ],
  },
  {
    pattern: /\b(jewel|jewelry|jeweller|jeweler|diamond|gold|ring|rings|necklace|bracelet|watch|watches|gem)\b/i,
    industry: 'Jewelry store',
    coreModifiers: [
      'fine jewelry',
      'custom jewelry',
      'diamond rings',
      'engagement rings',
      'gold chains',
      'luxury watches',
      'jewelry store near me',
      'best jewelry deals',
      'buy jewelry online',
      'bridal jewelry',
      '18k gold jewelry',
      'certified diamonds',
    ],
  },
  {
    pattern: /\b(pet|pets|dog|dogs|cat|cats|puppy|kitten|vet|veterinary|grooming|kennel|animal)\b/i,
    industry: 'Pet care & supplies',
    coreModifiers: [
      'pet store near me',
      'pet supplies online',
      'dog food and treats',
      'cat supplies',
      'pet grooming',
      'best pet care',
      'healthy pet products',
      'dog accessories',
      'cat toys',
      'veterinary care',
      'pet adoption',
      'local pet shop',
    ],
  },
  {
    pattern: /\b(ship|shipping|freight|cargo|logistics|courier|delivery|parcel|express|transport)\b/i,
    industry: 'Shipping & logistics',
    coreModifiers: [
      'express shipping',
      'international shipping',
      'freight forwarding',
      'fast parcel delivery',
      'cargo shipping services',
      'door to door delivery',
      'reliable courier service',
      'package tracking',
      'air freight shipping',
      'sea freight logistics',
    ],
  },
  {
    pattern: /\b(dent|dental|dentist|orthodont|teeth|implant|smile)\b/i,
    industry: 'Dental clinics',
    coreModifiers: [
      'dentist near me',
      'cosmetic dentistry',
      'dental implants',
      'emergency dentist',
      'teeth whitening',
      'family dental clinic',
      'affordable dental care',
    ],
  },
  {
    pattern: /\b(restaurant|cafe|bistro|food|dining|catering|bakery|pizza|burger|grill)\b/i,
    industry: 'Restaurants',
    coreModifiers: [
      'best restaurant near me',
      'fine dining',
      'food delivery',
      'catering services',
      'top rated restaurant',
      'order food online',
    ],
  },
  {
    pattern: /\b(real estate|realtor|property|properties|homes|apartments|mortgage|housing)\b/i,
    industry: 'Real estate',
    coreModifiers: [
      'homes for sale',
      'real estate agent near me',
      'apartments for rent',
      'luxury properties',
      'buy house',
      'property management',
    ],
  },
  {
    pattern: /\b(law|lawyer|attorney|legal|solicitor|litigation|injury)\b/i,
    industry: 'Law firm',
    coreModifiers: [
      'lawyer near me',
      'legal consultation',
      'best attorney',
      'experienced law firm',
    ],
  },
  {
    pattern: /\b(salon|barber|beauty|spa|skincare|hair|nails|cosmetic)\b/i,
    industry: 'Beauty & salon',
    coreModifiers: [
      'beauty salon near me',
      'hair stylist',
      'spa treatments',
      'skincare clinic',
    ],
  },
  {
    pattern: /\b(software|saas|agency|marketing|seo|web design|tech|digital|app)\b/i,
    industry: 'Software & digital agency',
    coreModifiers: [
      'digital agency',
      'web development services',
      'SEO optimization',
      'software solutions',
      'business growth automation',
    ],
  },
];

/**
 * Automatically understands any website's industry, niche keywords, and target market
 * directly from its domain, metadata, and crawled pages (zero manual setup needed).
 */
export function inferSiteNicheAndMarket(
  project: {
    name?: string | null;
    domain: string;
    industry?: string | null;
    country?: string | null;
    targetLocations?: string | null;
  },
  pages: Array<{ title?: string | null; h1?: string | null; metaDescription?: string | null; path?: string | null }>
): InferredSiteProfile {
  const combinedText = [
    project.name || '',
    project.domain.replace(/\.[a-z]+$/i, '').replace(/[-_]+/g, ' '),
    project.industry || '',
    ...pages.slice(0, 15).flatMap((p) => [p.title || '', p.h1 || '', p.metaDescription || '', p.path || '']),
  ].join(' ');

  const genericIndustries = new Set(['', 'general', 'technology', 'other', 'business', 'website', 'ecommerce', 'e-commerce']);
  const rawIndustry = (project.industry || '').trim();
  let industry = genericIndustries.has(rawIndustry.toLowerCase()) ? '' : rawIndustry;
  const nicheKeywords = new Set<string>();

  for (const niche of NICHE_PATTERNS) {
    if (niche.pattern.test(combinedText)) {
      if (!industry) industry = niche.industry;
      for (const kw of niche.coreModifiers) nicheKeywords.add(kw);
    }
  }

  if (!industry && rawIndustry) {
    industry = rawIndustry;
  }

  const cleanBrand = project.domain.replace(/^www\./, '').split('.')[0].replace(/[-_]+/g, ' ').trim();
  if (!industry) {
    const firstTitle = pages.find((p) => p.title && p.title.trim().length > 3)?.title || cleanBrand;
    industry = firstTitle.split(/[-|–—:]/)[0].trim().slice(0, 60) || 'Local Business';
  }

  const baseTopic = industry.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (baseTopic.length >= 3) {
    nicheKeywords.add(baseTopic);
    nicheKeywords.add(`best ${baseTopic}`);
    nicheKeywords.add(`${baseTopic} near me`);
    nicheKeywords.add(`affordable ${baseTopic}`);
    nicheKeywords.add(`top ${baseTopic}`);
    nicheKeywords.add(`${baseTopic} online`);
    nicheKeywords.add(`${baseTopic} deals`);
    nicheKeywords.add(`buy ${baseTopic}`);
  }
  if (cleanBrand.length >= 3) {
    nicheKeywords.add(cleanBrand);
    nicheKeywords.add(`${cleanBrand} ${baseTopic}`.trim());
  }

  const countryMap: Record<string, string> = {
    US: 'United States',
    UK: 'United Kingdom',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    NG: 'Nigeria',
    DE: 'Germany',
    FR: 'France',
  };
  const rawCountry = (project.country || 'US').trim();
  const country = countryMap[rawCountry.toUpperCase()] || rawCountry;

  let city: string | null = null;
  if (project.targetLocations) {
    try {
      const locs = JSON.parse(project.targetLocations);
      if (Array.isArray(locs) && locs[0]) city = String(locs[0]).trim();
    } catch {
      city = project.targetLocations.split(',')[0]?.trim() || null;
    }
  }

  return {
    industry,
    nicheKeywords: Array.from(nicheKeywords).slice(0, 30),
    country,
    city,
  };
}
