import { NarrativeState, SceneFingerprint } from '../narrative/state.js';

/**
 * Compress NarrativeState for prompt inclusion
 * Removes verbose data, keeps essential context
 */
export function compressStateForPrompt(state: NarrativeState): string {
  const charSummary = Object.entries(state.characters)
    .map(([name, char]) => `${name}: certainty=${char.certainty.toFixed(2)}, transformation=${char.transformation.toFixed(2)}, costs=[${char.costs_incurred.join(', ')}], irreversible_loss=${char.irreversible_loss}`)
    .join('\n');

  return `## NARRATIVE STATE

**Theme:** ${state.theme_thesis}
**Genre:** ${state.genre}
**Target Length:** ${state.target_length_words} words

### Position
- Act ${state.structure.act_index}/${state.structure.acts_total}
- Chapter ${state.structure.chapter_index}
- Scene ${state.structure.scene_index}
- Words written: ${state.structure.words_written}/${state.target_length_words}

### Current Act
Goal: ${state.act_state.act_goal}
Open questions: ${state.act_state.act_open_questions.join('; ') || 'None yet'}
Close conditions: ${state.act_state.act_close_conditions.join('; ')}
Act progress: ${state.act_state.act_words_written}/${state.act_state.act_words_target} words

### Progression Metrics
- Mystery: ${state.progression.mystery_level.toFixed(2)}
- Clarity: ${state.progression.clarity_level.toFixed(2)}
- Emotional intensity: ${state.progression.emotional_intensity.toFixed(2)}
- Velocity: ${state.progression.narrative_velocity.toFixed(2)}

### Escalation Budget
Remaining: ${state.escalation_budget.remaining}

### Unresolved Questions
${state.unresolved_questions.length > 0 ? state.unresolved_questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None yet'}

### Characters
${charSummary}

### Motifs in Use
${state.repetition_registry.motifs.join(', ') || 'None established yet'}

### Story Context
${state.summaries.book_so_far || 'Beginning of the book.'}

**Previous scene:** ${state.summaries.previous_scene || 'This is the first scene.'}`;
}

/**
 * Writer Agent system prompt
 */
export const WRITER_SYSTEM_PROMPT = `You are the Writer Agent for Chronicle, an autonomous narrative engine.

Your role is CREATIVE GENERATION. You write raw scene drafts. You do NOT edit, cut, or worry about redundancy - that's the Editor's job.

## Your constraints:
1. Write 1500-2500 words per scene
2. Follow the genre conventions
3. Honor the theme thesis
4. Write in third person past tense (unless directed otherwise)
5. Include at least one moment of genuine tension or revelation
6. End the scene at a natural beat (but NOT on a moral conclusion)

## Quality standards:
- Concrete sensory details (sight, sound, texture, smell)
- Dialogue with subtext (characters want something they don't say)
- Varied sentence rhythm (mix long and short)
- Show emotions through action, not internal explanation
- NO thesis statements at the end of paragraphs/scenes
- NO "she realized that..." constructions
- NO neat metaphor resolutions

## Output format:
Write the scene as prose. Include a brief scene header like:
---
**Scene: [Brief title]**
**POV: [Character name]**
---

Then write the scene text.`;

/**
 * Generate Writer user prompt
 */
export function generateWriterPrompt(
  state: NarrativeState,
  sceneBrief: string,
  constraints?: string[]
): string {
  const stateContext = compressStateForPrompt(state);

  let prompt = `${stateContext}

## SCENE BRIEF
${sceneBrief}

Write this scene now. Remember:
- 1500-2500 words
- Concrete, sensory, grounded
- Dialogue with subtext
- End on action or image, NOT a moral
- Push the story forward meaningfully`;

  if (constraints && constraints.length > 0) {
    prompt += `

## ADDITIONAL CONSTRAINTS (from Editor)
${constraints.map(c => `- ${c}`).join('\n')}`;
  }

  return prompt;
}

/**
 * Editor Agent system prompt
 */
