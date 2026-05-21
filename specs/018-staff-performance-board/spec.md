# Feature Specification: Staff Performance Board

**Feature Branch**: `018-staff-performance-board`  
**Created**: 2026-05-21  
**Status**: Draft  
**Prerequisites**: Spec 015 (Staff Management Foundation), Spec 016 (Attention Required Panel), Spec 017 (Live Pipeline & KPIs)

---

## Overview

A staff performance board embedded in the branch manager's dashboard that answers the manager's most common question: *"Who needs help, who has capacity, and who should I be worried about?"*

The board surfaces each technician's current workload and recent performance in a single glance. It visually flags overloaded staff and staff showing declining performance, and lets the manager redistribute work in one tap without navigating away.

**Who uses this**:
- **Branch Manager** — primary user. Rebalances workload, spots bottlenecks, coaches proactively.
- **Center Owner** — same view, plus drill-down access to per-staff historical metrics for coaching and performance conversations.
- **Technician** — never sees sensitive peer indicators (see Ethics Guardrail).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Instant Workload Overview (Priority: P1)

A branch manager opens the dashboard and immediately sees every active technician in their branch listed on the board. Each row shows the technician's name, current status, and how many active bookings they hold. Overloaded staff appear at the top, highlighted visually. The manager can tell in under ten seconds who has too much and who has capacity.

**Why this priority**: This is the board's core value. Without it, none of the downstream actions (rebalancing, coaching) are possible.

**Independent Test**: The board can be shipped with just this story — a read-only list — and immediately delivers value by replacing manual mental accounting.

**Acceptance Scenarios**:

1. **Given** a branch with 5 active technicians, **When** the manager opens the dashboard, **Then** all 5 appear on the board sorted per the defined sort order (Overloaded → Needs Attention → rest by active booking count descending).
2. **Given** Ahmed has 6 active bookings and the branch average non-zero load is 2, **When** the board loads, **Then** Ahmed's card is flagged "Overloaded" and appears first.
3. **Given** Yousef has zero active bookings and was active within the last 8 business hours, **When** the board loads, **Then** Yousef shows status "Available".
4. **Given** Fahad has not had any activity in the last 8 hours during business hours, **When** the board loads, **Then** Fahad shows status "Offline".
5. **Given** a branch with only one technician, **When** the board loads, **Then** no one is flagged "Overloaded" regardless of their booking count (single-person branch — no peers to compare against).

---

### User Story 2 — Performance Tier Badges (Priority: P2)

The manager sees a performance tier badge alongside each technician's name. The badge reflects a composite score of completion volume, customer ratings, and on-time rate for the current month. A technician with quietly declining ratings gets a "Needs Attention" badge before a bad review is posted publicly.

**Why this priority**: Detection before a customer complaint is the core value proposition. Without tiers, the board is just a workload counter.

**Independent Test**: Can be tested end-to-end by setting up test data with varying ratings and completion rates and verifying the correct tier badge appears on each card.

**Acceptance Scenarios**:

1. **Given** a technician has a high average rating (≥ configured threshold), high on-time rate (≥ configured threshold), and sufficient completed volume this month (≥ configured minimum), **When** the board loads, **Then** their badge reads "Top Performer".
2. **Given** a technician's rating has dropped by more than the configured delta versus last month, **When** the board loads, **Then** their badge reads "Needs Attention" and they appear in sort position 2 (after Overloaded).
3. **Given** a technician has zero completed bookings ever, **When** the board loads, **Then** their tier defaults to "On Track" with a "New" indicator, and stats display as "—" rather than zeros.
4. **Given** a technician joined mid-month, **When** the board loads, **Then** their first month uses a pro-rated baseline for tier calculation.
5. **Given** all tier thresholds are stored in configuration (not hardcoded), **When** an administrator changes a threshold, **Then** the next board refresh reflects the new threshold without any code change.

---

### User Story 3 — One-Tap Rebalance (Priority: P2)

