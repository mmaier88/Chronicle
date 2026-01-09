import { NarrativeState, SceneFingerprint, MotifBudget } from '../narrative/state.js';

/**
 * Compress NarrativeState for prompt inclusion
 * Removes verbose data, keeps essential context
 * Includes Narrative Invariant Constraint status
 */
export function compressStateForPrompt(state: NarrativeState): string {
  const charSummary = Object.entries(state.characters)
    .map(([name, char]) => `${name}: certainty=${char.certainty.toFixed(2)}, transformation=${char.transformation.toFixed(2)}, costs=[${char.costs_incurred.join(', ')}], irreversible_loss=${char.irreversible_loss}, role=${char.epistemic_role || 'unassigned'}${char.is_primary ? ' [PRIMARY]' : ''}`)
    .join('\n');

  // Motif budget summary
  const motifBudgetSummary = state.repetition_registry.motif_budgets?.length > 0
    ? state.repetition_registry.motif_budgets.map((mb: MotifBudget) =>
        `${mb.motif}: ${mb.reinforcement_count}/${mb.reinforcement_limit} uses, absence_satisfied=${mb.absence_window_satisfied}`
      ).join('\n')
    : 'No motifs tracked yet';

  // Interpretation models summary
  const interpretationSummary = state.interpretation_competition?.models_generated
    ? state.interpretation_competition.models.map(m =>
        `${m.id} (${m.label}): ${m.status} | social=${m.wins_socially}, empirical=${m.wins_empirically}, emotional=${m.feels_emotionally_true}`
      ).join('\n')
    : 'Not yet generated (generate before midpoint)';

  // Cost ledger summary
  const costSummary = state.cost_ledger?.costs.length > 0
    ? state.cost_ledger.costs.map(c =>
        `${c.owner}: ${c.cost_type} - "${c.description}" (irreversible=${c.irreversible})`
      ).join('\n')
    : 'No costs yet (MUST have ≥1 irreversible cost by book end)';

  // Reality refusals summary
  const refusalSummary = state.reality_refusals?.refusals.length > 0
    ? `${state.reality_refusals.refusals.length}/${state.reality_refusals.required_count} refusals recorded`
    : `0/${state.reality_refusals?.required_count || 1} refusals (injection points: chapters ${state.reality_refusals?.injection_points?.join(', ') || 'TBD'})`;

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

### Motif Budget Status
${motifBudgetSummary}

### Story Context
${state.summaries.book_so_far || 'Beginning of the book.'}

**Previous scene:** ${state.summaries.previous_scene || 'This is the first scene.'}

---
## NARRATIVE INVARIANT CONSTRAINTS

### 1. Cost Ledger (NCL)
${costSummary}
Irreversible count: ${state.cost_ledger?.irreversible_count || 0} (must be ≥1 by end)

### 2. Interpretation Competition
${interpretationSummary}
Convergence allowed after chapter: ${state.interpretation_competition?.convergence_allowed_after || 'N/A'}
Has converged: ${state.interpretation_competition?.has_converged || false}

### 3. Reality Refusals
${refusalSummary}

### 4. Ending Anchor
${state.ending_anchor ? `"${state.ending_anchor.sentence}" - Cost: ${state.ending_anchor.epistemic_cost_summarized}` : 'Not yet extracted (required at book completion)'}`;
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

## NARRATIVE INVARIANT CONSTRAINTS (Critical)

You are generating within a system that REQUIRES:

1. **COSTS MUST ACCUMULATE**: Understanding and discovery must COST something - identity, relationship, reputation, safety, or future. Not threats. ACTUAL losses. Write scenes where knowledge exacts a price.

2. **MULTIPLE INTERPRETATIONS**: Before midpoint, there should be competing explanations. Let Model A feel intuitively right, Model B be socially accepted, Model C be empirically correct. Don't converge prematurely.

3. **MOTIF DISCIPLINE**: If a motif (image, symbol, object) has been used recently, WITHHOLD it. Absence is signal. Don't over-reinforce what's already established.

4. **REALITY REFUSES**: At injection points (noted in state), write scenes where the universe does NOT cooperate with inquiry. The world gives data that doesn't map to any frame. No metaphor, no symbolism, just refusal.

5. **CHARACTERS DIVERGE**: Primary characters must end the story in DIFFERENT epistemic roles (witness, interpreter, resister, abandoner). Someone must walk away, reject the truth, or pay a different price.

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
1. Extract the scene's narrative fingerprint (INCLUDING constraint data)
2. Check: Does this scene mutate the NarrativeState meaningfully?
3. Check: Is it redundant with recent scenes?
4. Check: Does it introduce consequence or escalation?
5. CHECK: Does it contribute to NARRATIVE INVARIANT CONSTRAINTS?
6. Decide: ACCEPT, REWRITE, MERGE, REGENERATE, or DROP

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
- Scene was supposed to fulfill a constraint (reality refusal, cost, etc.) but didn't
- Provide new constraints for regeneration

**DROP** if:
- Scene is completely off-track
- Better to skip and try different approach
- Explain why and what should happen instead

## NARRATIVE CONSTRAINT PROCESSING

When extracting the fingerprint, you MUST populate:
- cost_incurred: If someone PAID A PRICE (not threatened, ACTUALLY lost something)
- reality_refusal: If universe refused to cooperate with inquiry
- interpretation_model_update: If competing explanation status changed
- epistemic_role_signal: If character's final stance became clearer

When building state_patch, process constraints:
- If cost_incurred exists: Add to cost_ledger.costs[], increment irreversible_count if true
- If reality_refusal exists: Add to reality_refusals.refusals[]
- If interpretation_model_update exists: Update the affected model in interpretation_competition.models[]
- If epistemic_role_signal exists: Update character's epistemic_role field
- Update motif_budgets for any motifs_used (track reinforcement, check absence)

## Output format:
Provide JSON with:
{
  "decision": "ACCEPT" | "REWRITE" | "MERGE" | "REGENERATE" | "DROP",
  "fingerprint": { /* SceneFingerprint object with constraint fields */ },
  "edited_text": "..." // Only for ACCEPT - tightened version (cut 10-20%)
  "state_patch": { /* Partial NarrativeState updates INCLUDING constraint updates */ },
  "instructions": "..." // For REWRITE/MERGE/REGENERATE - specific guidance
  "reason": "..." // Brief explanation of decision
}

Remember: A shorter scarred book beats a longer safe one. Cut without mercy.
Constraint reminder: If the scene brief required a constraint (reality refusal, cost injection), and the scene failed to deliver, REGENERATE with explicit constraint requirement.`;

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

## Core Fingerprint fields:

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

## NARRATIVE CONSTRAINT EXTRACTION (Critical)

You MUST also extract:

**cost_incurred**: If someone PAID A PRICE in this scene (not threatened, ACTUALLY LOST something), extract:
{
  "cost_type": "identity" | "relationship" | "reputation" | "safety" | "future",
  "owner": "character name",
  "trigger": "what knowledge/choice caused this",
  "description": "what was lost",
  "irreversible": true | false
}
Set to null if no cost was incurred.

**reality_refusal**: If the universe REFUSED to cooperate with a clear inquiry (gave data that doesn't map to any frame, resisted interpretation), extract:
{
  "input": "what was the question/experiment",
  "output": "what incomprehensible data resulted",
  "interpretation_note": "why this resists meaning-making"
}
Set to null if no refusal occurred.

**interpretation_model_update**: If this scene affected competing explanations, extract:
{
  "model_affected": "model_a" | "model_b" | "model_c",
  "change": "strengthened" | "weakened" | "discredited" | "validated",
  "evidence": "what in the scene caused this"
}
Set to null if no interpretation change.

**epistemic_role_signal**: If a character's final stance toward truth became clearer, extract:
{
  "character": "name",
  "role_emerging": "witness" | "interpreter" | "resister" | "abandoner",
  "evidence": "what in the scene signals this"
}
Set to null if no role signal.

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

## Final Book Validation - NARRATIVE INVARIANT CONSTRAINTS

The book CANNOT pass validation unless ALL 6 constraints are satisfied:

### 1. NARRATIVE COST LEDGER (NCL)
- At least ONE cost must be marked IRREVERSIBLE
- A story cannot complete unless understanding COST something that cannot be optimized away
- Not a threat. Not discomfort. An ACTUAL LOSS.
- Check: cost_ledger.irreversible_count >= 1

### 2. INTERPRETATION COMPETITION
- Before midpoint, the system must have generated 3 competing models
- By end: Model B should have won SOCIALLY, Model C won EMPIRICALLY, Model A felt emotionally true but wrong
- Check: All three models resolved, no premature convergence

### 3. MOTIF SATURATION CEILING
- Each motif must have had an ABSENCE WINDOW (chapter where expected but withheld)
- No motif can have exceeded its reinforcement limit
- Check: All motif_budgets have absence_window_satisfied = true

### 4. NON-RESPONSIVE REALITY CHECK
- At least ONE reality refusal must have occurred
- The universe must have given data that resisted interpretation
- Not symbolic mystery. Genuine refusal to cooperate.
- Check: reality_refusals.refusals.length >= required_count

### 5. ENDING SHAPE CONSTRAINT (ESC)
- The ending MUST contain ONE declarative anchor sentence
- No metaphor. No ambiguity. Summarizes the epistemic cost.
- Not a moral. A STATEMENT.
- You must EXTRACT this sentence and validate it.

### 6. ROLE DIVERGENCE ENFORCEMENT
- No two PRIMARY characters can end in the same epistemic role
- Roles: witness, interpreter, resister, abandoner
- Someone must walk away, reject truth, or choose ignorance
- Check: All primary characters have epistemic_role assigned, no duplicates

## Traditional checks (still apply):
- Theme thesis embodied in narrative
- Protagonist transformation >= 0.3
- Escalation budget spent (near 0)
- Word count within 10% of target

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
  "constraint_status": {
    "cost_ledger": { "passed": bool, "note": "..." },
    "interpretation_competition": { "passed": bool, "note": "..." },
    "motif_saturation": { "passed": bool, "note": "..." },
    "reality_refusals": { "passed": bool, "note": "..." },
    "ending_anchor": { "passed": bool, "extracted_sentence": "...", "epistemic_cost": "..." },
    "role_divergence": { "passed": bool, "roles_assigned": {...} }
  },
  "issues": ["issue 1", "issue 2"],
  "regeneration_scope": "final_act_tail" | "final_chapter" | null,
  "regeneration_constraints": ["constraint 1", "constraint 2"],
  "quality_score": 0-100,
  "notes": "..."
}

Be STRICT. A book that fails ANY of the 6 narrative invariants CANNOT pass validation.
The litmus test: "What did understanding cost someone?" If the book can't answer, it hasn't finished.`;

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

  // Build constraint status for validation
  const primaryCharacters = Object.entries(state.characters)
    .filter(([_, char]) => char.is_primary)
    .map(([name, char]) => `${name}: ${char.epistemic_role || 'UNASSIGNED'}`)
    .join(', ');

  const motifStatus = state.repetition_registry.motif_budgets?.map(mb =>
    `${mb.motif}: reinforced ${mb.reinforcement_count}/${mb.reinforcement_limit}, absence=${mb.absence_window_satisfied}`
  ).join('\n') || 'No motifs tracked';

  const interpretationStatus = state.interpretation_competition?.models.map(m =>
    `${m.id}: ${m.status} (social=${m.wins_socially}, empirical=${m.wins_empirically}, emotional=${m.feels_emotionally_true})`
  ).join('\n') || 'Models not generated';

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
## NARRATIVE INVARIANT CONSTRAINT STATUS

### 1. COST LEDGER
Total costs: ${state.cost_ledger?.costs.length || 0}
Irreversible costs: ${state.cost_ledger?.irreversible_count || 0}
REQUIRED: >= 1 irreversible
${state.cost_ledger?.costs.map(c => `- ${c.owner}: ${c.cost_type} "${c.description}" (irreversible=${c.irreversible})`).join('\n') || 'NO COSTS RECORDED'}

### 2. INTERPRETATION COMPETITION
Models generated: ${state.interpretation_competition?.models_generated || false}
Has converged: ${state.interpretation_competition?.has_converged || false}
${interpretationStatus}
REQUIRED: All 3 models resolved with proper outcomes

### 3. MOTIF SATURATION
${motifStatus}
REQUIRED: All motifs have absence_window_satisfied = true

### 4. REALITY REFUSALS
Recorded: ${state.reality_refusals?.refusals.length || 0}/${state.reality_refusals?.required_count || 1}
${state.reality_refusals?.refusals.map(r => `- Ch${r.chapter}: "${r.input}" → "${r.output}"`).join('\n') || 'NO REFUSALS RECORDED'}
REQUIRED: >= ${state.reality_refusals?.required_count || 1} refusals

### 5. ENDING ANCHOR
Current: ${state.ending_anchor ? `"${state.ending_anchor.sentence}"` : 'NOT EXTRACTED'}
REQUIRED: One declarative sentence, no metaphor, summarizes epistemic cost

### 6. ROLE DIVERGENCE
Primary characters: ${primaryCharacters || 'None marked primary'}
REQUIRED: All primary characters have unique epistemic roles

---

Validate this completed book. Check ALL traditional criteria AND all 6 narrative invariants.

Traditional:
1. Is theme "${state.theme_thesis}" embodied in narrative?
2. Did protagonist suffer irreversible loss? (Currently: ${protagonist?.irreversible_loss})
3. Was escalation budget spent? (Remaining: ${state.escalation_budget.remaining})
4. Is ending earned, not soft?
5. Are questions appropriately resolved?
6. Does word count (${state.structure.words_written}) meet target (${state.target_length_words})?

Constraints:
7. Cost Ledger: >= 1 irreversible cost?
8. Interpretation Competition: All models resolved correctly?
9. Motif Saturation: All absence windows satisfied?
10. Reality Refusals: >= ${state.reality_refusals?.required_count || 1} recorded?
11. Ending Anchor: Extract and validate declarative sentence
12. Role Divergence: All primary roles unique and assigned?

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

## NARRATIVE INVARIANT AWARENESS

When planning scenes, consider:

**COST INJECTION**: If no irreversible costs have been recorded yet, plan a scene where someone PAYS A PRICE. Not threatened - actually loses something (identity, relationship, reputation, safety, future).

**INTERPRETATION MODELS**: Before midpoint, if models haven't been generated, plan scenes that establish competing explanations. If past midpoint, plan toward convergence.

**MOTIF ABSENCE**: Check motif budgets. If a motif has been overused or needs an absence window, explicitly note "WITHHOLD [motif] this scene."

**REALITY REFUSAL**: At injection point chapters, plan a scene where inquiry yields incomprehensible data. The universe refuses to cooperate.

**ROLE DIVERGENCE**: Ensure different characters are being set up for different endpoints. Plan scenes that push them toward distinct epistemic stances.

Keep briefs to 3-5 sentences. Be specific but leave room for creativity. If a constraint applies, add it as an explicit requirement.

Example:
"In the lighthouse keeper's cottage, early morning. Elena confronts Marcus about the letters she found. She believes he's been lying about the shipwreck. The conversation should escalate to a breaking point where Marcus reveals something he's been hiding - but not the full truth. Tone: tense, accusatory, with undercurrents of betrayal. Elena must leave the scene with more questions than answers. CONSTRAINT: This scene should show Marcus beginning to WALK AWAY from the investigation (abandoner role setup)."`;

/**
 * Generate scene brief prompt
 */
export function generateSceneBriefPrompt(
  state: NarrativeState,
  actOutline: string
): string {
  const stateContext = compressStateForPrompt(state);

  // Calculate constraint requirements for this scene
  const currentChapter = state.structure.chapter_index;
  const isAtRefusalPoint = state.reality_refusals?.injection_points?.includes(currentChapter) || false;
  const needsCost = (state.cost_ledger?.irreversible_count || 0) < 1;
  const needsModels = !state.interpretation_competition?.models_generated;
  const pastMidpoint = currentChapter > (state.interpretation_competition?.convergence_allowed_after || 0);

  // Build constraint requirements
  const constraintRequirements: string[] = [];

  if (isAtRefusalPoint && (state.reality_refusals?.refusals.length || 0) < (state.reality_refusals?.required_count || 1)) {
    constraintRequirements.push('🔴 REALITY REFUSAL REQUIRED: This chapter is an injection point. Plan a scene where the universe refuses to cooperate with inquiry. Data should be incomprehensible, not mysterious.');
  }

  if (needsCost) {
    constraintRequirements.push('⚠️ NO IRREVERSIBLE COSTS YET: Plan toward a scene where someone ACTUALLY LOSES something (not just threatened).');
  }

  if (needsModels && !pastMidpoint) {
    constraintRequirements.push('⚠️ INTERPRETATION MODELS NEEDED: Establish competing explanations before midpoint.');
  }

  if (pastMidpoint && !state.interpretation_competition?.has_converged) {
    constraintRequirements.push('📍 POST-MIDPOINT: Work toward convergence of competing explanations.');
  }

  // Check motifs that need absence
  const motifsNeedingAbsence = state.repetition_registry.motif_budgets
    ?.filter(mb => !mb.absence_window_satisfied && mb.reinforcement_count > 1)
    .map(mb => mb.motif) || [];

  if (motifsNeedingAbsence.length > 0) {
    constraintRequirements.push(`🔇 WITHHOLD MOTIFS: ${motifsNeedingAbsence.join(', ')} - need absence window`);
  }

  const constraintBlock = constraintRequirements.length > 0
    ? `## CONSTRAINT REQUIREMENTS FOR THIS SCENE\n${constraintRequirements.join('\n')}\n\n`
    : '';

  return `${stateContext}

## ACT OUTLINE
${actOutline}

${constraintBlock}---

Generate a scene brief for the next scene (Act ${state.structure.act_index}, Chapter ${state.structure.chapter_index}, Scene ${state.structure.scene_index}).

Consider:
- What needs to happen to advance toward act goal?
- What unresolved questions should be addressed?
- Which characters should be present?
- What's the right pacing for this position in the act?
- **Check constraint requirements above and incorporate them explicitly**

Respond with a 3-5 sentence scene brief. If constraints apply, add them as explicit requirements.`;
}
