export type ListingFilter = {
  minPrice?: number;
  maxPrice?: number;
  areas?: string[];
  minBuildYear?: number;
  maxBuildYear?: number;
  maxBikeMinutes?: number;
  maxTransitMin?: number;
  freeText?: string;
};

export type WeightConfig = {
  priceWeight?: number;
  distanceWeight?: number;
  freeTextWeight?: number;
};
