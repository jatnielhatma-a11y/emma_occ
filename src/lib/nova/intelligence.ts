export type IntelligenceKind = 'prediction' | 'recommendation' | 'context_signal' | 'automation_rule' | 'daily_ai_routine';

export type IntelligenceCounts = Record<IntelligenceKind, number>;

export type IntelligenceRecord = {
  kind: IntelligenceKind;
  title: string;
  detail: string;
  domain: string;
  confidence: number;
  risk: 'green' | 'amber' | 'red';
  automationEnabled: boolean;
  requiresConfirmation: boolean;
};

export const emptyIntelligenceCounts: IntelligenceCounts = {
  prediction: 0,
  recommendation: 0,
  context_signal: 0,
  automation_rule: 0,
  daily_ai_routine: 0,
};

export function buildIntelligenceReadiness(counts: IntelligenceCounts) {
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const activeLayerCount = Object.values(counts).filter((count) => count > 0).length;

  return {
    totalRecords,
    activeLayerCount,
    allLayersStarted: activeLayerCount === Object.keys(emptyIntelligenceCounts).length,
    recommendationStatus: counts.recommendation > 0 || counts.daily_ai_routine > 0 ? 'advisory-ready' : 'waiting-for-signals',
    automationStatus: counts.automation_rule > 0 ? 'approval-required' : 'manual-only',
  };
}

export function automationGuardrail(record: Pick<IntelligenceRecord, 'kind' | 'automationEnabled' | 'requiresConfirmation'>) {
  if (record.kind !== 'automation_rule') return 'not-automation';
  if (!record.automationEnabled) return 'disabled-by-default';
  if (record.requiresConfirmation) return 'manual-confirmation-required';
  return 'blocked-unconfirmed-automation';
}

export function release4SeedRecords(): IntelligenceRecord[] {
  return [
    {
      kind: 'context_signal',
      title: 'Operational context assembled',
      detail: 'Duty, commute, weather, calendar, and integration source labels can feed reviewable recommendations.',
      domain: 'operations',
      confidence: 0.72,
      risk: 'green',
      automationEnabled: false,
      requiresConfirmation: true,
    },
    {
      kind: 'recommendation',
      title: 'Review fallback sources before action',
      detail: 'NOVA must label fallback or unavailable data before it influences duty or commute decisions.',
      domain: 'operations',
      confidence: 0.68,
      risk: 'amber',
      automationEnabled: false,
      requiresConfirmation: true,
    },
    {
      kind: 'automation_rule',
      title: 'Confirm before operational action',
      detail: 'Automation candidates may prepare actions, but calendar, notifications, commute, email, and memory changes require confirmation.',
      domain: 'automation',
      confidence: 1,
      risk: 'green',
      automationEnabled: false,
      requiresConfirmation: true,
    },
    {
      kind: 'daily_ai_routine',
      title: 'Daily mission brief',
      detail: 'Daily AI uses verified JSON context, OpenAI Responses API, and deterministic fallback.',
      domain: 'daily-ai',
      confidence: 0.8,
      risk: 'green',
      automationEnabled: false,
      requiresConfirmation: true,
    },
  ];
}
