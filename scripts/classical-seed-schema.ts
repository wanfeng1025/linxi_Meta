import { z } from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);
const gitBlobSha1Schema = z.string().regex(/^[a-f0-9]{40}$/i);

export const kanripoClassicalSeedManifestSchema = z
  .object({
    schemaVersion: z.literal('kanripo-zhouyi-transcription-seed-v1'),
    collectionStatus: z.literal('production_candidate'),
    publicationEligible: z.literal(false),
    collectedAt: z.string().datetime({ offset: true }),
    source: z
      .object({
        repository: z.literal('https://github.com/Kanripo/KR1a0001'),
        repositoryCommit: gitBlobSha1Schema,
        textPageUrl: z.literal('https://www.kanripo.org/text/KR1a0001/'),
        sourceRole: z.literal('TRANSCRIPTION_SEED'),
        verificationBase: z.literal('RUAN_1815_ZJLIB'),
        licenseStatus: z.literal('CC-BY-SA-4.0'),
        licenseUrl: z.literal('https://creativecommons.org/licenses/by-sa/4.0/'),
        attribution: z.literal('Kanseki Repository / Kanripo'),
        requiredReview: z.string().min(1),
      })
      .strict(),
    expectedFileCount: z.literal(69),
    files: z
      .array(
        z
          .object({
            path: z.string().regex(/^files\/KR1a0001_\d{3}\.txt$/),
            sourceUrl: z.string().url(),
            gitBlobSha1: gitBlobSha1Schema,
            sha256: sha256Schema,
            byteCount: z.number().int().positive(),
          })
          .strict(),
      )
      .length(69),
    collectionSha256: sha256Schema,
  })
  .strict();

export type KanripoClassicalSeedManifest = z.infer<typeof kanripoClassicalSeedManifestSchema>;