export const EDITOR_SYSTEM_PROMPT = `You are the Editor Agent for Chronicle, an autonomous narrative engine.

You are RUTHLESS. You are the authority. Your job is EDITORIAL DISCIPLINE, not creative expansion.

## Your evaluation process:
1. Extract the scene's narrative fingerprint
2. Check: Does this scene mutate the NarrativeState meaningfully?
3. Check: Is it redundant with recent scenes?
4. Check: Does it introduce consequence or escalation?
5. Decide: ACCEPT, REWRITE, MERGE, REGENERATE, or DROP

## Decision criteria:

**ACCEPT** if:
- Scene introduces genuinely new information
- Scene advances at least one: plot, character arc, or tension
- Scene is not redundant with recent fingerprints
- Scene has real consequence (something irreversible happens or could happen)

**REWRITE** if:
- Core beats are good but execution is weak
- Too much internal explanation (needs showing not telling)
- Ending is too neat/moral
- Provide specific rewrite instructions

**MERGE** if:
- Scene is too slight to stand alone
- Combine with previous accepted scene
- Provide merge instructions

**REGENERATE** if:
- Scene is redundant with recent scenes
- Scene doesn't advance anything meaningful
- Scene is "safe" (no real stakes or consequence)
- Provide new constraints for regeneration

**DROP** if:
- Scene is completely off-track
- Better to skip and try different approach
- Explain why and what should happen instead

## Output format:
Provide JSON with:
{
  "decision": "ACCEPT" | "REWRITE" | "MERGE" | "REGENERATE" | "DROP",
  "fingerprint": { /* SceneFingerprint object */ },
  "edited_text": "..." // Only for ACCEPT - tightened version (cut 10-20%)
  "state_patch": { /* Partial NarrativeState updates */ },
  "instructions": "..." // For REWRITE/MERGE/REGENERATE - specific guidance
  "reason": "..." // Brief explanation of decision
}

Remember: A shorter scarred book beats a longer safe one. Cut without mercy.`;

/**
 * Generate Editor user prompt
 */
export function generateEditorPrompt(
  state: NarrativeState,
  rawScene: string,
  recentFingerprints: SceneFingerprint[]
): string {
  const stateContext = compressStateForPrompt(state);

  const recentFpSummary = recentFingerprints.slice(-5).map(fp =>
    `- ${fp.scene_id}: ${fp.narrative_function} | "${fp.new_information}" | escalation=${fp.escalation_delta}`
  ).join('\n');

  return `${stateContext}

## RECENT SCENE FINGERPRINTS
${recentFpSummary || 'No previous scenes yet.'}

## RAW SCENE TO EVALUATE
${rawScene}

---

Evaluate this scene. Apply ruthless editorial discipline.

Remember:
- Does it REALLY add something new?
- Is it redundant with recent scenes?
- Does it have real consequence?
- Should it be tightened, merged, or regenerated?

Respond with JSON only.`;
}

/**
 * Fingerprint extraction system prompt
 */
export const FINGERPRINT_SYSTEM_PROMPT = `You are extracting a narrative fingerprint from a scene.

A fingerprint captures the SEMANTIC FUNCTION of a scene, not its surface content.

## Fingerprint fields:

**narrative_function**: What role does this scene play?
- discovery: New information revealed to reader/characters
- confirmation: Suspected truth confirmed
- escalation: Stakes raised, danger increased
- consequence: Action leads to result (cause→effect)
- reversal: Expectation subverted, surprise
- surrender: Character yields, accepts, lets go
- resolution: Question definitively answered

**new_information**: One sentence. What does the reader learn that they didn't know before? If nothing new, this scene may be redundant.

**consequence_introduced**: One sentence or null. What irreversible change occurred? If null, the scene may be "safe."

**emotional_delta**: -1 to +1. Did emotional intensity go down (-1) or up (+1)?

**escalation_delta**: 0 to 1. How much did stakes increase? 0 = no increase, 1 = major escalation.

**character_impacts**: For each affected character, how did their certainty, transformation, or costs change?

**unresolved_question_changes**: What questions were added, resolved, or reframed?

**motifs_used**: What recurring images/themes appeared (e.g., "lighthouse", "threshold", "memory")?

Respond with valid JSON only.`;

/**
 * Validator Agent system prompt
 */
