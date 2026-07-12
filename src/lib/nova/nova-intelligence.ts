export type NovaCapability =
  | 'multi_device_sync'
  | 'voice'
  | 'vision'
  | 'collaboration'
  | 'developer_platform'
  | 'nova_intelligence';

export type NovaPrivacyMode = 'local_only' | 'private_sync' | 'shared_scope' | 'developer_scoped' | 'disabled';

export type NovaCapabilityCounts = Record<NovaCapability, number>;

export type NovaCapabilityRecord = {
  capability: NovaCapability;
  title: string;
  detail: string;
  status: 'ready' | 'needs_consent' | 'blocked' | 'monitoring';
  privacyMode: NovaPrivacyMode;
  consentRequired: boolean;
  consentGranted: boolean;
  syncEnabled: boolean;
  deviceScope: 'phone' | 'desktop' | 'pwa' | 'all';
  confidence: number;
  risk: 'green' | 'amber' | 'red';
};

export const emptyNovaCapabilityCounts: NovaCapabilityCounts = {
  multi_device_sync: 0,
  voice: 0,
  vision: 0,
  collaboration: 0,
  developer_platform: 0,
  nova_intelligence: 0,
};

export function buildNovaIntelligenceReadiness(counts: NovaCapabilityCounts) {
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const activeCapabilityCount = Object.values(counts).filter((count) => count > 0).length;
  const requiredCapabilityCount = Object.keys(emptyNovaCapabilityCounts).length;

  return {
    totalRecords,
    activeCapabilityCount,
    requiredCapabilityCount,
    allCapabilitiesStarted: activeCapabilityCount === requiredCapabilityCount,
    syncStatus: counts.multi_device_sync > 0 ? 'sync-ready' : 'local-only',
    assistantStatus: counts.voice > 0 && counts.vision > 0 ? 'multi-modal-ready' : 'consent-gated',
    platformStatus: counts.developer_platform > 0 ? 'extension-ready' : 'closed-platform',
  };
}

export function capabilityGuardrail(
  record: Pick<NovaCapabilityRecord, 'capability' | 'privacyMode' | 'consentRequired' | 'consentGranted' | 'syncEnabled'>
) {
  if (record.privacyMode === 'disabled') return record.syncEnabled ? 'blocked-disabled-sync' : 'disabled';
  if ((record.capability === 'voice' || record.capability === 'vision') && record.consentRequired && !record.consentGranted) {
    return 'explicit-consent-required';
  }
  if (record.capability === 'developer_platform' && record.privacyMode !== 'developer_scoped') {
    return 'developer-scope-required';
  }
  if (record.syncEnabled && record.privacyMode === 'local_only') return 'blocked-local-only-sync';
  return 'ready-with-guardrails';
}

export function release5SeedRecords(): NovaCapabilityRecord[] {
  return [
    {
      capability: 'multi_device_sync',
      title: 'Phone and desktop sync boundary',
      detail: 'NOVA can represent sync readiness while keeping local-only records out of shared device state.',
      status: 'ready',
      privacyMode: 'private_sync',
      consentRequired: false,
      consentGranted: true,
      syncEnabled: true,
      deviceScope: 'all',
      confidence: 0.86,
      risk: 'green',
    },
    {
      capability: 'voice',
      title: 'Voice commands are consent gated',
      detail: 'Voice readiness exists, but command processing stays blocked until explicit consent is active.',
      status: 'needs_consent',
      privacyMode: 'local_only',
      consentRequired: true,
      consentGranted: false,
      syncEnabled: false,
      deviceScope: 'phone',
      confidence: 0.72,
      risk: 'amber',
    },
    {
      capability: 'vision',
      title: 'Vision review is consent gated',
      detail: 'Images and document understanding require consent, source attribution, and review before use.',
      status: 'needs_consent',
      privacyMode: 'local_only',
      consentRequired: true,
      consentGranted: false,
      syncEnabled: false,
      deviceScope: 'all',
      confidence: 0.72,
      risk: 'amber',
    },
    {
      capability: 'collaboration',
      title: 'Shared planning requires invite scopes',
      detail: 'Collaboration records remain scoped and auditable before any personal context can be shared.',
      status: 'monitoring',
      privacyMode: 'shared_scope',
      consentRequired: true,
      consentGranted: true,
      syncEnabled: true,
      deviceScope: 'all',
      confidence: 0.78,
      risk: 'green',
    },
    {
      capability: 'developer_platform',
      title: 'Developer access is scoped',
      detail: 'Extension readiness requires developer-scoped privacy mode and cannot bypass personal-data boundaries.',
      status: 'ready',
      privacyMode: 'developer_scoped',
      consentRequired: true,
      consentGranted: true,
      syncEnabled: false,
      deviceScope: 'desktop',
      confidence: 0.82,
      risk: 'green',
    },
    {
      capability: 'nova_intelligence',
      title: 'NOVA Intelligence orchestrates with review',
      detail: 'The assistant can connect operational, personal, life-domain, and advisory context without silent writes.',
      status: 'ready',
      privacyMode: 'private_sync',
      consentRequired: true,
      consentGranted: true,
      syncEnabled: true,
      deviceScope: 'all',
      confidence: 0.84,
      risk: 'green',
    },
  ];
}
