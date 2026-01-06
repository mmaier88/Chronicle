import { SceneFingerprint, STATE_CONSTANTS } from './state.js';

/**
 * Common English stopwords for text normalization
 */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then'
]);

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Remove punctuation
 * - Remove stopwords
 * - Split into tokens
 */
export function normalizeText(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(' ').filter(token =>
    token.length > 2 && !STOPWORDS.has(token)
  );

  return new Set(tokens);
}

/**
 * Calculate Jaccard similarity between two token sets
 * Returns value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Check if two new_information fields are semantically duplicate
 */
export function isInformationDuplicate(
  info1: string,
  info2: string,
  threshold: number = STATE_CONSTANTS.JACCARD_DUPLICATE_THRESHOLD
): boolean {
  const tokens1 = normalizeText(info1);
  const tokens2 = normalizeText(info2);
  return jaccardSimilarity(tokens1, tokens2) > threshold;
}

/**
 * Redundancy check result
 */
export interface RedundancyCheckResult {
  is_redundant: boolean;
  reason: string | null;
  suggestion: string | null;
}

/**
 * Check if a new fingerprint is redundant given recent fingerprints
 *
 * Redundancy rules:
 * 1. Same narrative_function as last scene AND escalation_delta <= 0.1 AND same new_information
 * 2. new_information duplicates any recent new_information (Jaccard > 0.65)
 * 3. motifs_used repeats without adding consequence (motif spam)
 */
export function checkRedundancy(
  newFingerprint: SceneFingerprint,
  recentFingerprints: SceneFingerprint[]
): RedundancyCheckResult {
  if (recentFingerprints.length === 0) {
    return { is_redundant: false, reason: null, suggestion: null };
  }

  const lastFingerprint = recentFingerprints[recentFingerprints.length - 1];

  // Rule 1: Same function as last scene with low escalation
  if (
    newFingerprint.narrative_function === lastFingerprint.narrative_function &&
    newFingerprint.escalation_delta <= 0.1
  ) {
    const infoMatch = isInformationDuplicate(
      newFingerprint.new_information,
      lastFingerprint.new_information
    );

    if (infoMatch) {
      return {
        is_redundant: true,
        reason: `Same narrative function (${newFingerprint.narrative_function}) with no escalation and duplicate information`,
        suggestion: `Change narrative function to something other than ${newFingerprint.narrative_function}, or add significant escalation, or reveal genuinely new information`
      };
    }
  }

  // Rule 2: Duplicate new_information
  for (const recent of recentFingerprints) {
    if (isInformationDuplicate(newFingerprint.new_information, recent.new_information)) {
      return {
        is_redundant: true,
        reason: `new_information too similar to scene ${recent.scene_id}`,
        suggestion: `Must reveal genuinely new information that reader doesn't already know`
      };
    }
  }

  // Rule 3: Motif spam (using same motifs without consequence)
  if (newFingerprint.motifs_used.length > 0 && !newFingerprint.consequence_introduced) {
    const recentMotifs = new Set(recentFingerprints.slice(-5).flatMap(f => f.motifs_used));
    const repeatedMotifs = newFingerprint.motifs_used.filter(m => recentMotifs.has(m));

    if (repeatedMotifs.length >= 2) {
      return {
        is_redundant: true,
        reason: `Motif spam: reusing motifs [${repeatedMotifs.join(', ')}] without introducing consequence`,
        suggestion: `Either introduce a consequence for the motif usage, or use different imagery`
      };
    }
  }

  return { is_redundant: false, reason: null, suggestion: null };
}

/**
 * Check motif density within the fingerprint window
 * Returns issues if motifs are overused (>6 per 1000 words approximated)
 */
export function checkMotifDensity(
  recentFingerprints: SceneFingerprint[],
  estimatedWordsPerScene: number = 1500
): { overused_motifs: string[]; suggestion: string } | null {
  const motifCounts = new Map<string, number>();

  for (const fp of recentFingerprints) {
    for (const motif of fp.motifs_used) {
      motifCounts.set(motif, (motifCounts.get(motif) || 0) + 1);
    }
  }

  const totalWords = recentFingerprints.length * estimatedWordsPerScene;
  const per1000Words = 1000 / totalWords;

  const overused: string[] = [];
  for (const [motif, count] of motifCounts) {
    const density = count * per1000Words;
    if (density > 6) {
      overused.push(motif);
    }
  }

  if (overused.length > 0) {
    return {
      overused_motifs: overused,
      suggestion: `Motifs [${overused.join(', ')}] are overused. Let them rest for several scenes before reusing.`
    };
  }

  return null;
}

/**
 * Trim fingerprint window to size limit
 */
export function trimFingerprintWindow(
  fingerprints: SceneFingerprint[],
  maxSize: number = STATE_CONSTANTS.FINGERPRINT_WINDOW_SIZE
): SceneFingerprint[] {
  if (fingerprints.length <= maxSize) {
    return fingerprints;
  }
  return fingerprints.slice(-maxSize);
}

/**
 * Generate a unique scene ID
 */
export function generateSceneId(
  actIndex: number,
  chapterIndex: number,
  sceneIndex: number
): string {
  return `a${actIndex}_c${chapterIndex}_s${sceneIndex}_${Date.now().toString(36)}`;
}
