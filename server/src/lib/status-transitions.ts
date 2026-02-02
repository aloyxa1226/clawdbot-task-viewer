import { V2Status, Actor } from '../types/v2.js';

// Valid transitions per actor, derived from PRD US-101:
// AL is superuser — can transition between ANY two distinct statuses.
// AI: queued → claimed, claimed → in_progress, in_progress → review | queued, etc.
// System: any → queued, done → archived.

const ALL_STATUSES: V2Status[] = ['queued', 'claimed', 'in_progress', 'review', 'done', 'archived'];

type TransitionMap = Record<string, Partial<Record<V2Status, V2Status[]>>>;

const transitions: TransitionMap = {
  ai: {
    queued: ['claimed'],
    claimed: ['in_progress', 'queued'],
    in_progress: ['review', 'queued'],
    done: ['archived'],
    review: ['queued'],
    archived: ['queued'],
  },
  system: {
    queued: [],
    claimed: ['queued'],
    in_progress: ['queued'],
    review: ['queued'],
    done: ['archived', 'queued'],
    archived: ['queued'],
  },
};

export function isValidTransition(from: V2Status, to: V2Status, actor: Actor): boolean {
  if (from === to) return false;

  // AL is superuser — any from→to where from !== to
  if (actor === 'al') return true;

  // any → queued is allowed for ai and system
  if (to === 'queued' && (actor === 'ai' || actor === 'system')) {
    return true;
  }

  const actorTransitions = transitions[actor];
  if (!actorTransitions) return false;

  const allowed = actorTransitions[from];
  if (!allowed) return false;

  return allowed.includes(to);
}

export function getAllowedTransitions(from: V2Status, actor: Actor): V2Status[] {
  // AL is superuser — all statuses except current
  if (actor === 'al') {
    return ALL_STATUSES.filter(s => s !== from);
  }

  const actorTransitions = transitions[actor];
  if (!actorTransitions) return [];

  const allowed = actorTransitions[from] || [];
  // Always include queued (any → queued) for ai/system
  if (!allowed.includes('queued') && from !== 'queued') {
    return [...allowed, 'queued'];
  }
  return [...allowed];
}
