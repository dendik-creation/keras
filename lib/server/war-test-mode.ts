/** Test War Mode — simulate the university KRS portal instead of hitting it for real. */
export const isWarTestMode = (): boolean => process.env.WAR_TEST_MODE === "true";

/** Optional deterministic seed for the simulator's PRNG. */
export const getWarTestSeed = (): number | undefined => {
  const raw = process.env.WAR_TEST_SEED;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export type WarTestOutcome =
  | "success"
  | "class_full"
  | "time_conflict"
  | "server_busy"
  | "network_timeout";

export type WarTestProbabilities = Record<WarTestOutcome, number>;

const DEFAULT_PROBABILITIES: WarTestProbabilities = {
  success: 0.65,
  class_full: 0.15,
  time_conflict: 0.1,
  server_busy: 0.05,
  network_timeout: 0.05,
};

/** Reads WAR_TEST_PROBABILITIES (JSON) if set, else falls back to the task's example split. */
export const getWarTestProbabilities = (): WarTestProbabilities => {
  const raw = process.env.WAR_TEST_PROBABILITIES;
  if (!raw) return DEFAULT_PROBABILITIES;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROBABILITIES, ...parsed };
  } catch {
    return DEFAULT_PROBABILITIES;
  }
};
