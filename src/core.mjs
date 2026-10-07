export class InputError extends Error {}
export function text(value, label, max = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new InputError(label + ' must be nonempty text of at most ' + max + ' characters.');
  return value.trim();
}
export function selectCase(cases, input) {
  const place = text(input.place, 'Place', 200);
  const candidate = cases.find(c => c.id === input.caseId);
  if (!candidate) return { status: 'no_match', place, message: 'No reviewed proposal matches this selection. Your experience can still become a resident suggestion.' };
  const option = candidate.placeOptions.find(p => p.id === input.placeId);
  if (!option || input.confirmed !== true) return { status: 'needs_confirmation', place, caseId: candidate.id, options: candidate.placeOptions };
  // The ZIP and model never decide relevance. The user confirms a curated footprint.
  const claims = candidate.claims.filter(c => c.placeIds.includes(option.id));
  return { status: 'matched', place: option.label, caseId: candidate.id, title: candidate.title, source: candidate.source, claims };
}
export function reflectionContext(cases, input) {
  const observation = text(input.observation, 'Reflection');
  const selection = selectCase(cases, input);
  if (selection.status !== 'matched') return { ...selection, observation };
  return { ...selection, observation };
}
export function validateAnalysis(raw, context) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError('Model returned an invalid object.');
  const reflectionSummary = text(raw.reflectionSummary, 'Model summary', 1200);
  if (!Array.isArray(raw.connections) || raw.connections.length > 4) throw new InputError('Invalid connections.');
  const allowed = new Set(context.claims.map(c => c.id));
  const seen = new Set();
  const connections = raw.connections.map(c => {
    if (!c || !allowed.has(c.claimId) || seen.has(c.claimId)) throw new InputError('Unsupported or duplicate source claim.');
    seen.add(c.claimId);
    const claim = context.claims.find(item => item.id === c.claimId);
    return { claimId: c.claimId, explanation: text(c.explanation, 'Connection', 1200), sourceClaim: claim.text, citation: context.source.url + '#page=' + claim.page };
  });
  const suggestion = raw.suggestion;
  if (!suggestion || !Array.isArray(suggestion.openQuestions) || suggestion.openQuestions.length > 5) throw new InputError('Invalid resident suggestion.');
  return {
    reflectionSummary, connections,
    suggestion: {
      title: text(suggestion.title, 'Suggestion title', 160),
      change: text(suggestion.change, 'Suggested change', 1200),
      rationale: text(suggestion.rationale, 'Rationale', 1200),
      openQuestions: suggestion.openQuestions.map(q => text(q, 'Open question', 300)),
    },
    reviewRequired: true,
    notice: 'AI draft: confirm the paraphrase and connections. A personal visit does not establish community consensus or technical feasibility.',
  };
}
export function makeDraft(input) {
  if (input.reviewed !== true) throw new InputError('Review and confirm your suggestion before formatting a draft.');
  const place = text(input.place, 'Place', 200);
  const observation = text(input.observation, 'Your observation');
  const change = text(input.change, 'Your suggested change', 2000);
  return {
    subject: 'Resident suggestion about ' + place,
    body: 'I recently visited ' + place + '.\n\nMy experience:\n' + observation + '\n\nMy suggestion:\n' + change + '\n\nThis is my personal perspective. Could you advise whether this suggestion falls within your responsibilities and what the appropriate next step would be?',
    recipient: null,
    status: 'unsent',
    notice: 'Recipient and participation channel have not been verified. No email is sent by this application.',
  };
}
