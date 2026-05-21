# Feature Specification: Dashboard Pipeline & KPI Cards

**Feature Branch**: `017-dashboard-pipeline-kpi`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Replace the existing five vanity stat cards on the branch manager dashboard with two purposeful sections: a live pipeline visualization showing where every active booking currently sits, and four trend-aware KPI cards showing whether the branch is performing better or worse than usual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Pipeline Bottleneck Scan (Priority: P1)

A branch manager opens the dashboard mid-morning to get an instant read on the shop floor. She sees a horizontal pipeline strip where each active work stage displays a count chip. One stage — "In Progress" — shows a chip roughly three times wider than the others, and a warning caption reads "Bottleneck detected here." She taps that chip and lands directly on the bookings list pre-filtered to "In Progress" so she can act immediately.

**Why this priority**: Spotting a bottleneck early and drilling into it is the single most operationally valuable action this dashboard enables. Without this, managers react after problems occur rather than before.

**Independent Test**: Can be fully tested by seeding bookings across stages in a test environment and verifying the pipeline renders accurate counts, flags the correct bottleneck stage, and navigates to the right filtered list on tap. Delivers immediate operational value even if KPI cards are not yet present.

**Acceptance Scenarios**:

1. **Given** the branch has bookings distributed across multiple work stages, **When** the manager opens the dashboard, **Then** a horizontal pipeline strip shows all six active stages (Received, Diagnosing, Quote, In Progress, Quality Check, Ready for Pickup) each with its current booking count displayed on the chip.

2. **Given** one stage holds at least twice as many bookings as the arithmetic mean of the other five non-terminal stages, **When** the pipeline renders, **Then** that stage's chip is visually highlighted and a caption reads "Bottleneck detected: [Stage Name]" (equivalent in Arabic when locale is AR).

3. **Given** no stage exceeds 2× the mean of the others, **When** the pipeline renders, **Then** no bottleneck caption appears and no stage is highlighted as a bottleneck.

4. **Given** a stage currently has zero bookings, **When** the pipeline renders, **Then** the stage chip still appears at a minimum visible width with a "0" count — empty stages remain visible.

5. **Given** the manager taps a stage chip, **When** navigation resolves, **Then** the bookings list screen opens pre-filtered to show only bookings in that specific work stage.

6. **Given** terminal stages (Picked Up, Cancelled) have bookings, **When** the pipeline renders, **Then** those stages are not shown in the pipeline strip.

---

### User Story 2 - Trend-Aware KPI Card Review (Priority: P2)

A center owner checks the dashboard at end-of-day. Below the pipeline strip she sees four KPI cards arranged in a 2×2 grid. Each card shows the metric name, the current value, and a colored delta badge — green arrow for "good" direction, red arrow for "bad" direction. She quickly reads: Bookings Today 12 (+20% vs. same day last week), Completion Time 3.2 h (−8% vs. 30-day avg, green), On-Time Rate 78% (−5% vs. prior 7 days, red), Revenue Today 45.500 KWD (+12% vs. 30-day avg, green). She decides the on-time rate needs attention and switches to the bookings list.

**Why this priority**: Four well-chosen KPIs with trend direction answer "is today better or worse than normal?" — which is the question no manager can currently answer with the vanity stats. P2 because the pipeline (P1) gives immediate action signals; the KPIs give strategic context.

**Independent Test**: Can be fully tested by populating historical booking data and verifying each card displays the correct value, correct delta, correct color, and correct subtitle. Delivers standalone value even if the pipeline section is not yet present.

**Acceptance Scenarios**:

1. **Given** the branch has at least one booking today, **When** the KPI cards load, **Then** the "Bookings Today" card shows the count for the current calendar day and a delta percentage compared to the booking count from the same weekday one week ago, displayed with a directional arrow and appropriate color (green = more bookings, red = fewer).

2. **Given** some bookings completed today have a recorded duration, **When** the KPI cards load, **Then** the "Average Completion Time" card shows today's average in hours (one decimal) and a delta versus the 30-day historical average — where a positive delta (taking longer) is colored red.

3. **Given** bookings from the last 7 days have completion timestamps and estimated times, **When** the KPI cards load, **Then** the "On-Time Completion Rate" card shows a whole-number percentage, the 90% target threshold, a delta versus the previous 7 days, and red coloring when the rate is below target or declining.