The manager taps "Rebalance" and sees only the overloaded technicians with their individual booking lists. They tap a booking to reassign it to an available technician. After confirming, both technicians' active counts update immediately on the board.

**Why this priority**: Reading the imbalance is useful; fixing it in the same flow doubles the value. Removing the need to navigate to booking detail and manually reassign each one justifies the feature's existence.

**Independent Test**: Can be tested by creating an overloaded state in test data and verifying the full assign-confirm-reflect cycle works end-to-end.

**Acceptance Scenarios**:

1. **Given** the manager is on the dashboard with at least one overloaded technician, **When** they tap "Rebalance", **Then** a focused view opens showing only overloaded staff and their active booking list.
2. **Given** the rebalance view is open, **When** the manager selects a booking and picks a destination technician (Available or On Task, not Overloaded), **Then** a confirmation dialog appears before any change is applied.
3. **Given** the manager confirms a reassignment, **When** the server accepts, **Then** both source and destination staff cards update their active booking counts immediately (optimistic update).
4. **Given** the manager confirms a reassignment, **When** the server rejects (e.g., booking already completed), **Then** the optimistic update is rolled back and an error message is shown.
5. **Given** the board returns to normal view after rebalancing, **When** no overloaded staff remain, **Then** the "Rebalance" button is hidden or disabled.

---

### User Story 4 — Trend Arrows (Priority: P3)

Each staff card shows a small trend arrow when the technician's composite score has changed meaningfully versus last month. An upward arrow signals improvement; a downward arrow signals decline. This allows the manager to catch a trajectory before it becomes a tier change.

**Why this priority**: Value-add over tier badges — shows direction, not just current state. Lower priority because tier badges already surface the critical cases.

**Independent Test**: Can be tested by crafting month-over-month test data and verifying arrow direction matches the score delta.

**Acceptance Scenarios**:

1. **Given** a technician's composite score increased by more than the configured meaningful-change threshold versus last month, **When** the board loads, **Then** an upward trend arrow is displayed on their card.
2. **Given** a technician's composite score decreased by more than the threshold, **When** the board loads, **Then** a downward trend arrow is displayed — visible only to Branch Managers and Center Owners, never to peer technicians.
3. **Given** the score change is within the threshold (noise), **When** the board loads, **Then** no trend arrow is displayed.

---

### User Story 5 — Per-Staff Drill-Down (Priority: P3)

The manager taps a staff card to open that technician's detail screen. It shows month-by-month metrics for the last several months, the technician's recent bookings, and customer reviews specifically tied to bookings they completed.

**Why this priority**: Supports coaching conversations and compensation decisions but is not needed for day-to-day workload management.

**Independent Test**: Can be tested by navigating to the detail screen for a technician with known historical data and verifying the aggregated metrics match expected values.

**Acceptance Scenarios**:

1. **Given** the manager taps a staff card, **When** the detail screen opens, **Then** it shows monthly metrics (bookings completed, average rating, on-time rate) for at least the last 3 months.
2. **Given** a booking was reassigned multiple times, **When** it appears in a technician's attribution, **Then** the rating is attributed to the technician who completed it, and time-to-completion is measured from when they personally received the booking.
3. **Given** a technician has zero months of history, **When** their detail screen opens, **Then** it shows their current month with "—" for metrics they have not yet accumulated.

---

### Edge Cases

- **Single-technician branch**: "Overloaded" status is never shown. The Rebalance button does not appear. The board still shows the one technician's status and tier.
- **Staff member with zero lifetime completed bookings**: Tier defaults to "On Track" with a "New" indicator. All metric cells display "—" (em dash), not "0", to prevent misreading as failure.
- **Staff member who joined mid-month**: Their first-month tier is calculated against a pro-rated baseline (e.g., if they joined 15 days into a 30-day month, volume targets are halved).
- **Booking reassigned multiple times**: Rating attribution and time-to-completion go to the technician who completed the booking, not the original or intermediate assignees.
- **All technicians are overloaded**: Every card is flagged; Rebalance opens but the destination picker only offers technicians whose load would drop to On Task or Available after a move.
- **No active bookings across the whole branch**: Average non-zero load is zero, so the "twice the average" rule cannot fire. No one is flagged Overloaded.
- **Board loaded outside business hours**: "Offline" status is suppressed (or shown as "Away") since inactivity outside business hours is expected behavior and should not trigger a coaching alert.

