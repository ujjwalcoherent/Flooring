const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geographies with their region grouping
const regions = {
  "North America": ["U.S.", "Canada"],
  "Europe": ["U.K.", "Germany", "Italy", "France", "Spain", "Russia", "Rest of Europe"],
  "Asia Pacific": ["China", "India", "Japan", "South Korea", "ASEAN", "Australia", "Rest of Asia Pacific"],
  "Latin America": ["Brazil", "Argentina", "Mexico", "Rest of Latin America"],
  "Middle East & Africa": ["GCC", "South Africa", "Rest of Middle East & Africa"]
};

// Hierarchical segment definitions
// Each leaf has { share, growth } where share is proportion of total and growth is multiplier on regional CAGR
// Parent nodes just group children
const segmentDefinitions = {
  "By Product Type": {
    "Resilient Flooring": {
      "Luxury Vinyl Tile (LVT)": { share: 0.10, growth: 1.12 },
      "Luxury Vinyl Plank (LVP)": { share: 0.09, growth: 1.15 },
      "Vinyl Sheet Flooring": { share: 0.06, growth: 0.90 },
      "PVC-free Resilient Flooring": { share: 0.04, growth: 1.25 },
      "Rigid Core Resilient Flooring": { share: 0.07, growth: 1.18 }
    },
    "Linoleum Flooring": { share: 0.08, growth: 0.95 },
    "Wood Flooring": {
      "Solid Hardwood Flooring": { share: 0.07, growth: 0.88 },
      "Engineered Wood Flooring": { share: 0.08, growth: 1.05 },
      "Reclaimed Wood Flooring": { share: 0.04, growth: 1.10 }
    },
    "Bamboo Flooring": { share: 0.06, growth: 1.08 },
    "Cork Flooring": { share: 0.05, growth: 1.02 },
    "Rubber Flooring": { share: 0.06, growth: 0.98 },
    "Textile Flooring": {
      "Natural Fiber Carpets": { share: 0.05, growth: 0.92 },
      "Recycled Fiber Carpets": { share: 0.04, growth: 1.15 }
    },
    "Terrazzo Flooring": { share: 0.05, growth: 0.95 },
    "Other Recycled-Content Flooring": { share: 0.06, growth: 1.05 }
  },
  "By Thickness": {
    "Up to 2 mm": { share: 0.10, growth: 0.88 },
    "2 mm to 4 mm": { share: 0.20, growth: 0.95 },
    "4 mm to 6 mm": { share: 0.25, growth: 1.05 },
    "6 mm to 8 mm": { share: 0.20, growth: 1.08 },
    "8 mm to 12 mm": { share: 0.15, growth: 1.10 },
    "Above 12 mm": { share: 0.10, growth: 1.02 }
  },
  "By Material Type": {
    "Natural Renewable Materials": { share: 0.25, growth: 1.05 },
    "Sustainably Sourced Wood Materials": { share: 0.22, growth: 0.98 },
    "Recycled Materials": { share: 0.20, growth: 1.15 },
    "Mineral & Inorganic Materials": { share: 0.18, growth: 0.92 },
    "Polymer-Based Sustainable Materials": { share: 0.15, growth: 1.10 }
  },
  "By Flooring Format": {
    "Tiles": { share: 0.40, growth: 1.02 },
    "Planks": { share: 0.35, growth: 1.08 },
    "Sheet / Roll": { share: 0.25, growth: 0.90 }
  },
  "By Installation Type": {
    "Glue-down / Dryback Flooring": { share: 0.30, growth: 0.92 },
    "Click-lock Flooring": { share: 0.35, growth: 1.12 },
    "Loose-lay Flooring": { share: 0.20, growth: 1.08 },
    "Peel-and-stick Flooring": { share: 0.15, growth: 1.05 }
  },
  "By Application": {
    "Residential": { share: 0.25, growth: 1.05 },
    "Commercial": {
      "Office Spaces": { share: 0.06, growth: 1.02 },
      "Retail Stores": { share: 0.05, growth: 0.98 },
      "Hotels & Restaurants": { share: 0.05, growth: 1.08 },
      "Others": { share: 0.04, growth: 0.95 }
    },
    "Industrial": {
      "Factories": { share: 0.04, growth: 0.90 },
      "Warehouses": { share: 0.04, growth: 0.92 },
      "Others": { share: 0.03, growth: 0.88 }
    },
    "Institutional": {
      "Schools & Universities": { share: 0.06, growth: 1.10 },
      "Hospitals & Healthcare Facilities": { share: 0.06, growth: 1.12 },
      "Government & Administrative Buildings": { share: 0.05, growth: 1.05 }
    },
    "Public Infrastructure": {
      "Airports": { share: 0.04, growth: 1.15 },
      "Railway / Metro Stations": { share: 0.04, growth: 1.08 },
      "Parks & Recreational Spaces": { share: 0.05, growth: 1.02 },
      "Community & Civic Buildings": { share: 0.04, growth: 0.98 }
    }
  },
  "By Distribution Channel": {
    "B2B": { share: 0.30, growth: 0.95 },
    "B2C": {
      "Offline": {
        "Home Improvement Stores": { share: 0.15, growth: 1.02 },
        "Specialized Flooring Retailers": { share: 0.15, growth: 0.98 },
        "Others": { share: 0.10, growth: 0.90 }
      },
      "Online": {
        "E-commerce Websites": { share: 0.18, growth: 1.20 },
        "Company Own Website": { share: 0.12, growth: 1.15 }
      }
    }
  }
};

