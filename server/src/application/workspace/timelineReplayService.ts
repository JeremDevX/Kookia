import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { buildTimelineReplay, timelineReplaySchema } from "./timelineReplayContract.js";

const replayKind = (id: string) => `timeline-replay:v1:${id}`;
type ReplayDocument = { data: Prisma.JsonValue; revision: number; updatedAt: Date };

function replayDto(document: ReplayDocument) {
  const replay = timelineReplaySchema.safeParse(document.data);
  if (!replay.success) throw new WorkspaceError(409, "INVALID_TIMELINE_REPLAY", "Le bac de rejeu est illisible.");
  return { ...replay.data, revision: document.revision, updatedAt: document.updatedAt.toISOString() };
}

export async function createTimelineReplay(restaurantId: string, decisionId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const kind = replayKind(decisionId);
    const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
    if (existing) {
      const replay = replayDto(existing);
      if (replay.sourceDecisionId !== decisionId)
        throw new WorkspaceError(409, "TIMELINE_REPLAY_OPERATION_CONFLICT", "Cette reprise a déjà été utilisée pour une autre décision.");
      return replay;
    }

    const decision = await tx.recommendationDecision.findFirst({ where: { id: decisionId, restaurantId } });
    if (!decision) throw new WorkspaceError(404, "TIMELINE_DECISION_NOT_FOUND", "Décision introuvable dans cet espace.");
    const replay = buildTimelineReplay({ id: decisionId, decisionId, decision: decision.decision,
      createdAt: decision.createdAt, snapshot: decision.snapshot });
    if (!replay) throw new WorkspaceError(409, "TIMELINE_DECISION_NOT_REPLAYABLE", "Cette décision ne contient pas d’instantané de suggestion rejouable.");
    const document = await tx.workspaceDocument.create({ data: { restaurantId, kind, revision: 1,
      data: JSON.parse(JSON.stringify(replay)) as Prisma.InputJsonValue } });
    return replayDto(document);
  });
}

export async function getTimelineReplay(restaurantId: string, id: string) {
  const document = await prisma.workspaceDocument.findUnique({
    where: { restaurantId_kind: { restaurantId, kind: replayKind(id) } },
  });
  if (!document) throw new WorkspaceError(404, "TIMELINE_REPLAY_NOT_FOUND", "Bac de rejeu introuvable dans cet espace.");
  return replayDto(document);
}
