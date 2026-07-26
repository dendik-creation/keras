import type { AiPreference, CourseWithSemester } from "@/modules/schedule-ai/schedule-ai.types";
import {
  classObjectives,
  compareScheduleMetrics,
  computeScheduleMetrics,
  coursesOverlap,
  targetSksFor,
  type ScheduleMetrics,
} from "@/modules/schedule-ai/schedule-ai.scoring";

/**
 * The deterministic decision engine — the only piece of the pipeline that
 * ever produces a final schedule (see schedule-ai.service.ts). It walks the
 * same lexicographic priority hierarchy (schedule-ai.scoring.ts
 * compareScheduleMetrics) whether or not an AI ranking is available, so
 * "no AI" and "AI unavailable" degrade gracefully instead of falling back to
 * a different, weaker algorithm.
 */

const CALL_BUDGET = 300_000;

export type OptimizerStats = {
  branchesExplored: number;
  branchesPruned: number;
  bestUpdates: number;
};

export type OptimizerResult = {
  courses: CourseWithSemester[];
  metrics: ScheduleMetrics;
  stats: OptimizerStats;
};

function groupByCourse(courses: CourseWithSemester[]): CourseWithSemester[][] {
  const map = new Map<string, CourseWithSemester[]>();
  for (const course of courses) {
    const bucket = map.get(course.code);
    if (bucket) bucket.push(course);
    else map.set(course.code, [course]);
  }
  return Array.from(map.values());
}

/**
 * Branch-and-bound greedy backtracking scheduler.
 *
 * `aiRank` is the optional AI preference ordering (schedule_id -> rank
 * position, lower = more preferred) from the ranking-only AI call — it only
 * ever moves search order and the lowest-priority tie-break, never the
 * actual layer-1..8 decision (schedule-ai.scoring.ts compareScheduleMetrics
 * is unconditionally what decides the winner).
 *
 * Three things make this different from a plain exhaustive DFS:
 *  1. A deterministic greedy seed is built first (best-ordered class per
 *     group, preferred-semester groups first) and used as the initial
 *     `best`. This guarantees a real floor — even if the call budget runs
 *     out before backtracking explores anything, the result is never a
 *     near-empty schedule, just whatever the seed reached.
 *  2. Groups are visited preferred-semester-first, so the search converges
 *     on high-semester-coverage, high-SKS combinations early — which then
 *     lets bound #3 prune aggressively for the rest of the run.
 *  3. Branch-and-bound: before descending into a group, compare the
 *     best-case achievable semester coverage + SKS from here on (an
 *     overestimate that ignores overlap) against the current best. If even
 *     that best case can't tie or beat it, the whole subtree is skipped.
 */