---

## Requirements *(mandatory)*

### Functional Requirements

**Board Display**

- **FR-001**: The board MUST list all active staff members of the current branch, one card per person.
- **FR-002**: Each staff card MUST display: full name, avatar (photo if available, initials fallback), current status label, active bookings count, average customer rating for the current month, average completion time for the current month, and a performance tier badge.
- **FR-003**: The board MUST sort cards in this fixed order: (1) Overloaded staff, (2) Needs Attention tier, (3) all others by active booking count descending.
- **FR-004**: The board MUST support pull-to-refresh; data does not need to be real-time but MUST be refreshable on demand.

**Status Labels**

- **FR-005**: The system MUST assign status "Available" when a technician has zero active bookings and has been active within the last 8 business hours.
- **FR-006**: The system MUST assign status "On Task" when a technician has one or more active bookings and their count is within normal range (not Overloaded).
- **FR-007**: The system MUST assign status "Overloaded" when a technician's active booking count exceeds twice the branch's average non-zero active load, AND the branch has more than one active technician.
- **FR-008**: The system MUST assign status "Offline" when a technician has had no activity in the last 8 hours during business hours.
- **FR-009**: "Offline" status MUST NOT be assigned outside of the branch's defined business hours.

**Performance Tiers**

- **FR-010**: The system MUST assign one of four tiers to each technician: Top Performer, Strong, On Track, or Needs Attention.
- **FR-011**: Tier thresholds (minimum rating, minimum on-time rate, minimum completed volume, meaningful decline delta) MUST be stored in configuration, not hardcoded, so they can be adjusted without a code release.
- **FR-012**: A technician with zero lifetime completed bookings MUST default to "On Track" tier with a "New" indicator; their metric fields MUST display "—" rather than zero.
- **FR-013**: A technician who joined mid-month MUST have their first-month tier calculated against a pro-rated baseline.

**Trend Arrows**

- **FR-014**: The board MUST display a trend arrow on a staff card when the technician's composite score has changed by more than the configured meaningful-change threshold versus the previous month.
- **FR-015**: Downward trend arrows and "Needs Attention" badges MUST NOT be visible to technicians viewing any staff-related surface. This restriction MUST be enforced server-side, not only in the client.

**Rebalance Action**

- **FR-016**: The board MUST display a "Rebalance" button when at least one technician is in "Overloaded" status and the branch has more than one active technician.
- **FR-017**: The Rebalance view MUST show only overloaded technicians and their individual active booking lists.
- **FR-018**: Each booking in the Rebalance view MUST be assignable to a different technician at the same branch who is currently Available or On Task.
- **FR-019**: The system MUST require explicit confirmation before applying a booking reassignment.
- **FR-020**: On confirmed reassignment, both source and destination staff cards MUST update their active booking counts immediately (optimistic update), with automatic rollback and an error message if the server rejects the change.

**Per-Staff Drill-Down**

- **FR-021**: Tapping a staff card MUST open a detail screen for that technician showing: month-by-month metrics for at least the last 3 months (bookings completed, average rating, on-time rate), a list of their recent bookings, and customer reviews tied specifically to bookings they completed.
- **FR-022**: Rating attribution for a reassigned booking MUST go to the technician who completed it. Time-to-completion for that technician MUST be measured from when they received the booking, not when it was originally created.

**Ethics Guardrail**

