export type NovaReleaseId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

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
    status: "active",
    goal: "Add identity, memory, personal context, goals, habits, relationships, and a life timeline.",
    modules: [
      {
        id: "personal-identity",
        name: "Personal Identity",
        release: 2,
        status: "active",
        summary: "User profile, preferences, family context, and durable identity signals.",
        capabilities: ["Personal profile", "Family context", "Preference graph"],
        privacyNotes: ["Identity data is user-scoped and editable before it can inform recommendations."]
      },
      {
        id: "privacy-first-memory",
        name: "Privacy-first Memory Engine",
        release: 2,
        status: "foundation",
        summary: "Opt-in, inspectable memory with deletion, scope controls, and source attribution.",
        capabilities: ["Memory consent", "Memory review", "Memory deletion", "Source attribution", "Memory disabled by default"],
        privacyNotes: ["Memory must be user-visible, revocable, and never silently inferred into permanent storage."]
      },
      {
        id: "life-graph",
        name: "Interests, Goals, Habits, Relationships, Timeline",
        release: 2,
        status: "active",
        summary: "Personal planning data linked to daily operations without changing Emma OCC behavior.",
        capabilities: ["Interests", "Goals", "Habits", "Relationships", "Timeline"],
        privacyNotes: ["Life-graph records remain manually curated in Release 2."]
      }
    ]
  },
  {
    id: 3,
    name: "Release 3",
    title: "Life Domains",
    status: "active",
    goal: "Add finance, home, travel, health, and learning modules.",
    modules: [
      {
        id: "finance-domain",
        name: "Finance",
        release: 3,
        status: "active",
        summary: "Private financial planning records for budgets, obligations, subscriptions, savings, and reminders.",
        capabilities: ["Budgets", "Financial obligations", "Subscriptions", "Savings goals"],
        privacyNotes: ["Release 3 stores user-entered finance metadata only; no bank connection is activated."]
      },
      {
        id: "home-domain",
        name: "Home",
        release: 3,
        status: "active",
        summary: "Home operations records for maintenance, household tasks, utilities, documents, and recurring responsibilities.",
        capabilities: ["Maintenance", "Utilities", "Household tasks", "Home documents"],
        privacyNotes: ["Home records are manually curated and user-scoped."]
      },
      {
        id: "travel-domain",
        name: "Travel",
        release: 3,
        status: "active",
        summary: "Travel planning records for trips, documents, reservations, packing, and mobility preferences.",
        capabilities: ["Trips", "Reservations", "Travel documents", "Packing"],
        privacyNotes: ["Travel records do not change Emma OCC commute logic in Release 3."]
      },
      {
        id: "health-domain",
        name: "Health",
        release: 3,
        status: "active",
        summary: "Wellbeing records for appointments, routines, medications, recovery, and personal health notes.",
        capabilities: ["Appointments", "Medication notes", "Routines", "Recovery"],
        privacyNotes: ["Health records are sensitive, manually entered, and never used for diagnosis."]
      },
      {
        id: "learning-domain",
        name: "Learning",
        release: 3,
        status: "active",
        summary: "Learning records for courses, skills, reading, certifications, and progress tracking.",
        capabilities: ["Courses", "Skills", "Reading", "Certifications", "Progress"]
      }
    ]
  },
  {
    id: 4,
    name: "Release 4",
    title: "Intelligence and Automation",
    status: "active",
    goal: "Add prediction, recommendations, automation, context, and daily AI routines.",
    modules: [
      {
        id: "prediction-recommendation-engine",
        name: "Prediction and Recommendations",
        release: 4,
        status: "active",
        summary: "Personalized suggestions based on verified sources, confidence labels, and user consent.",
        capabilities: ["Prediction", "Recommendations", "Confidence labels", "Source attribution"],
        privacyNotes: ["Release 4 recommendations are advisory and must show source freshness before action."]
      },
      {
        id: "context-engine",
        name: "Context Engine",
        release: 4,
        status: "active",
        summary: "Connects operational, personal-core, and life-domain signals into a reviewable context layer.",
        capabilities: ["Context signals", "Source freshness", "Fallback labeling", "Cross-domain readiness"],
        privacyNotes: ["Context signals stay user-scoped and can be deleted with the underlying source records."]
      },
      {
        id: "automation-guardrails",
        name: "Automation Guardrails",
        release: 4,
        status: "foundation",
        summary: "Automation rules are stored as disabled-by-default candidates that require explicit confirmation before action.",
        capabilities: ["Automation candidates", "Manual approval", "Cooldown-aware actions", "No silent writes"],
        privacyNotes: ["NOVA cannot mutate calendar, commute, email, memory, or notification state from Release 4 automation without user confirmation."]
      },
      {
        id: "daily-ai-routines",
        name: "Daily AI",
        release: 4,
        status: "active",
        summary: "Daily AI routines use the existing OpenAI Responses API path with deterministic fallback and stored source labels.",
        capabilities: ["Daily brief", "OpenAI Responses API", "Deterministic fallback", "Suppressed update tracking"],
        privacyNotes: ["OpenAI calls use store=false and verified JSON context only."]
      }
    ]
  },
  {
    id: 5,
    name: "Release 5",
    title: "NOVA Intelligence",
    status: "active",
    goal: "Add multi-device sync, voice, vision, collaboration, developer platform, and advanced NOVA intelligence.",
    modules: [
      {
        id: "multi-device-sync",
        name: "Multi-device Sync",
        release: 5,
        status: "active",
        summary: "Device-aware continuity for installed PWA, phone, and desktop contexts with user-scoped sync records.",
        capabilities: ["Device registration", "Sync readiness", "PWA continuity", "Source freshness"],
        privacyNotes: ["Device records are user-scoped and can be revoked without deleting Emma OCC data."]
      },
      {
        id: "voice-interface",
        name: "Voice",
        release: 5,
        status: "foundation",
        summary: "Voice input and output readiness with consent, transcript control, and no always-listening behavior.",
        capabilities: ["Voice consent", "Transcript review", "Push-to-talk boundary"],
        privacyNotes: ["Voice remains explicit-session only; NOVA does not listen in the background."]
      },
      {
        id: "vision-interface",
        name: "Vision",
        release: 5,
        status: "foundation",
        summary: "Vision readiness for user-submitted images, documents, and screenshots with reviewable extraction.",
        capabilities: ["Image review", "Document extraction", "Vision consent", "Source attribution"],
        privacyNotes: ["Images are user-submitted and reviewable before extracted context is stored."]
      },
      {
        id: "collaboration-layer",
        name: "Collaboration",
        release: 5,
        status: "foundation",
        summary: "Family-focused collaboration boundaries for shared context without exposing private memory by default.",
        capabilities: ["Family sharing", "Shared tasks", "Scoped collaboration", "Private-by-default memory"],
        privacyNotes: ["Collaboration must never expose private memory, health, finance, or location records by default."]
      },
      {
        id: "developer-platform",
        name: "Developer Platform",
        release: 5,
        status: "foundation",
        summary: "Extension registry and API-readiness layer for safe future integrations.",
        capabilities: ["Extension registry", "Permission scopes", "Webhook readiness", "Audit trail"],
        privacyNotes: ["Developer extensions require explicit scopes and cannot receive service-role secrets."]
      },
      {
        id: "nova-intelligence-platform",
        name: "NOVA Intelligence",
        release: 5,
        status: "active",
        summary: "A unified intelligence layer that coordinates operational, personal, life-domain, and advisory records.",
        capabilities: ["Unified intelligence", "Cross-release context", "Privacy-first orchestration", "Mission assistant"],
        privacyNotes: ["NOVA Intelligence coordinates existing approved context; it does not bypass Release 2-4 consent gates."]
      }
    ]
  },
  {
    id: 6,
    name: "Release 6",
    title: "Production Readiness",
    status: "active",
    goal: "Harden NOVA for daily operational use with release gates, monitoring, rollback, privacy controls, and verified fallback behavior.",
    modules: [
      {
        id: "production-release-gates",
        name: "Production Release Gates",
        release: 6,
        status: "active",
        summary: "Tracks build, test, e2e, security, fallback, notification, and missed-duty safety gates before launch.",
        capabilities: ["Release checklist", "Build gate", "Test gate", "E2E gate", "Security gate", "Missed-duty safety gate"],
        privacyNotes: ["Release evidence stores status labels and references, not secrets or raw personal data."]
      },
      {
        id: "production-monitoring",
        name: "Monitoring and Health",
        release: 6,
        status: "active",
        summary: "Surfaces live integration health, source freshness, fallback labels, and operational status for daily use.",
        capabilities: ["Monitoring", "Integration health", "Source freshness", "Fallback verification", "Structured logging"],
        privacyNotes: ["Health reports must never include tokens, API keys, raw email bodies, or exact private location history."]
      },
      {
        id: "recovery-runbooks",
        name: "Recovery Runbooks",
        release: 6,
        status: "foundation",
        summary: "Documents rollback, integration-failure response, backup/recovery, and database migration rollback procedures.",
        capabilities: ["Rollback", "Backup and recovery", "Runbooks", "Migration rollback", "Failure response"],
        privacyNotes: ["Runbooks describe operational procedures without storing provider secrets."]
      },
      {
        id: "privacy-launch-controls",
        name: "Privacy Launch Controls",
        release: 6,
        status: "active",
        summary: "Validates OAuth scopes, encrypted token storage, location deletion, RLS coverage, and data minimization before launch.",
        capabilities: ["OAuth scope review", "Token storage review", "Location-data deletion", "Supabase RLS review", "Privacy controls"],
        privacyNotes: ["Launch is blocked if private memory, location, or token controls are not reviewable and revocable."]
      },
      {
        id: "commute-accuracy-loop",
        name: "Commute Accuracy Loop",
        release: 6,
        status: "foundation",
        summary: "Tracks planned-versus-actual commute outcomes so NOVA can improve warnings without silently changing duties.",
        capabilities: ["Planned-versus-actual commute accuracy", "Delayed departure review", "Missed-train review", "Manual outcome labels"],
        privacyNotes: ["Accuracy records are user-owned, deletable, and do not require continuous background GPS."]
      }
    ]
  },
  {
    id: 7,
    name: "Release 7",
    title: "Production Hardening and Launch",
    status: "active",
    goal: "Certify NOVA for production deployment with live integration checks, rollback rehearsal, device validation, accessibility, performance, and operational runbooks.",
    modules: [
      {
        id: "launch-certification",
        name: "Launch Certification",
        release: 7,
        status: "active",
        summary: "Tracks the final v1.0 gate across tests, builds, live health, fallback behavior, notification behavior, and deployment status.",
        capabilities: ["v1.0 release gate", "Production deployment", "Live health validation", "Fallback verification", "Notification verification"],
        privacyNotes: ["Launch status records evidence and gate labels only; private data remains behind user-scoped controls."]
      },
      {
        id: "device-accessibility-performance",
        name: "Device, Accessibility, and Performance",
        release: 7,
        status: "foundation",
        summary: "Separates real iPhone, Android, desktop, installed PWA, accessibility, performance, and battery checks from automated build gates.",
        capabilities: ["iPhone validation", "Android validation", "Installed PWA validation", "Accessibility testing", "Performance testing", "GPS battery review"],
        privacyNotes: ["Battery and device validation must not require continuous background location tracking."]
      },
      {
        id: "production-operations",
        name: "Production Operations",
        release: 7,
        status: "active",
        summary: "Keeps rollback, backup/recovery, release notes, and integration-failure runbooks visible before and after deployment.",
        capabilities: ["Rollback rehearsal", "Backup and recovery", "Release notes", "Integration failure runbooks", "Production monitoring"],
        privacyNotes: ["Operational runbooks must not contain secrets, tokens, or raw personal records."]
      }
    ]
  },
  {
    id: 8,
    name: "Release 8",
    title: "Post-launch Optimization",
    status: "active",
    goal: "Improve NOVA from real daily use with feedback loops, accuracy learning, mobile polish, privacy tuning, and monitored recommendations without adding silent automation.",
    modules: [
      {
        id: "usage-feedback-loop",
        name: "Usage Feedback Loop",
        release: 8,
        status: "active",
        summary: "Captures reviewable feedback about useful alerts, missed context, commute accuracy, and daily planning friction.",
        capabilities: ["Real-world feedback", "Improvement backlog", "Quality signals", "Human review"],
        privacyNotes: ["Feedback records store labels and summaries; private raw email, calendar, location, and memory content stays out of optimization notes."]
      },
      {
        id: "commute-duty-learning",
        name: "Commute and Duty Learning",
        release: 8,
        status: "active",
        summary: "Tunes planned-versus-actual commute predictions and duty-risk warnings from verified outcomes.",
        capabilities: ["Commute prediction accuracy", "Duty-risk forecasting", "Missed-train learning", "Delay pattern review"],
        privacyNotes: ["Learning uses explicit outcome labels and source freshness instead of continuous background tracking."]
      },
      {
        id: "personalized-daily-assistant",
        name: "Personalized Daily Assistant",
        release: 8,
        status: "foundation",
        summary: "Refines recommendations, daily planning, memory suggestions, and family context while keeping every action advisory.",
        capabilities: ["Personalized recommendations", "Proactive daily planning", "Memory recommendation review", "Family context tuning"],
        privacyNotes: ["Release 8 recommendations remain advisory unless the user explicitly confirms an external action."]
      },
      {
        id: "post-launch-platform-polish",
        name: "Platform Polish",
        release: 8,
        status: "foundation",
        summary: "Tracks mobile PWA refinements, notification quality, accessibility follow-ups, monitoring noise, and operational runbook improvements.",
        capabilities: ["Mobile PWA polish", "Notification quality", "Monitoring tuning", "Accessibility follow-ups", "Runbook refinement"],
        privacyNotes: ["Monitoring improvements must not increase exposed personal data or include secrets in logs."]
      }
    ]
  },
  {
    id: 9,
    name: "Release 9",
    title: "Mission Voice and Autonomous Intelligence",
    status: "active",
    goal: "Add a privacy-safe NOVA voice command layer and mission-intelligence router without always-listening behavior or silent external actions.",
    modules: [
      {
        id: "mission-voice-command",
        name: "Mission Voice Command",
        release: 9,
        status: "active",
        summary: "Push-to-talk voice commands route the user to daily brief, commute, calendar, notifications, settings, privacy, and optimization surfaces.",
        capabilities: ["NOVA voice command", "Push-to-talk", "Spoken replies", "Command routing", "Phone-ready control"],
        privacyNotes: ["Voice transcripts are processed in the browser session and are not stored by default."]
      },
      {
        id: "autonomous-mission-intelligence",
        name: "Autonomous Mission Intelligence",
        release: 9,
        status: "foundation",
        summary: "Mission priorities, predictive windows, next-best actions, and automation drafts are coordinated with explicit approval gates.",
        capabilities: ["Mission priorities", "Predictive windows", "Next-best action", "Automation drafts", "Incident learning"],
        privacyNotes: ["External actions remain advisory until the user explicitly confirms them."]
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
