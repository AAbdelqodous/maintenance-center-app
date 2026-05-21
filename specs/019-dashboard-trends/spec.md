# Feature Specification: Dashboard Historical Trends Section

**Feature Branch**: `019-dashboard-trends`  
**Created**: 2026-05-21  
**Status**: Draft  
**Input**: User description: "Add a trends section to the branch manager dashboard showing 8 weeks of historical performance across bookings, ratings, revenue, demand mix, and peak hours."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Weekly Booking Trend (Priority: P1)

A branch manager opens the dashboard and expands the Trends section. They see a chart of weekly booking counts for the past 8 weeks and immediately know whether demand is rising, flat, or declining. A one-sentence headline ("Bookings up 22% vs 8 weeks ago") confirms their reading.

**Why this priority**: Booking volume is the single most important signal for whether a branch is growing or shrinking. It is the lowest-effort, highest-value chart and proves the end-to-end pattern for all other charts.

**Independent Test**: Can be fully tested by expanding the Trends section on a populated branch and verifying that (a) a weekly chart renders, (b) the headline figure matches a manual count from booking records, and (c) the section can be collapsed again — delivering direct strategic value with no other charts needed.

**Acceptance Scenarios**:

1. **Given** a branch with at least 2 weeks of booking history, **When** the manager expands the Trends section, **Then** a chart appears showing one data point per ISO week for the selected period, and a headline insight is displayed beneath it.
2. **Given** the Trends section is open, **When** the manager changes the period from 8 weeks to 12 weeks, **Then** the chart updates to show 12 weekly data points and the headline insight recalculates.
3. **Given** the Trends section is open and the manager navigates away and returns within the same session, **When** the page reloads, **Then** the section remains in its last open/closed state.

---

### User Story 2 — Ratings and Revenue Trends (Priority: P2)

The branch manager scrolls through the expanded Trends section and checks two additional weekly charts: average customer rating (fixed 1–5 scale) and total revenue in KWD. They can see at a glance whether quality scores are drifting and whether revenue correlates with booking volume changes.

**Why this priority**: Ratings and revenue are the two metrics that translate booking volume into business health. They share the same time-series chart pattern, so delivering them together is efficient and they add critical strategic context.

**Independent Test**: Can be fully tested by verifying that both charts render with correct values on a branch that has completed bookings with associated ratings and revenue figures, and that the y-axis for ratings is fixed between 1 and 5.

**Acceptance Scenarios**:

1. **Given** a branch with at least 4 weeks of completed, rated bookings, **When** the Trends section is expanded, **Then** both the rating chart (y-axis 1–5) and the revenue chart (KWD totals) render with one data point per week.
2. **Given** a week with no completed bookings, **When** the rating chart is displayed, **Then** that week shows a gap or zero rather than a misleading extrapolated value.
3. **Given** the period selector changes, **When** both charts re-render, **Then** headlines beneath each chart update to reflect the new period's comparison.

---

### User Story 3 — Service Category Demand Mix (Priority: P3)

The branch manager wants to know which service categories are driving most of their bookings. They view a chart showing each category's share of total bookings over the selected period and identify whether demand is concentrated or evenly spread.

**Why this priority**: Category mix reveals staffing and inventory alignment risks that no time-series chart can surface. A branch unknowingly concentrating on a single category is vulnerable.

**Independent Test**: Can be fully tested by verifying that every category with at least one booking in the selected period appears in the chart with a share that sums to 100%, and that a category with zero bookings in a later period still appears if it had bookings earlier.

**Acceptance Scenarios**:

1. **Given** a branch with bookings across multiple categories, **When** the Trends section is expanded, **Then** a category-mix chart renders showing each category's share as a percentage of total bookings for the full selected period.
2. **Given** a category that had bookings in earlier weeks but none recently, **When** the chart renders, **Then** it still appears with its true (non-zero) share rather than being hidden.
3. **Given** a period change, **When** category shares are recalculated, **Then** the shares reflect only bookings within the new selected window.

---

### User Story 4 — Peak Hours Heatmap (Priority: P4)

The branch manager wants to align staff scheduling with actual customer arrival patterns. They view a heatmap grid of days of the week vs. hours of the day, with color intensity indicating relative booking volume. They spot that Tuesdays 2–4pm are consistently the busiest slot and plan staffing accordingly.

**Why this priority**: The heatmap is the most operationally actionable chart — it directly informs rostering decisions. It delivers unique value that no other chart type can provide.

**Independent Test**: Can be fully tested by verifying that the heatmap grid covers all 7 days × 24-hour slots, cells are shaded proportionally to their booking count relative to the busiest slot, and the headline names the peak day-hour window accurately.