4. **Given** today has revenue data from completed paid bookings, **When** the KPI cards load, **Then** the "Revenue Today" card shows the KWD amount with three decimal places and a delta versus the 30-day average daily revenue, with green for positive and red for negative.

5. **Given** the comparison baseline for any KPI is zero (e.g., no bookings on the comparison day), **When** the delta is computed, **Then** the delta displays as "—" rather than "∞%" or "NaN%".

6. **Given** the branch has insufficient history for a KPI (fewer data points than the comparison window requires), **When** the KPI card loads, **Then** the delta area shows "—" with the subtitle "Not enough history yet" instead of a percentage.

---

### User Story 3 - Auto-Refresh While Dashboard Is Focused (Priority: P3)

A manager leaves the dashboard open on a desk device while coordinating the floor. Every 60 seconds the pipeline counts and KPI values update silently. When a job moves from In Progress to Quality Check, the next refresh cycle reflects the new counts without requiring a manual pull-to-refresh.

**Why this priority**: Valuable for always-on monitoring but not blocking — the core value (pipeline + KPIs) exists without it.

**Independent Test**: Can be verified by observing pipeline count changes after moving a booking's stage, within 60 seconds, without any user gesture.

**Acceptance Scenarios**:

1. **Given** the dashboard is the focused screen, **When** 60 seconds elapse, **Then** both the pipeline counts and all four KPI values silently refresh without a visible loading flash or layout shift.

2. **Given** the user navigates away from the dashboard tab, **When** the 60-second interval fires, **Then** no background fetch occurs — the interval is paused while the screen is not focused.

---

### Edge Cases

- **Zero active bookings**: Pipeline renders all six stage chips at minimum width with count 0; stage labels remain visible so the manager can see the workflow structure.
- **All bookings concentrated in one stage**: That single stage triggers the bottleneck flag because it is ≥ 2× the mean of the others (all 0).
- **New branch with no history**: All four KPI delta fields show "—" with caption "Not enough history yet". Card values show current-period data if any exists, otherwise 0.
- **Baseline day had zero bookings**: Delta shows "—" rather than dividing by zero.
- **Revenue data unavailable** (payment integration not yet active): Revenue card shows "—" for both value and delta, with a subtitle indicating revenue tracking is not yet available.
- **RTL layout (Arabic)**: Pipeline flows right-to-left; directional arrows on delta badges reverse; KWD currency symbol placement follows Arabic locale conventions.
- **Narrow device (360 px)**: All six stage chips fit horizontally with abbreviated stage labels; the 2×2 KPI grid remains a true 2×2 layout, not a single column.
- **Network error during refresh**: The last successfully loaded values remain displayed with a subtle stale-data indicator; the screen does not blank out or crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST display a live pipeline strip showing exactly the six active work stages: Received, Diagnosing, Quote, In Progress, Quality Check, Ready for Pickup — in this order (reversed in RTL).
- **FR-002**: Each pipeline stage chip MUST display the current count of bookings at that stage; chip width MUST scale proportionally to its count relative to the maximum count among the six chips.
- **FR-003**: Each pipeline stage chip MUST have a minimum visible width so that stages with zero bookings remain visible and labeled.
- **FR-004**: The system MUST flag a bottleneck when one stage's count is ≥ 2× the arithmetic mean of the remaining five stages' counts, and MUST visually highlight that stage and display an explanatory caption naming it.
- **FR-005**: Tapping a pipeline stage chip MUST navigate to the bookings list screen pre-filtered to that work stage.
- **FR-006**: Terminal stages (Picked Up, Cancelled) MUST be excluded from the pipeline strip.
- **FR-007**: The dashboard MUST display four KPI cards in a 2×2 grid below the pipeline strip.
- **FR-008**: The "Bookings Today" KPI MUST show the count of bookings for the current calendar day and a delta versus the same weekday one week prior.
- **FR-009**: The "Average Completion Time" KPI MUST show today's average job completion duration in hours (one decimal) and a delta versus the 30-day rolling average; a positive delta (longer duration) MUST be colored red.
- **FR-010**: The "On-Time Completion Rate" KPI MUST show the percentage of bookings in the last 7 days completed within their estimated time (whole number), a visible 90% target, and a delta versus the previous 7-day window.
- **FR-011**: The "Revenue Today" KPI MUST show total revenue from completed paid bookings today in KWD (3 decimal places) and a delta versus the 30-day average daily revenue.
- **FR-012**: Each KPI card MUST display: metric label, current value, delta percentage with directional arrow, a short baseline subtitle, and color-coded direction (green = good direction, red = bad direction, per-metric polarity).
- **FR-013**: When the comparison baseline is zero or history is insufficient, the delta MUST display as "—" with the subtitle "Not enough history yet" — never "∞%", "NaN%", or an error state.
- **FR-014**: The dashboard MUST auto-refresh both pipeline counts and KPI values every 60 seconds while the screen is focused; the interval MUST pause when the screen is not focused.
- **FR-015**: All labels, captions, and subtitles MUST render in the user's active language (English or Arabic) with RTL layout applied when Arabic is selected.
- **FR-016**: The pipeline strip MUST remain readable on devices with a screen width of approximately 360 px without horizontal overflow or truncated chip labels.

