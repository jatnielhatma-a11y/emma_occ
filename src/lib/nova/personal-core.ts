export type MemorySourceKind = 'manual' | 'calendar' | 'gmail' | 'roster' | 'system' | 'ai_suggestion';

export type MemorySettings = {
  memoryEnabled: boolean;
  allowAiSuggestions: boolean;
  retentionDays: number;
  consentVersion: string;
};

export type PersonalCoreCounts = {
  interests: number;
  goals: number;
  habits: number;
  relationships: number;
  timeline: number;
  memories: number;
};

export const defaultMemorySettings: MemorySettings = {
  memoryEnabled: false,
  allowAiSuggestions: false,
  retentionDays: 365,
  consentVersion: 'nova-r2-privacy-v1',
};

export const emptyPersonalCoreCounts: PersonalCoreCounts = {
  interests: 0,
  goals: 0,
  habits: 0,
  relationships: 0,
  timeline: 0,
  memories: 0,
};

export function canPersistMemory(settings: MemorySettings, sourceKind: MemorySourceKind) {
  if (!settings.memoryEnabled) {
    return { allowed: false, reason: 'Memory is disabled. Enable memory consent before saving personal memories.' };
  }

  if (sourceKind === 'ai_suggestion' && !settings.allowAiSuggestions) {
    return { allowed: false, reason: 'AI-suggested memories need separate permission before they can be saved.' };
  }

  return { allowed: true, reason: 'Memory can be saved with source attribution.' };
}

export function buildPersonalCoreReadiness(settings: MemorySettings, counts: PersonalCoreCounts) {
  const lifeGraphCount = counts.interests + counts.goals + counts.habits + counts.relationships + counts.timeline;
  return {
    memoryStatus: settings.memoryEnabled ? 'enabled' : 'disabled',
    aiMemorySuggestions: settings.allowAiSuggestions ? 'allowed' : 'blocked',
    lifeGraphCount,
    hasPersonalContext: lifeGraphCount > 0 || counts.memories > 0,
    retentionLabel: `${settings.retentionDays} days`,
  };
}