**Acceptance Scenarios**:

1. **Given** a branch with bookings spread across multiple days and times, **When** the Trends section is expanded, **Then** a 7×24 grid renders with cells color-coded by relative booking volume.
2. **Given** a slot with the highest booking count, **When** the heatmap renders, **Then** that cell has the darkest shade and the headline names it explicitly (e.g., "Tuesdays 2–4pm are your peak").
3. **Given** a slot with zero bookings, **When** the heatmap renders, **Then** that cell is the lightest shade (not blank or missing).

---

### User Story 5 — Headline Insights (Priority: P5)

Each chart displays a one-sentence plain-language summary that frees the manager from having to interpret raw data. The insight describes the overall trend, not a single outlier week.

**Why this priority**: Without automated insights, the charts shift analytical burden back to the manager. Headlines are what earn the label "strategic instrument" rather than "prettier spreadsheet."

**Independent Test**: Can be fully tested by verifying that each chart's headline is accurate against the underlying data, and that a single spike week does not cause the headline to overstate the trend.

**Acceptance Scenarios**:

1. **Given** a bookings chart with steady growth, **When** the insight is generated, **Then** it states the approximate percentage increase vs. the first week of the period.
2. **Given** a ratings chart with a spike in one week, **When** the insight is generated, **Then** it describes the mean or typical value rather than the spike ("Rating stable around 4.6" rather than "Rating hit 5.0 last week").
3. **Given** a chart with fewer data points than the selected period (new branch), **When** the insight is generated, **Then** it acknowledges the limited window ("Based on 3 weeks of data, bookings up 15%").

---

### User Story 6 — Export Report Entry Point for Owners (Priority: P6)

A center owner (not a branch manager) sees an "Export branch report" button on the dashboard. Clicking it either initiates the export or shows a "Coming soon" state. Branch managers do not see this button.

**Why this priority**: The button must be in place before the PDF template is built so that the layout is stable and no re-work is needed when the full export ships.

**Independent Test**: Can be fully tested by logging in as a Center Owner, verifying the button is visible and responds (even if it shows "Coming soon"), then logging in as a Branch Manager and verifying the button is absent.

**Acceptance Scenarios**:

1. **Given** a Center Owner is viewing the dashboard, **When** the page loads, **Then** an "Export branch report" button is visible.
2. **Given** a Branch Manager is viewing the dashboard, **When** the page loads, **Then** no export button is present.
3. **Given** the export feature is in "Coming soon" state, **When** the Center Owner taps the button, **Then** a message indicates the feature is not yet available, without an error.

---

### Edge Cases

- **Fewer than 8 weeks of history**: The chart renders only the weeks that exist; a caption below notes "Showing X weeks of available data" so the manager understands the limited window.
- **Single-week spike**: The headline insight uses the overall trend (e.g., slope across all weeks) rather than comparing to the spike week, preventing misleading conclusions.
- **ISO week boundary crossing a month end**: Aggregation uses ISO 8601 week definitions consistently; a week always starts on Monday regardless of month boundary.
- **Category with zero recent bookings**: The category still appears in the mix chart if it had any bookings in the selected period, shown with its true (possibly small) share.
- **Brand-new branch with zero history**: Each chart position shows a friendly empty-state message ("No data yet — check back after your first week") rather than a blank canvas or error.
- **All bookings in a single category**: The mix chart renders a single-category 100% view correctly without errors.
- **All bookings at the same hour**: The heatmap renders correctly with one darkest cell and all others at minimum shade.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Trends section MUST appear at the bottom of the dashboard, below all real-time and short-window sections.
- **FR-002**: The Trends section MUST be collapsed by default so that daily users are not affected.
- **FR-003**: A visible chevron/toggle control MUST allow any user to expand or collapse the Trends section.
- **FR-004**: The expanded/collapsed state MUST persist for the duration of the app session (navigation away and back restores the last state).
- **FR-005**: The Trends section MUST include a period selector offering exactly three options: 8 weeks, 12 weeks, and 6 months.
- **FR-006**: Changing the period MUST trigger a fresh data fetch and re-render all five charts simultaneously.
- **FR-007**: The Trends section MUST display five charts in this fixed order when expanded: (1) Bookings Volume, (2) Average Rating, (3) Revenue, (4) Category Mix, (5) Peak Hours Heatmap.
- **FR-008**: The Bookings Volume chart MUST display total booking counts aggregated by ISO week for the selected period.
- **FR-009**: The Average Rating chart MUST display weekly average customer ratings with the y-axis fixed to a 1–5 range.
- **FR-010**: The Revenue chart MUST display weekly totals in Kuwaiti Dinar (KWD).
- **FR-011**: The Category Mix chart MUST display each service category's share of total bookings over the full selected period as a percentage.
- **FR-012**: The Peak Hours Heatmap MUST display a 7-day × 24-hour grid with cell color intensity proportional to relative booking volume for that day-hour slot.
- **FR-013**: Every chart MUST display a one-sentence headline insight in plain language, computed automatically from the underlying data.
- **FR-014**: Headline insights MUST describe overall trends, not single-week outliers.
- **FR-015**: Trend data MAY be up to one hour stale; real-time freshness is not required.
- **FR-016**: All chart labels, axes, and headline text MUST render correctly in both Arabic (RTL) and English (LTR).
- **FR-017**: When a branch has fewer weeks of data than the selected period, the chart MUST render what exists and display a caption indicating the limited data window.
- **FR-018**: When a branch has no historical data at all, each chart position MUST display a friendly empty-state message rather than a blank canvas or an error.
- **FR-019**: The "Export branch report" button MUST be visible to Center Owners and hidden from Branch Managers.
- **FR-020**: The export button MUST be present in the layout even if the full export functionality is not yet implemented; in that state, it MUST display a "Coming soon" indicator on activation.

