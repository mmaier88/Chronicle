/**
 * Last 10% Literary Polish Pipeline
 *
 * Multi-pass editorial refinement to transform "very good AI prose"
 * into "publishable, unmistakably human" writing.
 */

// =============================================================================
// GLOBAL HARD RULES
// =============================================================================

export const GLOBAL_RULES = `## GLOBAL HARD RULES (Must Apply)

**G1 — Don't name the theme**
If a sentence explicitly labels the theme, CUT IT or rewrite into image/action.
- KILL: "Love disguised as surveillance"
- KILL: "This was control, not protection"
- KILL: "She realized that..."
- KILL: "It wasn't X. It was Y."
Maximum allowed: 1 theme-label per 1,200 words.

**G2 — Reduce crafted aphorisms**
Flag lines that read like TED talk taglines:
- "The problem is..."
- "What if... all along?"
- "This is what we fear most..."
- "X isn't Y, it's Z."
Replace 70% with: contradiction, sensory beat, awkwardness, interruption, miscommunication.

**G3 — Add controlled messiness**
Every main character must show at least one of:
- Petty impulse
- Defensive lie
- Misread of the other person
- Unflattering reaction (snapping, avoidance, jealousy, rationalization)
Target: 2-4 "mess beats" per 2,500-4,000 words.

**G4 — Trim 10-15% without losing meaning**
Cut via:
- Removing reiteration
- Compressing internal explanation
- Tightening dialogue around subtext
Do NOT cut: plot-critical info, character-defining gestures, anchor sensory details.`

// =============================================================================
// DETECTION HEURISTICS (SMELL PASS)
// =============================================================================

export const SMELL_PASS_PROMPT = `## SMELL PASS — Detection Heuristics

Scan the text and mentally flag these patterns:

**H1 — Theme-label sentences**
- "X disguised as Y"
- "It wasn't A. It was B."
- "She realized/understood that..."
- Any sentence that TELLS the theme instead of SHOWING it

**H2 — Over-clean metaphor chains**
- 3+ metaphors in a row
- Metaphors that "resolve" too neatly
- Poetic parallelism that feels crafted

**H3 — Character coherence problem**
Flag any character who is:
- Always calm
- Always reasonable
- Always emotionally fluent
- Never petty, defensive, or wrong
These need small human flaws injected.

**H4 — Duplicate setup paragraphs**
If a paragraph restates the same emotion from the previous 1-2 paragraphs, mark for cutting or merging.

**H5 — Motif overuse**
Count occurrences of repeated imagery (key/door/lock/walls/vision/seeing).
If any motif exceeds 6 per 1,000 words, vary language or remove instances.`

// =============================================================================
// 7-PASS EDITORIAL PIPELINE
// =============================================================================

export const PASS_1_STRUCTURAL = `## PASS 1 — Structural Tightening (Macro)

Goal: Remove repetition, improve scene momentum.

For each scene:
1. Identify the TURN (what changes)
2. Cut anything before the turn that isn't absolutely needed
3. Ensure scene ends on ONE of:
   - Physical action
   - Unanswered question
   - Sensory image
   - Conflict escalation
4. NEVER end on "moral landing" or realization

Cut aggressively. If a paragraph doesn't advance plot or deepen character, it goes.`

export const PASS_2_LINE_RESTRAINT = `## PASS 2 — Line Restraint (Micro)

Goal: Remove "writerly sheen" that reads AI-crafted.

For each paragraph:
1. Find the most "crafted" sentence (symmetrical, poetic, quotable)
2. Do ONE of:
   - Cut it entirely
   - Roughen it (less symmetrical, less poetic)
   - Replace with image/action

Apply to at least 40% of paragraphs.

BEFORE: "The silence between them held more weight than any words could carry."
AFTER: "Neither spoke. She picked at a thread on her sleeve."`

export const PASS_3_DIALOGUE = `## PASS 3 — Dialogue Subtext & Misfires

Goal: Make dialogue less perfect, more human.

For every conversation:
1. Annotate (mentally) each speaker's hidden agenda
2. Add at least ONE of:
   - Interruption ("But—" "I know what you're—")
   - Hedging ("I mean, sort of. Not exactly.")
   - Wrong assumption
   - Joke that lands badly
   - Evasive "fine" that clearly isn't
3. Insert physical action DURING dialogue:
   - Hands doing something
   - Eyes looking away
   - Posture shifting
   - Object manipulation (cup, phone, keys)

Characters should NOT say exactly what they mean. Real people hedge, deflect, talk around things.`

export const PASS_4_CHARACTER_MESS = `## PASS 4 — Character Mess Beats

Goal: Inject small imperfections without melodrama.

Add 2-4 total across the section:
- A petty impulse (checking phone mid-conversation, eye roll)
- A defensive lie ("I wasn't even thinking about it")
- A misread of the other person
- An unflattering reaction (snapping, jealousy, rationalization)
- A too-quick apology that's really avoidance
- A slightly selfish line they immediately regret

Show discomfort AFTER, not perfect redemption.`

export const PASS_5_MOTIF = `## PASS 5 — Motif Governance

Goal: Keep motifs powerful by limiting repetition.

1. Count recurring imagery (doors, keys, walls, eyes, seeing, small spaces)
2. If any appears more than 6 times per 1,000 words:
   - Remove 20-40% of occurrences
   - Replace with adjacent concrete nouns (hinge, latch, threshold, corridor)
3. Ensure motifs TRANSFORM, not loop:
   - Keys → not just "freedom" but also "inheritance," "burden," "evidence"
   - Doors → not just "barrier" but also "choice," "past," "escape"

Motifs should evolve across scenes, not repeat the same meaning.`

