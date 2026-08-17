import { describe, expect, it } from 'vitest';
import { listingMatchesPreference } from '../src/services/scoring.js';

describe('listingMatchesPreference', () => {
  it('accepts listing that is in range', () => {
    const listing = {
      municipality: 'Time',
      price: 5000000,
      buildYear: 2015,
      bikeMinutesToVestly: 15,
      transitMinutesToJattavagen: 35
    };

    const preference = {
      minPrice: 3000000,
      maxPrice: 5500000,
      areas: JSON.stringify(['Time']),
      minBuildYear: 2010,
      maxBuildYear: 2025,
      maxBikeMinutes: 20,
      maxTransitMin: 45
    };

    expect(listingMatchesPreference(listing as never, preference as never)).toBe(true);
  });

  it('rejects listing outside municipality', () => {
    const listing = {
      municipality: 'Stavanger',
      price: 5000000,
      buildYear: 2015
    };

    const preference = {
      areas: JSON.stringify(['Time', 'Klepp'])
    };

    expect(listingMatchesPreference(listing as never, preference as never)).toBe(false);
  });
});