### Key Entities

- **TrendPeriod**: A selected observation window — one of 8 weeks, 12 weeks, or 6 months. Determines the date range for all queries and the x-axis span for all time-series charts.
- **WeeklyBookingStat**: A single ISO week's total booking count for the branch. Used in the Bookings Volume chart.
- **WeeklyRatingStat**: A single ISO week's average customer rating (absent if no rated bookings that week). Used in the Average Rating chart.
- **WeeklyRevenueStat**: A single ISO week's sum of completed-booking revenue in KWD. Used in the Revenue chart.
- **CategoryMixEntry**: A service category paired with its share (percentage) of total bookings across the full selected period. Used in the Category Mix chart.
- **PeakHourCell**: A (day-of-week, hour-of-day) pair with an absolute booking count and a normalised intensity value (0–1 relative to the busiest cell). Used in the Peak Hours Heatmap.
- **HeadlineInsight**: A computed plain-language string summarising the trend for a single chart. Derived from the underlying data; never hardcoded.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A branch manager can open the Trends section, read all five charts, and identify the single peak operating hour in under 90 seconds.
- **SC-002**: Switching the period selector causes all five charts to refresh with new data in under 3 seconds on a standard mobile or web connection.
- **SC-003**: Every headline insight is accurate — when manually cross-checked against raw booking records, the percentage or value stated matches within a 1% rounding margin.
- **SC-004**: The section, when collapsed, occupies no more vertical space than a single-row header, ensuring that daily-use dashboard sections are not displaced.
- **SC-005**: All charts and labels render correctly in both Arabic RTL and English LTR without text overflow, axis reversal errors, or layout breakage.
- **SC-006**: On a branch with zero booking history, no chart position shows a blank canvas or an unhandled error — each shows a defined empty state.
- **SC-007**: On a branch with fewer than 8 weeks of history, charts render available data and the limited-window caption is displayed automatically.
- **SC-008**: The "Export branch report" button is visible in a Center Owner session and absent in a Branch Manager session — verifiable by switching accounts.
- **SC-009**: A single-week spike does not cause the headline insight to overstate the trend — the stated trend direction (up/down/stable) must match the overall multi-week slope, not the outlier.

---

## Assumptions

- Branch managers and center owners both access the same dashboard screen; role-based visibility (export button) is controlled by the authenticated user's role without requiring separate screens.
- "Revenue" is defined as the sum of amounts from completed (paid or settled) bookings; cancelled or pending bookings are excluded from revenue totals.
- ISO week is defined as starting on Monday (ISO 8601 standard), consistent with the backend's existing date handling.
- The one-hour staleness allowance for trend data applies to the full trends payload; within that window, repeated period changes may serve cached data without triggering a new backend call.
- "6 months" in the period selector is interpreted as the most recent 26 ISO weeks (approximately 6 calendar months), not a calendar-month boundary lookup.
- The export button's "Coming soon" state requires no backend call — it is a purely presentational placeholder.
- Bookings with no associated rating are excluded from weekly rating averages; a week with zero rated bookings shows no rating data point.
- The peak hours heatmap uses the booking's scheduled time (the time slot the customer chose) rather than the actual completion time, since that reflects customer demand patterns.
- Prerequisite specs 015–018 (staff foundation, attention panel, pipeline KPIs, staff board) are already implemented; this spec does not modify any of those components.
- Cross-branch comparison, forecasting, predictive analytics, and trend-change alerting are explicitly out of scope for this specification.
