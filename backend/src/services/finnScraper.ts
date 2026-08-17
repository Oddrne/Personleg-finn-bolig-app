import * as cheerio from 'cheerio';

export type ScrapedListing = {
  finnId: string;
  title: string;
  url: string;
  municipality: string;
  price: number;
  buildYear?: number;
  lat?: number;
  lng?: number;
  raw: Record<string, unknown>;
};

const allowedMunicipalities = new Set(['Time', 'Klepp', 'Hå']);

function parsePrice(text: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  return Number.parseInt(digits || '0', 10);
}

function parseBuildYear(text: string): number | undefined {
  const yearMatch = text.match(/(19|20)\d{2}/);
  if (!yearMatch) {
    return undefined;
  }
  return Number.parseInt(yearMatch[0], 10);
}

export async function scrapeFinnHomes(fetchFromFinn = true): Promise<ScrapedListing[]> {
  if (!fetchFromFinn) {
    return fallbackListings();
  }

  const response = await fetch('https://www.finn.no/realestate/homes/search.html?location=1.20001.22011&location=1.20001.22014&location=1.20001.22015');
  if (!response.ok) {
    return fallbackListings();
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const results: ScrapedListing[] = [];
  $('article').each((_, article) => {
    const title = $(article).find('h2, h3').first().text().trim();
    const href = $(article).find('a').first().attr('href') || '';
    if (!href.includes('finnkode=')) {
      return;
    }
    const finnkode = href.match(/finnkode=(\d+)/)?.[1];
    if (!finnkode) {
      return;
    }
    const bodyText = $(article).text();
    const municipality = ['Time', 'Klepp', 'Hå'].find((name) => bodyText.includes(name)) ?? 'Ukjent';
    if (!allowedMunicipalities.has(municipality)) {
      return;
    }

    const absoluteUrl = href.startsWith('http') ? href : `https://www.finn.no${href}`;
    const price = parsePrice(bodyText);

    results.push({
      finnId: finnkode,
      title,
      url: absoluteUrl,
      municipality,
      price,
      buildYear: parseBuildYear(bodyText),
      raw: { teaser: bodyText.slice(0, 500) }
    });
  });

  if (results.length === 0) {
    return fallbackListings();
  }

  return results;
}

function fallbackListings(): ScrapedListing[] {
  return [
    {
      finnId: '00000001',
      title: 'Enebolig i Time med hage',
      url: 'https://www.finn.no/realestate/homes/ad.html?finnkode=00000001',
      municipality: 'Time',
      price: 5200000,
      buildYear: 2016,
      lat: 58.73,
      lng: 5.64,
      raw: { source: 'fallback' }
    },
    {
      finnId: '00000002',
      title: 'Rekkehus i Klepp nær sentrum',
      url: 'https://www.finn.no/realestate/homes/ad.html?finnkode=00000002',
      municipality: 'Klepp',
      price: 4300000,
      buildYear: 2011,
      lat: 58.78,
      lng: 5.63,
      raw: { source: 'fallback' }
    }
  ];
}
