import type { CityInfo } from '@/types';

/**
 * City cost profiles. Numbers approximate 2025–26 medians from
 * RentCafe/Zillow rents, BLS regional CPI, Numbeo, and Care.com childcare data.
 *
 * To add a new city, add an entry following the same shape. The id is what
 * components reference; keep them lowercase short slugs.
 */
export const CITIES: Record<string, CityInfo> = {
  nyc: {
    name: 'New York City', state: 'NY', tier: 'Very High', localTax: 0.038,
    rent1: 4200, rent3: 6500, groceries: 510, utilities: 220, transit: 132, carCost: 1100,
    childcareInfant: 2700, childcarePreschool: 2200, healthSingle: 450, healthFamily: 1500,
  },
  sf: {
    name: 'San Francisco', state: 'CA', tier: 'Very High', localTax: 0,
    rent1: 3300, rent3: 5400, groceries: 540, utilities: 180, transit: 105, carCost: 1050,
    childcareInfant: 2900, childcarePreschool: 2400, healthSingle: 480, healthFamily: 1500,
  },
  la: {
    name: 'Los Angeles', state: 'CA', tier: 'High', localTax: 0,
    rent1: 2400, rent3: 3900, groceries: 480, utilities: 170, transit: 100, carCost: 1000,
    childcareInfant: 2300, childcarePreschool: 1900, healthSingle: 430, healthFamily: 1400,
  },
  bos: {
    name: 'Boston', state: 'MA', tier: 'High', localTax: 0,
    rent1: 2900, rent3: 4500, groceries: 500, utilities: 200, transit: 90, carCost: 1000,
    childcareInfant: 2500, childcarePreschool: 2100, healthSingle: 430, healthFamily: 1400,
  },
  sea: {
    name: 'Seattle', state: 'WA', tier: 'High', localTax: 0,
    rent1: 2100, rent3: 3500, groceries: 470, utilities: 170, transit: 99, carCost: 950,
    childcareInfant: 2400, childcarePreschool: 2000, healthSingle: 420, healthFamily: 1400,
  },
  dc: {
    name: 'Washington DC', state: 'DC', tier: 'High', localTax: 0,
    rent1: 2400, rent3: 4000, groceries: 470, utilities: 190, transit: 90, carCost: 980,
    childcareInfant: 2600, childcarePreschool: 2200, healthSingle: 440, healthFamily: 1400,
  },
  mia: {
    name: 'Miami', state: 'FL', tier: 'High', localTax: 0,
    rent1: 2500, rent3: 4100, groceries: 460, utilities: 200, transit: 112, carCost: 980,
    childcareInfant: 1700, childcarePreschool: 1400, healthSingle: 440, healthFamily: 1450,
  },
  chi: {
    name: 'Chicago', state: 'IL', tier: 'Moderate', localTax: 0,
    rent1: 1800, rent3: 2900, groceries: 420, utilities: 180, transit: 105, carCost: 900,
    childcareInfant: 2000, childcarePreschool: 1700, healthSingle: 410, healthFamily: 1300,
  },
  den: {
    name: 'Denver', state: 'CO', tier: 'Moderate', localTax: 0,
    rent1: 1850, rent3: 3000, groceries: 440, utilities: 160, transit: 114, carCost: 920,
    childcareInfant: 1900, childcarePreschool: 1600, healthSingle: 410, healthFamily: 1300,
  },
  aus: {
    name: 'Austin', state: 'TX', tier: 'Moderate', localTax: 0,
    rent1: 1650, rent3: 2700, groceries: 410, utilities: 180, transit: 41, carCost: 920,
    childcareInfant: 1700, childcarePreschool: 1400, healthSingle: 400, healthFamily: 1300,
  },
  atl: {
    name: 'Atlanta', state: 'GA', tier: 'Moderate', localTax: 0,
    rent1: 1600, rent3: 2400, groceries: 400, utilities: 170, transit: 95, carCost: 900,
    childcareInfant: 1500, childcarePreschool: 1200, healthSingle: 400, healthFamily: 1280,
  },
  phx: {
    name: 'Phoenix', state: 'AZ', tier: 'Moderate', localTax: 0,
    rent1: 1500, rent3: 2300, groceries: 420, utilities: 200, transit: 64, carCost: 900,
    childcareInfant: 1500, childcarePreschool: 1200, healthSingle: 400, healthFamily: 1280,
  },
  nash: {
    name: 'Nashville', state: 'TN', tier: 'Moderate', localTax: 0,
    rent1: 1700, rent3: 2600, groceries: 410, utilities: 170, transit: 67, carCost: 900,
    childcareInfant: 1500, childcarePreschool: 1200, healthSingle: 400, healthFamily: 1280,
  },
  cmh: {
    name: 'Columbus', state: 'OH', tier: 'Lower', localTax: 0.025,
    rent1: 1300, rent3: 2000, groceries: 380, utilities: 160, transit: 62, carCost: 850,
    childcareInfant: 1300, childcarePreschool: 1050, healthSingle: 390, healthFamily: 1250,
  },
  pit: {
    name: 'Pittsburgh', state: 'PA', tier: 'Lower', localTax: 0.03,
    rent1: 1250, rent3: 1900, groceries: 380, utilities: 170, transit: 97, carCost: 850,
    childcareInfant: 1250, childcarePreschool: 1000, healthSingle: 390, healthFamily: 1240,
  },
  bham: {
    name: 'Birmingham', state: 'AL', tier: 'Lower', localTax: 0,
    rent1: 1100, rent3: 1700, groceries: 370, utilities: 180, transit: 0, carCost: 850,
    childcareInfant: 1100, childcarePreschool: 900, healthSingle: 390, healthFamily: 1230,
  },
  jxn: {
    name: 'Jackson', state: 'MS', tier: 'Lower', localTax: 0,
    rent1: 950, rent3: 1500, groceries: 360, utilities: 180, transit: 0, carCost: 800,
    childcareInfant: 950, childcarePreschool: 800, healthSingle: 390, healthFamily: 1220,
  },
  rural_ms: {
    name: 'Rural Mississippi', state: 'MS', tier: 'Very Low', localTax: 0,
    rent1: 700, rent3: 1100, groceries: 340, utilities: 170, transit: 0, carCost: 800,
    childcareInfant: 800, childcarePreschool: 650, healthSingle: 380, healthFamily: 1200,
  },
  rural_ia: {
    name: 'Rural Iowa', state: 'IA', tier: 'Very Low', localTax: 0,
    rent1: 800, rent3: 1300, groceries: 360, utilities: 180, transit: 0, carCost: 800,
    childcareInfant: 950, childcarePreschool: 800, healthSingle: 380, healthFamily: 1210,
  },
  rural_wy: {
    name: 'Rural Wyoming', state: 'WY', tier: 'Very Low', localTax: 0,
    rent1: 850, rent3: 1400, groceries: 380, utilities: 170, transit: 0, carCost: 850,
    childcareInfant: 950, childcarePreschool: 800, healthSingle: 380, healthFamily: 1210,
  },
};
