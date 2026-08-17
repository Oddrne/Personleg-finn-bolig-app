import { prisma } from '../lib/prisma.js';

function extractConditionGrades(text: string): number[] {
  const matches = text.match(/TG\s*([0-3])/gi) ?? [];
  return matches
    .map((m) => Number.parseInt(m.replace(/[^0-3]/g, ''), 10))
    .filter((n) => Number.isInteger(n));
}

export async function runAnalysisForListing(listingId: string, prospectusText: string): Promise<void> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return;
  }

  const grades = extractConditionGrades(prospectusText);
  const avgGrade = grades.length > 0 ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 1.5;

  const fairValueEstimate = Math.round(listing.price * (1 - Math.max(0, avgGrade - 1) * 0.07));
  const valueScore = Math.max(0, Math.min(100, Math.round(100 - avgGrade * 22 + ((fairValueEstimate - listing.price) / listing.price) * 100)));

  const cautionPoints = [
    avgGrade >= 2 ? 'Høy andel TG2/TG3: be om kostnadsoverslag for utbedring.' : 'Moderat til god teknisk tilstand basert på rapporttekst.',
    'Sjekk drenering, våtrom og tak spesielt i visning.',
    'Verifiser nylige oppgraderinger med dokumentasjon.'
  ];

  const summary =
    fairValueEstimate >= listing.price
      ? 'Pris fremstår innenfor eller under estimert verdi gitt tilstandsgrad.'
      : 'Pris fremstår høy relativt til estimert verdi gitt tilstandsgrad.';

  await prisma.analysis.upsert({
    where: { listingId },
    update: {
      fairValueEstimate,
      valueScore,
      summary,
      cautionPointsJson: JSON.stringify(cautionPoints),
      conditionNotesJson: JSON.stringify({ avgGrade, gradesCount: grades.length })
    },
    create: {
      listingId,
      fairValueEstimate,
      valueScore,
      summary,
      cautionPointsJson: JSON.stringify(cautionPoints),
      conditionNotesJson: JSON.stringify({ avgGrade, gradesCount: grades.length })
    }
  });
}
