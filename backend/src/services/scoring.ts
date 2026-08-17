import type { Listing, Preference } from '@prisma/client';

function safeParseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string');
    }
  } catch {
    return [];
  }
  return [];
}

export function listingMatchesPreference(listing: Listing, preference?: Preference | null): boolean {
  if (!preference) {
    return true;
  }

  const areas = safeParseStringArray(preference.areas);
  if (preference.minPrice && listing.price < preference.minPrice) return false;
  if (preference.maxPrice && listing.price > preference.maxPrice) return false;
  if (areas.length > 0 && !areas.includes(listing.municipality)) return false;
  if (preference.minBuildYear && (listing.buildYear ?? 0) < preference.minBuildYear) return false;
  if (preference.maxBuildYear && (listing.buildYear ?? 9999) > preference.maxBuildYear) return false;
  if (preference.maxBikeMinutes && (listing.bikeMinutesToVestly ?? 999) > preference.maxBikeMinutes) return false;
  if (preference.maxTransitMin && (listing.transitMinutesToJattavagen ?? 999) > preference.maxTransitMin) return false;

  return true;
}

export function explanationForListing(listing: Listing, preference?: Preference | null): string {
  const reasons: string[] = [];

  if (!preference) {
    return 'Ingen preferanser satt ennå.';
  }

  if (preference.maxPrice && listing.price <= preference.maxPrice) {
    reasons.push('Innenfor prisramme');
  }
  if (preference.minBuildYear && (listing.buildYear ?? 0) >= preference.minBuildYear) {
    reasons.push('Oppfyller minimum byggeår');
  }
  if (preference.maxBikeMinutes && (listing.bikeMinutesToVestly ?? 999) <= preference.maxBikeMinutes) {
    reasons.push('Akseptabel sykkelavstand til Vestly');
  }
  if (preference.maxTransitMin && (listing.transitMinutesToJattavagen ?? 999) <= preference.maxTransitMin) {
    reasons.push('Akseptabel kollektivtid til Jåttåvågen');
  }
  if (preference.freeText && listing.title.toLowerCase().includes(preference.freeText.toLowerCase().split(' ')[0] ?? '')) {
    reasons.push('Matcher fritekstpreferanse');
  }

  if (reasons.length === 0) {
    return 'Boligen passer delvis, men avviker på noen preferanser.';
  }

  return reasons.join('. ');
}