export function runGreedyBacktrackOptimizer(
  courses: CourseWithSemester[],
  preference: AiPreference,
  aiRank?: Map<string, number>,
): OptimizerResult {
  const targetSks = targetSksFor(preference);

  const dayFrequency = new Map<string, number>();
  for (const course of courses) {
    dayFrequency.set(course.day, (dayFrequency.get(course.day) ?? 0) + 1);
  }

  const rankOf = (course: CourseWithSemester): number =>
    aiRank ? (aiRank.get(course.schedule_id) ?? aiRank.size) : 0;

  const groupsRaw = groupByCourse(courses).map((classes) => ({
    isPreferredSemester: preference.preferred_semester
      ? classes[0].semester === preference.preferred_semester
      : false,
    classes: classes
      .map((course) => ({
        course,
        obj: classObjectives(course, preference),
        dayShare: dayFrequency.get(course.day) ?? 0,
        sks: Number(course.sks) || 0,
      }))
      .sort((a, b) => {
        if (aiRank) {
          const ra = rankOf(a.course);
          const rb = rankOf(b.course);
          if (ra !== rb) return ra - rb;
        }
        // Greedy-seed order: max SKS first (drives the credits-maximizing floor), then the same shape/preference heuristics as before.
        if (a.sks !== b.sks) return b.sks - a.sks;
        if (a.dayShare !== b.dayShare) return b.dayShare - a.dayShare;
        if (a.obj.timeFit !== b.obj.timeFit) return a.obj.timeFit - b.obj.timeFit;
        if (a.obj.lecturerMatch !== b.obj.lecturerMatch) return b.obj.lecturerMatch - a.obj.lecturerMatch;
        return b.obj.courseMatch - a.obj.courseMatch;
      }),
  }));

  // Preferred-semester groups first — the comparator alone already guarantees the *result* maximizes semester coverage, this ordering just gets a strong candidate (and therefore a tight prune bound) early.
  const groups = [
    ...groupsRaw.filter((g) => g.isPreferredSemester),
    ...groupsRaw.filter((g) => !g.isPreferredSemester),
  ];

  const maxSksInGroup = groups.map((g) =>
    g.classes.length ? Math.max(...g.classes.map((c) => c.sks)) : 0,
  );

  // Suffix upper bounds for pruning: best-case additional semester matches / SKS achievable from index onward, ignoring overlap (dropping a constraint can only raise the ceiling, so this stays a valid overestimate).
  const suffixMaxSemesterMatch = new Array<number>(groups.length + 1).fill(0);
  const suffixMaxSks = new Array<number>(groups.length + 1).fill(0);
  for (let i = groups.length - 1; i >= 0; i--) {
    suffixMaxSemesterMatch[i] = suffixMaxSemesterMatch[i + 1] + (groups[i].isPreferredSemester ? 1 : 0);
    suffixMaxSks[i] = suffixMaxSks[i + 1] + maxSksInGroup[i];
  }

  function buildGreedySeed(): CourseWithSemester[] {
    const chosen: CourseWithSemester[] = [];
    let usedSks = 0;
    for (const group of groups) {
      for (const { course, sks } of group.classes) {
        if (usedSks + sks > targetSks) continue;
        if (chosen.some((c) => coursesOverlap(c, course))) continue;
        chosen.push(course);
        usedSks += sks;
        break;
      }
    }
    return chosen;
  }

  const seed = buildGreedySeed();
  let best = seed;
  let bestMetrics: ScheduleMetrics | null = seed.length > 0 ? computeScheduleMetrics(seed, preference, aiRank) : null;

  const stats: OptimizerStats = {
    branchesExplored: 0,
    branchesPruned: 0,
    bestUpdates: bestMetrics ? 1 : 0,
  };

  let callBudget = CALL_BUDGET;

  function canBeatBest(index: number, semesterMatchSoFar: number, usedSks: number): boolean {
    if (bestMetrics === null) return true;
    const potentialSemester = semesterMatchSoFar + suffixMaxSemesterMatch[index];
    if (potentialSemester > bestMetrics.semesterMatchCount) return true;
    if (potentialSemester < bestMetrics.semesterMatchCount) return false;
    const potentialSks = usedSks + suffixMaxSks[index];
    if (potentialSks > bestMetrics.totalSks) return true;
    if (potentialSks < bestMetrics.totalSks) return false;
    // Tied on both leading layers — the bound can't see far enough to prune safely, keep exploring.
    return true;
  }

  function backtrack(
    index: number,
    chosen: CourseWithSemester[],
    usedSks: number,
    semesterMatchSoFar: number,
  ) {
    if (callBudget-- <= 0) return;
    stats.branchesExplored++;

    if (chosen.length > 0) {
      const metrics = computeScheduleMetrics(chosen, preference, aiRank);
      // On a tie, prefer the fuller schedule — otherwise the very first
      // single-course branch "wins" forever whenever nothing distinguishes
      // it, and every later, more-complete combination gets skipped just
      // for not comparing strictly better.
      const cmp = bestMetrics === null ? -1 : compareScheduleMetrics(metrics, bestMetrics, preference);
      if (cmp < 0 || (cmp === 0 && chosen.length > best.length)) {
        bestMetrics = metrics;
        best = [...chosen];
        stats.bestUpdates++;
      }
    }

    if (index >= groups.length) return;
    if (!canBeatBest(index, semesterMatchSoFar, usedSks)) {
      stats.branchesPruned++;
      return;
    }

    for (const { course, sks, obj } of groups[index].classes) {
      if (usedSks + sks > targetSks) continue;
      if (chosen.some((c) => coursesOverlap(c, course))) continue;

      chosen.push(course);
      backtrack(index + 1, chosen, usedSks + sks, semesterMatchSoFar + obj.semesterMatch);
      chosen.pop();
    }

    // Skip this course entirely — always a valid branch, mirrors "return fewer courses" in the prompt.
    backtrack(index + 1, chosen, usedSks, semesterMatchSoFar);
  }

  backtrack(0, [], 0, 0);

  return {
    courses: best,
    metrics: bestMetrics ?? computeScheduleMetrics([], preference, aiRank),
    stats,
  };
}
