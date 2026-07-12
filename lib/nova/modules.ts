export type NovaReleaseId = 1 | 2 | 3 | 4 | 5;

export type NovaModuleStatus = "active" | "foundation" | "planned";

export type NovaModule = {
  id: string;
  name: string;
  release: NovaReleaseId;
  status: NovaModuleStatus;
  summary: string;
  preservesEmmaOcc?: boolean;
  capabilities: string[];
  privacyNotes?: string[];
};

export type NovaRelease = {
  id: NovaReleaseId;
  name: string;
  title: string;
  status: "active" | "planned";
  goal: string;
  modules: NovaModule[];
};

export const NOVA_RELEASES: NovaRelease[] = [
  {
    id: 1,
    name: "Release 1",
    title: "Foundation",
    status: "active",
    goal: "Preserve Emma OCC while establishing NOVA as a modular personal operating system.",
    modules: [
      {
        id: "emma-occ",
        name: "Emma OCC",
        release: 1,
        status: "active",
        preservesEmmaOcc: true,
        summary: "Operational control remains the first-class module for duties, roster awareness, commute readiness, and alerts.",
        capabilities: [
          "Mission Control dashboard",
          "Roster and duty accounting",
          "Sick leave and vacation accounting",
          "Google Calendar",
          "Gmail",
          "Google Maps",
          "NS commute reference",
          "Weather",
          "GPS",
          "Geofencing",
          "Notifications"
        ],
        privacyNotes: ["Operational data stays scoped to the authenticated Supabase user."]
      },
      {
        id: "mission-control-shell",
        name: "Mission Control Shell",
        release: 1,
        status: "foundation",
        summary: "The dashboard shell, navigation, theme, language layer, and live clock form the shared command surface.",
        capabilities: ["Responsive dashboard layout", "EN/ES/FR interface shell", "Local and UTC time", "NOVA visual system"],
        privacyNotes: ["Language and accessibility preferences are user-scoped."]
      },
      {
        id: "integration-provider-layer",
        name: "Integration Provider Layer",
        release: 1,
        status: "foundation",
        summary: "Live integrations are exposed through provider health, source freshness, fallback labels, and retry-aware boundaries.",
        capabilities: ["Supabase", "Google Calendar", "Gmail", "Google Maps", "NS", "Weather", "OpenAI Responses API"],
        privacyNotes: ["Provider fallbacks must be clearly labeled before they influence operational decisions."]
      },
      {
        id: "privacy-security-baseline",
        name: "Privacy and Security Baseline",
        release: 1,
        status: "foundation",
        summary: "Row-level security, token encryption, health checks, and location deletion controls anchor the platform.",
        capabilities: ["Supabase RLS", "Encrypted Google tokens", "Location-data deletion", "Integration health checks", "Secrets hygiene"],
        privacyNotes: ["No memory module is active until privacy-first controls are implemented in Release 2."]
      }
    ]
  },
  {
    id: 2,
    name: "Release 2",
    title: "Personal Core",
    status: "planned",
    goal: "Add identity, memory, personal context, goals, habits, relationships, and a life timeline.",
    modules: [
      {
        id: "personal-identity",
        name: "Personal Identity",
        release: 2,
        status: "planned",
        summary: "User profile, preferences, family context, and durable identity signals.",
        capabilities: ["Personal profile", "Family context", "Preference graph"]
      },
      {
        id: "privacy-first-memory",
        name: "Privacy-first Memory Engine",
        release: 2,
        status: "planned",
        summary: "Opt-in, inspectable memory with deletion, scope controls, and source attribution.",
        capabilities: ["Memory consent", "Memory review", "Memory deletion", "Source attribution"],
        privacyNotes: ["Memory must be user-visible, revocable, and never silently inferred into permanent storage."]
      },
      {
        id: "life-graph",
        name: "Interests, Goals, Habits, Relationships, Timeline",
        release: 2,
        status: "planned",
        summary: "Personal planning data linked to daily operations without changing Emma OCC behavior.",
        capabilities: ["Interests", "Goals", "Habits", "Relationships", "Timeline"]
      }
    ]
  },
  {
    id: 3,
    name: "Release 3",
    title: "Life Domains",
    status: "planned",
    goal: "Add finance, home, travel, health, and learning modules.",
    modules: [
      {
        id: "life-domain-suite",
        name: "Finance, Home, Travel, Health, Learning",
        release: 3,
        status: "planned",
        summary: "Structured personal domains that can feed recommendations after explicit configuration.",
        capabilities: ["Finance", "Home", "Travel", "Health", "Learning"]
      }
    ]
  },
  {
    id: 4,
    name: "Release 4",
    title: "Intelligence and Automation",
    status: "planned",
    goal: "Add prediction, recommendations, automation, context, and daily AI routines.",
    modules: [
      {
        id: "prediction-recommendation-engine",
        name: "Prediction and Recommendations",
        release: 4,
        status: "planned",
        summary: "Personalized suggestions based on verified sources, confidence labels, and user consent.",
        capabilities: ["Prediction", "Recommendations", "Context engine", "Automation", "Daily AI"]
      }
    ]
  },
  {
    id: 5,
    name: "Release 5",
    title: "NOVA Intelligence",
    status: "planned",
    goal: "Add multi-device sync, voice, vision, collaboration, developer platform, and advanced NOVA intelligence.",
    modules: [
      {
        id: "nova-intelligence-platform",
        name: "NOVA Intelligence",
        release: 5,
        status: "planned",
        summary: "Multi-modal and collaborative platform capabilities built on the privacy and integration foundations.",
        capabilities: ["Multi-device sync", "Voice", "Vision", "Collaboration", "Developer platform", "NOVA Intelligence"]
      }
    ]
  }
];

export const REQUIRED_FOUNDATION_CAPABILITIES = [
  "Mission Control dashboard",
  "Google Calendar",
  "Gmail",
  "Google Maps",
  "NS commute reference",
  "Weather",
  "GPS",
  "Geofencing",
  "Supabase",
  "OpenAI Responses API",
  "EN/ES/FR interface shell",
  "Supabase RLS"
];

export function getNovaRelease(id: NovaReleaseId) {
  return NOVA_RELEASES.find((release) => release.id === id);
}

export function getAllNovaModules() {
  return NOVA_RELEASES.flatMap((release) => release.modules);
}

export function getActiveNovaModules() {
  return getAllNovaModules().filter((module) => module.status === "active" || module.status === "foundation");
}

export function getPlannedNovaModules() {
  return getAllNovaModules().filter((module) => module.status === "planned");
}

export function findModulesByCapability(capability: string) {
  return getAllNovaModules().filter((module) => module.capabilities.includes(capability));
}

export function getMissingFoundationCapabilities() {
  return REQUIRED_FOUNDATION_CAPABILITIES.filter((capability) => findModulesByCapability(capability).length === 0);
}