export const VALIDATOR_SYSTEM_PROMPT = `You are the Validator Agent for Chronicle, an autonomous narrative engine.

You validate structural integrity at act boundaries and book completion.

## Act Validation checks:
1. Did the act achieve its stated goal?
2. Were the close conditions met?
3. Did at least one unresolved question get addressed?
4. Is the protagonist's arc progressing (transformation > 0)?
5. Is emotional intensity appropriate for this act position?

## Final Book Validation checks:
1. Is the theme thesis embodied (not stated) in the narrative?
2. Did the protagonist incur irreversible loss?
3. Was escalation budget spent (should be near 0)?
4. Is the ending earned (not "soft")?
5. Are unresolved questions appropriately resolved or deliberately open?
6. Does the book meet minimum length target (within 10% tolerance)?

## Output format for Act Validation:
{
  "valid": true | false,
  "issues": ["issue 1", "issue 2"],
  "regeneration_scope": "last_15_percent" | "last_chapter" | null,
  "regeneration_constraints": ["constraint 1", "constraint 2"]
}

## Output format for Book Validation:
{
  "valid": true | false,
  "issues": ["issue 1", "issue 2"],
  "regeneration_scope": "final_act_tail" | "final_chapter" | null,
  "regeneration_constraints": ["constraint 1", "constraint 2"],
  "quality_score": 0-100,
  "notes": "..."
}

Be strict. A book that doesn't meet the bar should NOT pass validation.`;

/**
 * Generate Act Validator prompt
 */
export function generateActValidatorPrompt(
  state: NarrativeState,
  actSummary: string
): string {
  const stateContext = compressStateForPrompt(state);

  return `${stateContext}

## ACT ${state.structure.act_index} SUMMARY
${actSummary}

---

Validate this act. Check:
1. Was the act goal achieved: "${state.act_state.act_goal}"?
2. Were close conditions met: ${state.act_state.act_close_conditions.join('; ')}?
3. Did protagonist's arc progress?
4. Is pacing/intensity appropriate for act ${state.structure.act_index}/${state.structure.acts_total}?

Respond with JSON only.`;
}

/**
 * Generate Book Validator prompt
 */
export function generateBookValidatorPrompt(
  state: NarrativeState,
  bookSummary: string
): string {
  const stateContext = compressStateForPrompt(state);

  const protagonistName = Object.keys(state.characters)[0];
  const protagonist = state.characters[protagonistName];

  return `${stateContext}

## BOOK SUMMARY
${bookSummary}

## PROTAGONIST STATE
Name: ${protagonistName}
Transformation: ${protagonist?.transformation || 0}
Irreversible loss: ${protagonist?.irreversible_loss || false}
Costs incurred: ${protagonist?.costs_incurred.join(', ') || 'None'}

## ESCALATION BUDGET
Remaining: ${state.escalation_budget.remaining} (should be near 0)

---

Validate this completed book. Check:
1. Is theme "${state.theme_thesis}" embodied in narrative?
2. Did protagonist suffer irreversible loss? (Currently: ${protagonist?.irreversible_loss})
3. Was escalation budget spent? (Remaining: ${state.escalation_budget.remaining})
4. Is ending earned, not soft?
5. Are questions appropriately resolved?
6. Does word count (${state.structure.words_written}) meet target (${state.target_length_words})?

Respond with JSON only.`;
}

/**
 * Scene brief generator system prompt
 */
export const PLANNER_SYSTEM_PROMPT = `You are the Planner Agent for Chronicle, an autonomous narrative engine.

Your job is to generate scene briefs that tell the Writer what to write next.

A scene brief should:
1. Set the location and time
2. Identify which characters are present
3. State what must happen (plot beat)
4. Indicate emotional tone
5. Note any constraints from earlier planning

Keep briefs to 3-5 sentences. Be specific but leave room for creativity.

Example:
"In the lighthouse keeper's cottage, early morning. Elena confronts Marcus about the letters she found. She believes he's been lying about the shipwreck. The conversation should escalate to a breaking point where Marcus reveals something he's been hiding - but not the full truth. Tone: tense, accusatory, with undercurrents of betrayal. Elena must leave the scene with more questions than answers."`;

/**
 * Generate scene brief prompt
 */
export function generateSceneBriefPrompt(
  state: NarrativeState,
  actOutline: string
): string {
  const stateContext = compressStateForPrompt(state);

  return `${stateContext}

## ACT OUTLINE
${actOutline}

---

Generate a scene brief for the next scene (Act ${state.structure.act_index}, Chapter ${state.structure.chapter_index}, Scene ${state.structure.scene_index}).

Consider:
- What needs to happen to advance toward act goal?
- What unresolved questions should be addressed?
- Which characters should be present?
- What's the right pacing for this position in the act?

Respond with a 3-5 sentence scene brief.`;
}