// Regional base values (USD Million) for 2021 - total market per region
// Global Sustainable Flooring market ~$800M in 2021, growing ~9% CAGR
const regionBaseValues = {
  "North America": 280,
  "Europe": 240,
  "Asia Pacific": 180,
  "Latin America": 55,
  "Middle East & Africa": 45
};

// Country share within region (must sum to ~1.0)
const countryShares = {
  "North America": { "U.S.": 0.82, "Canada": 0.18 },
  "Europe": { "U.K.": 0.18, "Germany": 0.22, "Italy": 0.12, "France": 0.16, "Spain": 0.10, "Russia": 0.08, "Rest of Europe": 0.14 },
  "Asia Pacific": { "China": 0.28, "India": 0.12, "Japan": 0.25, "South Korea": 0.12, "ASEAN": 0.10, "Australia": 0.07, "Rest of Asia Pacific": 0.06 },
  "Latin America": { "Brazil": 0.45, "Argentina": 0.15, "Mexico": 0.25, "Rest of Latin America": 0.15 },
  "Middle East & Africa": { "GCC": 0.45, "South Africa": 0.25, "Rest of Middle East & Africa": 0.30 }
};

// Growth rates (CAGR) per region
const regionGrowthRates = {
  "North America": 0.088,
  "Europe": 0.092,
  "Asia Pacific": 0.115,
  "Latin America": 0.098,
  "Middle East & Africa": 0.085
};

// Volume multiplier: units per USD Million (~2000 sq.m per $1M for flooring)
const volumePerMillionUSD = 2000;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

// Check if a node is a leaf (has share and growth properties)
function isLeaf(node) {
  return node && typeof node.share === 'number' && typeof node.growth === 'number';
}

// Recursively generate hierarchical data for a segment type
// Parent nodes get aggregated year data (sum of children) so charts can display them
function generateHierarchicalSegment(node, regionBase, regionGrowth, multiplier, roundFn) {
  if (isLeaf(node)) {
    // Leaf node - generate time series data
    const segBase = regionBase * multiplier * node.share;
    const segGrowth = regionGrowth * node.growth;
    const shareVariation = 1 + (seededRandom() - 0.5) * 0.1;
    return generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
  }

  // Parent node - recursively process children
  const result = {};
  for (const [childName, childNode] of Object.entries(node)) {
    result[childName] = generateHierarchicalSegment(childNode, regionBase, regionGrowth, multiplier, roundFn);
  }

  // Add aggregated year data to parent node (sum of all leaf descendants)
  const parentTotals = {};
  years.forEach(year => { parentTotals[year] = 0; });

  function sumLeaves(obj) {
    if (obj && typeof obj === 'object' && obj[years[0]] !== undefined && typeof obj[years[0]] === 'number') {
      // This is a leaf with year data - add its values
      years.forEach(year => {
        parentTotals[year] += obj[year] || 0;
      });
    } else if (obj && typeof obj === 'object') {
      // Traverse children
      for (const val of Object.values(obj)) {
        sumLeaves(val);
      }
    }
  }

  // Sum all leaf descendants
  for (const child of Object.values(result)) {
    sumLeaves(child);
  }

  // Add year data directly on the parent node alongside children
  years.forEach(year => {
    result[year] = roundFn(parentTotals[year]);
  });
  result['_aggregated'] = true;

  return result;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  // Generate data for each region and country
  for (const [regionName, countries] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName];
    const regionGrowth = regionGrowthRates[regionName];

    // Region-level data
    data[regionName] = {};
    for (const [segType, segDef] of Object.entries(segmentDefinitions)) {
      data[regionName][segType] = generateHierarchicalSegment(segDef, regionBase, regionGrowth, multiplier, roundFn);
    }

    // Add "By Country" for each region
    data[regionName]["By Country"] = {};
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const countryBase = regionBase * cShare;
      const countryGrowth = regionGrowth * countryGrowthVariation;
      data[regionName]["By Country"][country] = generateTimeSeries(countryBase * multiplier, countryGrowth, roundFn);
    }

    // Country-level data
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryBase = regionBase * cShare;
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const countryGrowth = regionGrowth * countryGrowthVariation;

      data[country] = {};
      for (const [segType, segDef] of Object.entries(segmentDefinitions)) {
        data[country][segType] = generateHierarchicalSegment(segDef, countryBase, countryGrowth, multiplier, roundFn);
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

console.log('Generated value.json and volume.json successfully');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Volume geographies:', Object.keys(volumeData).length);
console.log('Segment types:', Object.keys(valueData['North America']).filter(k => k !== 'By Country'));
console.log('\nSample - North America, By Product Type (top-level keys):');
console.log(Object.keys(valueData['North America']['By Product Type']));
console.log('\nSample - North America, By Application (structure):');
const app = valueData['North America']['By Application'];
for (const [k, v] of Object.entries(app)) {
  if (v && typeof v === 'object' && !v['2021']) {
    console.log(`  ${k}: [${Object.keys(v).join(', ')}]`);
  } else {
    console.log(`  ${k}: (leaf)`);
  }
}
console.log('\nSample - North America, By Distribution Channel (structure):');
const dist = valueData['North America']['By Distribution Channel'];
for (const [k, v] of Object.entries(dist)) {
  if (v && typeof v === 'object' && !v['2021']) {
    console.log(`  ${k}:`);
    for (const [k2, v2] of Object.entries(v)) {
      if (v2 && typeof v2 === 'object' && !v2['2021']) {
        console.log(`    ${k2}: [${Object.keys(v2).join(', ')}]`);
      } else {
        console.log(`    ${k2}: (leaf)`);
      }
    }
  } else {
    console.log(`  ${k}: (leaf)`);
  }
}
