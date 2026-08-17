import { JobStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { runAnalysisForListing } from './analysis.js';
import { estimateDistances } from './distance.js';

export async function enqueueJob(type: string, payload: Record<string, unknown>): Promise<void> {
  await prisma.job.create({
    data: {
      type,
      payloadJson: JSON.stringify(payload),
      status: JobStatus.QUEUED
    }
  });
}

export async function processNextJob(): Promise<boolean> {
  const job = await prisma.job.findFirst({
    where: { status: JobStatus.QUEUED },
    orderBy: { createdAt: 'asc' }
  });

  if (!job) {
    return false;
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { status: JobStatus.RUNNING, attempts: { increment: 1 } }
  });

  try {
    const payload = JSON.parse(job.payloadJson) as Record<string, unknown>;

    if (job.type === 'ANALYZE_MATCH') {
      const listingId = String(payload.listingId ?? '');
      const prospectusText = String(payload.prospectusText ?? '');
      await runAnalysisForListing(listingId, prospectusText);
    }

    if (job.type === 'COMPUTE_DISTANCES') {
      const listingId = String(payload.listingId ?? '');
      const lat = typeof payload.lat === 'number' ? payload.lat : undefined;
      const lng = typeof payload.lng === 'number' ? payload.lng : undefined;
      const distances = estimateDistances(lat, lng);
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          bikeMinutesToVestly: distances.bikeMinutesToVestly,
          transitMinutesToJattavagen: distances.transitMinutesToJattavagen,
          walkMinutesToGrocery: distances.walkMinutesToGrocery
        }
      });
    }

    await prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.DONE, lastError: null } });
    return true;
  } catch (error) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.FAILED, lastError: error instanceof Error ? error.message : 'Unknown worker error' }
    });
    return true;
  }
}
