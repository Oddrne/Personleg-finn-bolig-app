import type { FastifyInstance } from 'fastify';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import { scrapeFinnHomes } from './services/finnScraper.js';
import { estimateDistances } from './services/distance.js';
import { enqueueJob } from './services/jobQueue.js';
import { explanationForListing, listingMatchesPreference } from './services/scoring.js';
import { renderDevTestToolHtml } from './services/devTestTool.js';
import { SwipeDecision, MatchStatus } from '@prisma/client';

const cache = new NodeCache({ stdTTL: 120 });

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ ok: true }));
  app.get('/dev/test-tool', async (_, reply) => {
    reply.type('text/html; charset=utf-8');
    return reply.send(renderDevTestToolHtml());
  });

  app.post('/users', async (request, reply) => {
    const schema = z.object({ name: z.string().min(2), email: z.string().email() });
    const body = schema.parse(request.body);

    const user = await prisma.user.create({ data: body });
    return reply.code(201).send(user);
  });

  app.post('/households', async (request, reply) => {
    const schema = z.object({ name: z.string(), userAId: z.string(), userBId: z.string() });
    const body = schema.parse(request.body);

    const household = await prisma.household.create({ data: body });
    return reply.code(201).send(household);
  });

  app.put('/users/:userId/preferences', async (request, reply) => {
    const params = z.object({ userId: z.string() }).parse(request.params);
    const body = z
      .object({
        minPrice: z.number().int().positive().optional(),
        maxPrice: z.number().int().positive().optional(),
        areas: z.array(z.string()).optional(),
        minBuildYear: z.number().int().optional(),
        maxBuildYear: z.number().int().optional(),
        maxBikeMinutes: z.number().int().optional(),
        maxTransitMin: z.number().int().optional(),
        freeText: z.string().optional(),
        weights: z.record(z.string(), z.number()).optional()
      })
      .parse(request.body);

    const prefData = {
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      areas: JSON.stringify(body.areas ?? []),
      minBuildYear: body.minBuildYear,
      maxBuildYear: body.maxBuildYear,
      maxBikeMinutes: body.maxBikeMinutes,
      maxTransitMin: body.maxTransitMin,
      freeText: body.freeText,
      weightConfigJson: JSON.stringify(body.weights ?? {})
    };

    const pref = await prisma.preference.upsert({
      where: { userId: params.userId },
      update: prefData,
      create: {
        userId: params.userId,
        ...prefData
      }
    });

    return reply.send(pref);
  });

  app.post('/ingestion/run', async (_, reply) => {
    const fetchFromFinn = process.env.FETCH_FROM_FINN !== 'false';
    const listings = await scrapeFinnHomes(fetchFromFinn);

    const saved = await Promise.all(
      listings.map(async (listing) => {
        const distances = estimateDistances(listing.lat, listing.lng);
        const record = await prisma.listing.upsert({
          where: { finnId: listing.finnId },
          update: {
            title: listing.title,
            url: listing.url,
            municipality: listing.municipality,
            price: listing.price,
            buildYear: listing.buildYear,
            lat: listing.lat,
            lng: listing.lng,
            bikeMinutesToVestly: distances.bikeMinutesToVestly,
            transitMinutesToJattavagen: distances.transitMinutesToJattavagen,
            walkMinutesToGrocery: distances.walkMinutesToGrocery,
            rawJson: JSON.stringify(listing.raw)
          },
          create: {
            finnId: listing.finnId,
            title: listing.title,
            url: listing.url,
            municipality: listing.municipality,
            price: listing.price,
            buildYear: listing.buildYear,
            lat: listing.lat,
            lng: listing.lng,
            bikeMinutesToVestly: distances.bikeMinutesToVestly,
            transitMinutesToJattavagen: distances.transitMinutesToJattavagen,
            walkMinutesToGrocery: distances.walkMinutesToGrocery,
            rawJson: JSON.stringify(listing.raw)
          }
        });
        await enqueueJob('COMPUTE_DISTANCES', { listingId: record.id, lat: listing.lat, lng: listing.lng });
        return record;
      })
    );

    cache.flushAll();
    return reply.send({ count: saved.length });
  });

  app.get('/listings', async (request, reply) => {
    const query = z.object({ userId: z.string() }).parse(request.query);
    const cacheKey = `listings:${query.userId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return reply.send(cached);
    }

    const [preference, listings, swipes] = await Promise.all([
      prisma.preference.findUnique({ where: { userId: query.userId } }),
      prisma.listing.findMany({ orderBy: { updatedAt: 'desc' }, take: 200 }),
      prisma.swipe.findMany({ where: { userId: query.userId }, select: { listingId: true } })
    ]);

    const seen = new Set(swipes.map((s) => s.listingId));

    const filtered = listings
      .filter((listing) => !seen.has(listing.id))
      .filter((listing) => listingMatchesPreference(listing, preference))
      .map((listing) => ({
        ...listing,
        explanation: explanationForListing(listing, preference)
      }));

    cache.set(cacheKey, filtered);
    return reply.send(filtered);
  });

  app.post('/swipes', async (request, reply) => {
    const body = z
      .object({
        userId: z.string(),
        householdId: z.string(),
        listingId: z.string(),
        decision: z.enum([SwipeDecision.LIKE, SwipeDecision.DISLIKE])
      })
      .parse(request.body);

    const swipe = await prisma.swipe.upsert({
      where: { userId_listingId: { userId: body.userId, listingId: body.listingId } },
      update: { decision: body.decision },
      create: { userId: body.userId, listingId: body.listingId, decision: body.decision }
    });

    if (body.decision === SwipeDecision.LIKE) {
      const household = await prisma.household.findUnique({ where: { id: body.householdId } });
      if (household) {
        const otherUserId = household.userAId === body.userId ? household.userBId : household.userAId;
        const otherSwipe = await prisma.swipe.findUnique({
          where: { userId_listingId: { userId: otherUserId, listingId: body.listingId } }
        });

        if (otherSwipe?.decision === SwipeDecision.LIKE) {
          await prisma.match.upsert({
            where: { householdId_listingId: { householdId: body.householdId, listingId: body.listingId } },
            create: { householdId: body.householdId, listingId: body.listingId, status: MatchStatus.PENDING_ANALYSIS },
            update: {}
          });

          await prisma.notification.createMany({
            data: [
              { userId: body.userId, type: 'MATCH', message: 'Dere matchet på en bolig.' },
              { userId: otherUserId, type: 'MATCH', message: 'Dere matchet på en bolig.' }
            ]
          });
        }
      }
    }

    cache.flushAll();
    return reply.code(201).send(swipe);
  });

  app.post('/matches/:matchId/prospectus', async (request, reply) => {
    const params = z.object({ matchId: z.string() }).parse(request.params);
    const body = z.object({ prospectusText: z.string().min(50) }).parse(request.body);

    const match = await prisma.match.findUnique({ where: { id: params.matchId } });
    if (!match) {
      return reply.code(404).send({ error: 'Match not found' });
    }

    await enqueueJob('ANALYZE_MATCH', { listingId: match.listingId, prospectusText: body.prospectusText });
    await prisma.match.update({ where: { id: params.matchId }, data: { status: MatchStatus.ANALYZED } });

    return reply.send({ queued: true });
  });

  app.get('/matches/:householdId', async (request, reply) => {
    const params = z.object({ householdId: z.string() }).parse(request.params);
    const matches = await prisma.match.findMany({
      where: { householdId: params.householdId },
      include: {
        listing: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const listingIds = matches.map((m) => m.listingId);
    const analyses = await prisma.analysis.findMany({ where: { listingId: { in: listingIds } } });
    const byListing = new Map(analyses.map((a) => [a.listingId, a]));

    return reply.send(
      matches.map((m) => ({
        ...m,
        analysis: byListing.get(m.listingId)
          ? {
              ...byListing.get(m.listingId),
              cautionPoints: JSON.parse(byListing.get(m.listingId)?.cautionPointsJson ?? '[]'),
              conditionNotes: JSON.parse(byListing.get(m.listingId)?.conditionNotesJson ?? '{}')
            }
          : null
      }))
    );
  });

  app.post('/favorites', async (request, reply) => {
    const body = z.object({ userId: z.string(), listingId: z.string() }).parse(request.body);
    const favorite = await prisma.favorite.upsert({
      where: { userId_listingId: body },
      update: {},
      create: body
    });
    return reply.code(201).send(favorite);
  });

  app.get('/history/:userId', async (request, reply) => {
    const params = z.object({ userId: z.string() }).parse(request.params);
    const swipes = await prisma.swipe.findMany({
      where: { userId: params.userId },
      include: { listing: true },
      orderBy: { createdAt: 'desc' }
    });
    return reply.send(swipes);
  });

  app.get('/notifications/:userId', async (request, reply) => {
    const params = z.object({ userId: z.string() }).parse(request.params);
    const notifications = await prisma.notification.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' }
    });
    return reply.send(notifications);
  });

  app.get('/metrics', async () => {
    const [users, listings, swipes, matches, jobs] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.swipe.count(),
      prisma.match.count(),
      prisma.job.count()
    ]);

    return {
      users,
      listings,
      swipes,
      matches,
      jobs
    };
  });
}
