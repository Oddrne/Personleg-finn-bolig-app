const VESTLY = { lat: 58.74678, lng: 5.7058 };
const SOPRA_JATTAVAGEN = { lat: 58.92979, lng: 5.74513 };

const groceryCandidates = [
  { name: 'Kiwi Bryne', lat: 58.7355, lng: 5.6477 },
  { name: 'Rema 1000 Kleppe', lat: 58.7806, lng: 5.6302 },
  { name: 'Coop Extra Nærbø', lat: 58.6658, lng: 5.6376 }
];

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

export function estimateDistances(lat?: number | null, lng?: number | null): {
  bikeMinutesToVestly?: number;
  transitMinutesToJattavagen?: number;
  walkMinutesToGrocery?: number;
  nearestGrocery?: string;
} {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return {};
  }

  const source = { lat, lng };
  const bikeKm = haversineKm(source, VESTLY) * 1.25;
  const transitKm = haversineKm(source, SOPRA_JATTAVAGEN) * 1.45;

  const grocery = groceryCandidates
    .map((candidate) => ({
      ...candidate,
      km: haversineKm(source, candidate)
    }))
    .sort((a, b) => a.km - b.km)[0];

  return {
    bikeMinutesToVestly: Math.round((bikeKm / 15) * 60),
    transitMinutesToJattavagen: Math.round((transitKm / 30) * 60 + 8),
    walkMinutesToGrocery: Math.round((grocery.km / 5) * 60),
    nearestGrocery: grocery.name
  };
}