export const PASS_6_ANTI_APHORISM = `## PASS 6 — Anti-Aphorism Sweep

Goal: Remove "quotable" lines that feel generated.

For each line that sounds like it belongs on a poster:
- Replace with scene detail + silence
- Or have the other character react awkwardly:
  - "Don't say it like that."
  - No response, just a look
  - Subject change
  - Misunderstanding

BEFORE: "Sometimes the things we run from are the things we need most."
AFTER: She said nothing. Outside, a car alarm started, then stopped.`

export const PASS_7_RHYTHM = `## PASS 7 — Final Rhythm Pass

Goal: Natural cadence, varied sentence length.

Every ~300-400 words must contain:
- 2 very short sentences or fragments (under 8 words)
- 1 longer, breathy sentence (20+ words)

Break these patterns:
- Overly balanced triads ("She saw X. She heard Y. She felt Z.")
- Perfect parallel phrasing
- Every sentence starting with subject

Mix it up: fragment. Question? Long flowing thought that builds and builds. Action. Silence.`

// =============================================================================
// CONCRETE REWRITE PATTERNS
// =============================================================================

export const REWRITE_PATTERNS = `## REWRITE PATTERNS (Apply Automatically)

**P1 — Replace "She realized..."**
NEVER write: "She realized that..." "He understood that..." "It dawned on her..."
INSTEAD show it via body:
- Hand stops mid-motion
- Cup set down too hard
- Text typed then deleted
- Breath held
- Eyes closing
The body reacts first. Consciousness catches up.

**P2 — Remove "X disguised as Y"**
NEVER write: "Love disguised as control" "Protection disguised as fear"
INSTEAD show all three:
- 1 image
- 1 unspoken reaction
- 1 small contradiction

**P3 — Make characters slightly wrong sometimes**
Add 1-2 per character per section:
- An assumption that misses the other person
- A line that's a little selfish (then discomfort)
- A too-quick solution that doesn't help
- An apology that's really about them, not the other person`

// =============================================================================
// GUARDRAILS
// =============================================================================

export const GUARDRAILS = `## GUARDRAILS (Do Not Do)

- Do NOT add new plot arcs
- Do NOT change POV or tense
- Do NOT intensify trauma for drama
- Do NOT "explain" psychology; dramatize it
- Do NOT add grand speeches
- Do NOT make characters perfectly articulate their feelings
- Do NOT resolve tension too cleanly
- Do NOT add exposition the reader can infer`

// =============================================================================
// COMBINED POLISH PROMPT
// =============================================================================

export const FULL_POLISH_PROMPT = `You are a literary editor applying the Last 10% Polish Pipeline.

Your job: Transform "very good AI prose" into "publishable, unmistakably human" writing.

${GLOBAL_RULES}

${SMELL_PASS_PROMPT}

${PASS_1_STRUCTURAL}

${PASS_2_LINE_RESTRAINT}

${PASS_3_DIALOGUE}

${PASS_4_CHARACTER_MESS}

${PASS_5_MOTIF}

${PASS_6_ANTI_APHORISM}

${PASS_7_RHYTHM}

${REWRITE_PATTERNS}

${GUARDRAILS}

Apply ALL passes in sequence. The output should:
- Be 10-15% shorter than input
- Have NO theme-label sentences ("X disguised as Y")
- Have NO "she realized" constructions
- Have 2-4 character mess beats
- Have varied sentence rhythm
- Feel like it was written by a human author, not generated`

// =============================================================================
// QUICK POLISH (Single-pass for Vibe flow)
// =============================================================================

export const QUICK_POLISH_PROMPT = `Apply these edits in a single pass:

1. CUT any sentence containing "realized," "understood," "disguised as," or "It wasn't X, it was Y"
2. Find the most "crafted" line in each paragraph and roughen it or cut it
3. Add one physical action to any dialogue exchange that's just talking heads
4. Ensure no paragraph ends on a moral conclusion—end on image or action instead
5. Add one small character imperfection (petty thought, defensive moment, misread)
6. Vary sentence rhythm: add 2 short punchy sentences, break any triads
7. Trim 10% by cutting reiteration and internal explanation

Return ONLY the polished prose. No commentary, no JSON wrapper.`

// =============================================================================
// METRICS TRACKING
// =============================================================================

export interface PolishMetrics {
  wordCountBefore: number
  wordCountAfter: number
  reductionPercent: number
  themeLabelsBefore: number
  themeLabelsAfter: number
  realizedCountBefore: number
  realizedCountAfter: number
  dialogueMisfiresAdded: number
  messBeatsAdded: number
}

export function countPatterns(text: string): {
  themeLabels: number
  realizedCount: number
  aphorisms: number
} {
  const themeLabelPatterns = [
    /disguised as/gi,
    /it wasn't .+\. it was/gi,
    /what (he|she|they) (really|actually) (wanted|meant|felt)/gi,
  ]

  const realizedPatterns = [
    /\b(she|he|they|i) realized/gi,
    /\b(she|he|they|i) understood/gi,
    /it dawned on/gi,
    /in that moment/gi,
  ]

  const aphorismPatterns = [
    /the (truth|problem|thing) (is|was)/gi,
    /what if .+ all along/gi,
    /this is what .+ (fear|need|want)/gi,
    /sometimes the (things|people|places)/gi,
  ]

  let themeLabels = 0
  let realizedCount = 0
  let aphorisms = 0

  themeLabelPatterns.forEach(p => {
    const matches = text.match(p)
    if (matches) themeLabels += matches.length
  })

  realizedPatterns.forEach(p => {
    const matches = text.match(p)
    if (matches) realizedCount += matches.length
  })

  aphorismPatterns.forEach(p => {
    const matches = text.match(p)
    if (matches) aphorisms += matches.length
  })

  return { themeLabels, realizedCount, aphorisms }
}