- **FR-023**: The server MUST strip "Needs Attention" tier labels, downward trend arrows, and Overloaded status from any response delivered to a technician-role session — role enforcement is a server responsibility, not a client-side toggle.
- **FR-024**: A technician-facing view of staff data, if ever built, MUST show only the authenticated technician's own metrics plus an anonymized branch median — no peer-identifying performance data.

**Internationalization**

- **FR-025**: All labels, status strings, tier names, and metric headings MUST be available in both Arabic and English, with correct RTL layout when Arabic is the active language.
- **FR-026**: The board MUST remain usable on screens as narrow as 375 px without horizontal overflow, with detail rows collapsing progressively as space contracts.

---

### Key Entities

- **StaffPerformanceCard**: Aggregated snapshot of one technician's current state for the board — includes status, tier, active booking count, monthly rating, monthly average completion time, trend direction, and composite score delta versus prior month.
- **PerformanceTierConfig**: Configurable thresholds for tier assignment — minimum rating per tier, minimum on-time rate, minimum completed volume, meaningful-change delta for trend arrows. Mutable by administrators without a code release.
- **StaffMonthlyMetrics**: A technician's aggregated stats for one calendar month — completed bookings count, average customer rating, average completion time, on-time rate, complaint count. Used for both the board card and the drill-down history view.
- **RebalanceSuggestion**: A transient view model combining one overloaded technician's active booking list with the eligible colleague list (Available or On Task) available to receive each booking.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A branch manager can identify all Overloaded and Needs Attention technicians in their branch in under 10 seconds from opening the dashboard, without filtering or scrolling on a standard phone screen with up to 10 technicians.
- **SC-002**: A manager can complete a full rebalance — select overloaded booking, pick destination technician, confirm — in under 3 taps and 30 seconds.
- **SC-003**: After a confirmed reassignment, both affected staff cards reflect the updated active booking count before the manager can navigate away (visible within 200 ms of confirmation tap).
- **SC-004**: A test session authenticated with the Technician role receives zero "Needs Attention" labels, zero downward trend arrows, and zero "Overloaded" badges for peers in any staff-related API response or rendered screen — verified by an explicit automated test.
- **SC-005**: Tier badges accurately reflect a technician's performance state within the data-refresh window; a technician whose metrics cross a threshold appears in the correct tier no later than the next manual refresh.
- **SC-006**: The board renders correctly in both Arabic (RTL) and English on screens as narrow as 375 px without layout overflow or truncated labels.
- **SC-007**: Performance tier thresholds can be changed by an operator without a code release or redeployment, and the change takes effect on the next board refresh.

---

## Assumptions

- Staff members exist in the system and bookings can be assigned to them — Spec 015 (Staff Management Foundation) is completed and deployed before this spec is implemented.
- The dashboard structure hosting this board exists — Spec 016 (Attention Required Panel) and Spec 017 (Live Pipeline & KPIs) are completed.
- "Business hours" for Offline status calculation are defined per-branch using the center's existing `openingTime` / `closingTime` profile fields.
- "Composite score" is a weighted average of (completed bookings count normalized to branch baseline, average customer rating, on-time rate). Exact weights are part of PerformanceTierConfig and not hardcoded.
- "On-time" is defined as a booking completed by the scheduled `bookingDate`/`bookingTime` end; any completion after that time is counted as late.
- Data freshness of minutes (not seconds) is acceptable — pull-to-refresh is sufficient; WebSocket push is not required for metric aggregates.
- The Rebalance feature operates on currently active (non-completed, non-cancelled) bookings only.
- Per-staff drill-down is accessible to Branch Managers and Center Owners only. Technicians cannot navigate to peer drill-down screens.
- The backend already persists assignment timestamps (when a booking was assigned to a specific technician) — required to support FR-022 time-to-completion attribution.
- Arabic is the primary language; all bilingual fields follow the existing `nameAr` / `nameEn` codebase convention.
- No scheduling, shift management, payroll, commission, or automated coaching delivery is in scope for this spec.
