import { V2Status, Actor } from '../types/v2.js';

// Valid transitions per actor, derived from PRD US-101:
// queued → claimed (AI only)
// claimed → in_progress (AI only)
// in_progress → review | queued (AI only)
// review → done | in_progress (AL only)
// done → archived (either)
// any → queued (either; reset)

type TransitionMap = Record<string, Partial<Record<V2Status, V2Status[]>>>;

const transitions: TransitionMap = {
  al: {
    review: ['done', 'in_progress'],
    done: ['archived'],
    // any → queued
    queued: [],
    claimed: ['queued'],
    in_progress: ['queued'],
    archived: ['queued'],
  },
  ai: {
    queued: ['claimed'],
    claimed: ['in_progress', 'queued'],
    in_progress: ['review', 'queued'],
    done: ['archived'],
    // any → queued
    review: ['queued'],
    archived: ['queued'],
  },
  system: {
    // system can do any → queued and done → archived
    queued: [],
    claimed: ['queued'],
    in_progress: ['queued'],
    review: ['queued'],
    done: ['archived', 'queued'],
    archived: ['queued'],
  },
};

export function isValidTransition(from: V2Status, to: V2Status, actor: Actor): boolean {
  // any → queued is allowed for al and ai
  if (to === 'queued' && (actor === 'al' || actor === 'ai' || actor === 'system')) {
    return true;
  }

  const actorTransitions = transitions[actor];
  if (!actorTransitions) return false;

  const allowed = actorTransitions[from];
  if (!allowed) return false;

  return allowed.includes(to);
}

export function getAllowedTransitions(from: V2Status, actor: Actor): V2Status[] {
  const actorTransitions = transitions[actor];
  if (!actorTransitions) return [];

  const allowed = actorTransitions[from] || [];
  // Always include queued (any → queued) for al/ai/system
  if (!allowed.includes('queued') && from !== 'queued') {
    return [...allowed, 'queued'];
  }
  return [...allowed];
}