### Key Entities

- **Pipeline Stage**: One of the six active work stages. Has a bilingual name, a current booking count, a proportional width derived from that count, and a bottleneck flag computed at render time.
- **KPI Card**: A metric snapshot containing a bilingual label, a current value, a comparison baseline value, a computed delta percentage, a direction polarity (whether a positive delta is good or bad), and an insufficient-history flag.
- **Bottleneck Signal**: A derived, read-only state computed from pipeline counts. Triggers when one stage count ≥ 2× the mean of the other five. No write operations involved.
- **Dashboard Snapshot**: The aggregate payload returned by the dashboard analytics endpoint, combining pipeline stage counts and all four KPI metric values (current + baseline) in a single response to minimize round trips and enable consistent rendering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A branch manager can visually identify the work stage with the most bookings within 3 seconds of the dashboard loading, without tapping or scrolling.
- **SC-002**: The bottleneck caption appears for a stage if and only if its count is ≥ 2× the mean of the other five stages — verified across at least five different count distributions, including balanced, skewed, and all-zero scenarios.
- **SC-003**: Tapping any pipeline stage chip navigates to the correctly filtered bookings list 100% of the time across all six stages.
- **SC-004**: All four KPI delta values display "—" (not an error, "∞%", or "NaN%") when the comparison baseline is zero — verified independently for each of the four cards.
- **SC-005**: The pipeline strip and 2×2 KPI grid render without horizontal overflow or text truncation on a 360 px wide screen in both LTR and RTL layout modes.
- **SC-006**: After a booking is manually advanced to a different work stage, the pipeline count for both the source and destination stages reflects the change within 60 seconds (one auto-refresh cycle).
- **SC-007**: All text, labels, and captions render in the user's selected language (Arabic or English) with no untranslated keys visible.
- **SC-008**: Revenue values display with exactly 3 decimal places and the KWD label, matching Kuwaiti Dinar formatting conventions in both locale variants.

## Assumptions

- The backend exposes a dedicated dashboard analytics endpoint returning pipeline stage counts and all four KPI metrics (with their baseline values) in a single response — the frontend does not compute historical averages client-side from raw booking lists.
- Granular work stage tracking is already implemented server-side as a prerequisite (each booking has a current work stage updated as it progresses); this spec does not introduce that tracking mechanism.
- "Estimated completion time" is already a recorded field on bookings; bookings without this field are excluded from on-time rate calculations rather than counted as late.
- Revenue data is derived from bookings with a confirmed paid payment status; if payment integration is not yet active, the Revenue KPI card gracefully displays "—" without an error state.
- Both Center Owner and Branch Manager (Staff) roles see the same dashboard view in this spec; role-specific metric hiding (e.g., concealing revenue from staff) is deferred to Spec 4 (staff-level breakdowns).
- The "same weekday last week" comparison for Bookings Today uses the calendar day exactly 7 days prior (e.g., Wednesday compares to the previous Wednesday) to account for weekly demand patterns.
- Auto-refresh is implemented using a focus-aware polling mechanism; background fetches do not occur while the dashboard tab is not active.
- Staff Management Foundation (Spec 015) and Attention Required panel (Spec 016) are implemented and merged before this feature begins development.
- Minimum supported screen width is 360 px, as established in project-wide constraints.
