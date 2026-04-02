<!-- Sync Impact Report
Version change: 0.0.0 → 1.0.0 (initial ratification)
Added sections: Core Principles (I–VI), Regional & Localization Standards, Development Workflow
Templates requiring updates: ✅ none pending at ratification
Deferred: none
-->

# Maintenance Center Owner App Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)
Every feature MUST begin with a specification before any code is written.
The order is always: Spec → Plan → Tasks → Implement.
No implementation may begin without an approved spec and task list.
Specifications describe WHAT and WHY — never HOW (no framework or tech details in specs).

### II. Bilingual First
Every user-facing string MUST have both Arabic and English variants.
Arabic is the primary language; English is the fallback.
All text MUST be delivered via i18n keys — hardcoded display strings are forbidden.
UI layouts MUST support RTL (Arabic) and LTR (English) simultaneously.
Entity fields with user-facing names follow the `nameAr` / `nameEn` pattern.

### III. Component-Driven UI
UI MUST be built from small, reusable, independently testable components.
Components follow NativeWind (Tailwind CSS) for styling — no inline `StyleSheet.create` unless strictly necessary.
Screens are compositions of components, not monolithic views.
Design tokens (colors, spacing, typography) are centralized and never hardcoded.

### IV. API Contract Adherence
The mobile app is a consumer of the Spring Boot backend API.
All data fetching MUST use RTK Query with typed endpoints.
The API base URL and auth headers MUST come from environment config — never hardcoded.
Authenticated requests MUST attach `Authorization: Bearer <jwt>`.
Error handling follows the backend's `BusinessErrorCode` contract.
Center owners authenticate with the same JWT flow as customers — the `UserType` field distinguishes them.

### V. Owner-Context Awareness
This app is used exclusively by maintenance center owners and their staff — NOT customers.
All screens and flows MUST reflect the operational perspective: managing bookings, responding to reviews, updating center profiles, viewing analytics.
No customer-facing discovery or booking flows belong in this app.
The center owner's identity is always tied to a specific `MaintenanceCenter` entity — all data operations are scoped to their center(s).

### VI. Security & Privacy
JWTs MUST be stored in encrypted secure storage — never in AsyncStorage plain text.
No PII may be logged to the console in production builds.
All API calls MUST use HTTPS.
Sensitive screens (center profile, financials) MUST re-authenticate if the session has expired.
Center owners MUST only be able to view and manage data belonging to their own center(s).

## Regional & Localization Standards

Kuwait is the primary market. All regional defaults MUST reflect this unless overridden by user preference.
- **Currency**: Kuwaiti Dinar (KD), displayed as `KD X.XXX` (3 decimal places)
- **Phone format**: `+965 XXXX XXXX`
- **Distance**: kilometers
- **Time zone**: Asia/Kuwait (UTC+3)
- **Calendar**: Gregorian (primary), Hijri display optional
- **Map provider**: Google Maps SDK via react-native-maps

## Development Workflow

- **Phase structure**: Each product phase has its own spec file under `.specify/specs/`
- **New feature**: `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`
- **Ambiguity**: Resolve with `/speckit.clarify` before planning — never assume
- **Testing**: Component tests before implementation (TDD where feasible)
- **State**: Redux Toolkit + RTK Query — no local component state for server data
- **Navigation**: Expo Router (file-based) — route files live in `app/`
- **Commits**: Conventional commits (`feat:`, `fix:`, `chore:`, etc.)

## Governance

This constitution supersedes all other coding conventions and README guidance.
Amendments require: (1) a clear rationale, (2) a version bump per semver rules, and (3) updates to all dependent spec/plan/tasks templates.
All specs MUST be reviewed for compliance with this constitution before planning begins.
The CLAUDE.md file is the authoritative backend reference — mobile specs MUST align with it.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02
