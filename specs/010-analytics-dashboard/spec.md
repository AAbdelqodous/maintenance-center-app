# Feature Specification: Phase 5.0 — Analytics Dashboard

**Feature Branch**: `004-analytics-dashboard`
**Created**: 2026-04-16
**Status**: ✅ Implemented
**Input**: User description: "Phase 5.0 analytics dashboard for center owners: performance metrics, booking trends, revenue analytics, customer satisfaction insights, and peak hours data to help owners understand and improve their business"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Business Performance Summary (Priority: P1)

A center owner opens the Analytics section from the bottom navigation. They see a summary card for the current period showing: total bookings, completed bookings, cancellation rate, average customer rating, and total revenue. They can switch the period between "This Week", "This Month", and "Last 3 Months" using a selector at the top of the screen. The numbers update immediately when the period changes.

**Why this priority**: The performance summary is the single most-requested insight by center owners. It answers the fundamental question "how is my business doing?" without requiring them to export or manually count anything. It is also the foundation for all other analytics views.

**Independent Test**: Open the Analytics screen. Confirm the summary card shows booking count, completion rate, average rating, and revenue for the selected period. Switch the period from "This Month" to "This Week". Confirm all numbers update to reflect the shorter period.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Analytics screen, **Then** a summary card is shown for the default period ("This Month") with: total bookings, completed bookings count, cancellation rate as a percentage, average customer rating (1–5), and total revenue in KD.
2. **Given** the period selector, **When** the owner switches to "This Week", **Then** all summary metrics update to reflect only the current calendar week's data.
3. **Given** the period selector, **When** the owner switches to "Last 3 Months", **Then** all summary metrics update to reflect the past 90 days of data.
4. **Given** the Analytics screen with no data yet (new center), **When** it loads, **Then** each metric shows a zero or "N/A" value with a label — no blank spaces or layout breaks.
5. **Given** the Analytics screen in Arabic locale, **When** rendered, **Then** all labels, numbers, and period names appear in Arabic with right-to-left layout and KD amounts use the correct 3-decimal-place format.

---

### User Story 2 - Understand Booking Trends Over Time (Priority: P1)

From the Analytics screen, a center owner looks at a booking trend chart that shows the number of bookings per day (in week view) or per week (in month/3-month view). They can see at a glance when their busiest days or weeks were. Hovering or tapping a data point shows the exact booking count for that period. The chart also shows completed vs. cancelled counts in separate colors so the owner can see whether a busy period was also a good quality period.

**Why this priority**: Knowing when demand peaks allows owners to staff up, manage capacity, and plan promotions strategically. Booking trends are the most actionable operational insight after the summary.

**Independent Test**: Open the booking trends chart. Confirm data points render for the selected period. Tap a data point. Confirm a tooltip or label shows the exact booking count for that day or week. Switch the period — confirm the chart axis labels and data points update accordingly.

**Acceptance Scenarios**:

1. **Given** the booking trends chart in "This Week" view, **When** displayed, **Then** the horizontal axis shows one entry per day of the current week and the vertical axis shows booking counts.
2. **Given** the booking trends chart in "This Month" or "Last 3 Months" view, **When** displayed, **Then** the horizontal axis shows one entry per week and the vertical axis shows booking counts.
3. **Given** the chart, **When** it renders, **Then** completed bookings and cancelled bookings are shown as visually distinct data series (e.g., different colors or bar stacks).
4. **Given** a data point on the chart, **When** the owner taps it, **Then** a label or tooltip shows the exact completed and cancelled count for that period.
5. **Given** a period with no bookings on a specific day or week, **When** displayed, **Then** that point shows a zero value — the chart does not skip or omit zero-value periods.

---

### User Story 3 - Track Revenue by Service Category (Priority: P2)

From the Analytics screen, the center owner sees a revenue breakdown that shows how much income each service category (car, electronics, home appliances, etc.) contributed during the selected period. The breakdown is shown as a list ranked by revenue, with the highest-earning category at the top. Each category row shows the category name, number of completed bookings in that category, and revenue amount. This helps the owner understand which services are most profitable.

**Why this priority**: Revenue by category answers "where does my money actually come from?" — a question that directly informs service pricing, marketing focus, and staffing allocation. It is less urgent than raw booking counts but adds significant strategic value.

**Independent Test**: Open the Revenue by Category section for a period with bookings across multiple service categories. Confirm each category appears with its name, booking count, and revenue. Confirm the list is ordered from highest to lowest revenue.

**Acceptance Scenarios**:

1. **Given** the Revenue by Category section, **When** it loads, **Then** all service categories with at least one completed booking in the selected period are listed, ordered from highest to lowest revenue.
2. **Given** a category row, **When** displayed, **Then** it shows: category name in the active locale (Arabic or English), number of completed bookings, and revenue in KD with 3 decimal places.
3. **Given** a period with bookings in only one service category, **When** displayed, **Then** only that category appears in the list — categories with zero revenue are not shown.
4. **Given** the Revenue by Category section in Arabic locale, **When** rendered, **Then** category names appear in Arabic with right-to-left layout.

---

### User Story 4 - Understand Customer Satisfaction (Priority: P2)

From the Analytics screen, the center owner sees a customer satisfaction section showing their average rating for the selected period, the distribution of ratings (how many 1-star, 2-star, 3-star, 4-star, and 5-star reviews they received), and their total review count. They can also see whether their average rating has improved or declined compared to the previous equivalent period (e.g., last month vs. the month before).

**Why this priority**: Customer satisfaction data directly influences the center's trust score and visibility in the customer-facing app. Owners need to see the distribution — not just the average — to understand whether a few extreme ratings are skewing their score.

**Independent Test**: Open the Customer Satisfaction section. Confirm the average rating, star distribution (5 rows, one per star level), and total review count are all shown. If the current period average is higher than the previous period, confirm a positive trend indicator appears.

**Acceptance Scenarios**:

1. **Given** the Customer Satisfaction section, **When** it loads, **Then** it shows: average rating (e.g., 4.2), total reviews for the selected period, and a star distribution showing the count for each rating level (1 through 5 stars).
2. **Given** the current period average rating is higher than the previous equivalent period, **When** displayed, **Then** a positive trend indicator is shown (e.g., "↑ 0.3 vs last month").
3. **Given** the current period average rating is lower than the previous equivalent period, **When** displayed, **Then** a negative trend indicator is shown (e.g., "↓ 0.5 vs last month").
4. **Given** no reviews in the selected period, **When** the section loads, **Then** it shows "No reviews in this period" — no average, no distribution.
5. **Given** the section in Arabic locale, **When** rendered, **Then** all labels and numbers appear in Arabic with right-to-left layout.

---

### User Story 5 - Identify Peak Operating Hours (Priority: P3)

From the Analytics screen, the center owner sees a peak hours heatmap or bar chart showing which hours of the day and days of the week receive the most booking requests. Each cell or bar represents a time slot. The darker or taller the cell, the more bookings arrived in that slot. This helps the owner plan staffing and decide when to run promotions.

**Why this priority**: Peak hours data converts raw booking volume into an operational scheduling tool. It is the least urgent of the analytics views because owners can manage staffing intuitively when volumes are low — this becomes critical only when the business scales.

**Independent Test**: Open the Peak Hours section. Confirm the chart shows data organized by hour of day. Confirm the heaviest booking time slot is visually the most prominent. Confirm the data reflects the selected period.

**Acceptance Scenarios**:

1. **Given** the Peak Hours section, **When** it loads, **Then** it shows booking volume organized by hour of day (0–23) for the selected period.
2. **Given** the chart, **When** displayed, **Then** the hour with the highest booking volume is visually the most prominent — the least-busy hours are visually the least prominent.
3. **Given** the chart, **When** the owner taps a specific hour slot, **Then** a label shows the exact booking count for that hour in the selected period.
4. **Given** the selected period is changed, **When** the new period is selected, **Then** the peak hours chart updates to reflect the new period's data.
5. **Given** the section in Arabic locale, **When** rendered, **Then** time labels and booking counts appear in Arabic with right-to-left layout.

---

### Edge Cases

- What if the analytics API is slow to respond? → Show a loading skeleton for each section independently — sections that load faster render immediately while slower sections continue loading. No section blocks another.
- What if the analytics API returns data for a period with zero bookings? → Show all metrics as zero with their labels intact. Charts display a flat zero line. No empty state errors.
- What if the center was created within the current period (new center, very few bookings)? → All analytics are based on available data. Metrics with insufficient history show what is available — no minimum data threshold is required to render the screen.
- What if revenue data is unavailable because bookings in this period have no confirmed payment? → Show revenue as "N/A" with a label: "Revenue data is based on completed bookings" — do not show 0 KD which would be misleading.
- What if the owner has multiple branches and switches the active branch? → All analytics data must reflect only the currently active branch. Switching the active branch refreshes all analytics sections.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide an Analytics screen accessible from the main navigation with a period selector offering at minimum: "This Week", "This Month", and "Last 3 Months".
- **FR-002**: The Analytics screen MUST display a performance summary card showing: total bookings, completed bookings, cancellation rate, average rating, and total revenue — all scoped to the selected period.
- **FR-003**: Switching the selected period MUST update all sections of the Analytics screen without requiring a manual refresh.
- **FR-004**: The Analytics screen MUST display a booking trends chart showing booking volume over time, broken down by completed and cancelled bookings, for the selected period.
- **FR-005**: The booking trends chart MUST use daily granularity for "This Week" and weekly granularity for "This Month" and "Last 3 Months".
- **FR-006**: The Analytics screen MUST display a revenue breakdown by service category, listing all categories with at least one completed booking ranked from highest to lowest revenue.
- **FR-007**: The Analytics screen MUST display a customer satisfaction section showing: average rating, total review count, and rating distribution (count per star level 1–5) for the selected period.
- **FR-008**: The customer satisfaction section MUST show a trend indicator comparing the current period average to the previous equivalent period.
- **FR-009**: The Analytics screen MUST display a peak hours section showing booking volume by hour of day for the selected period.
- **FR-010**: Each analytics section MUST load and display independently — a slow or failed section MUST NOT block other sections from rendering.
- **FR-011**: Each section MUST handle the zero-data case gracefully with appropriate labels — no blank spaces, missing labels, or layout breaks.
- **FR-012**: All amounts MUST be displayed with exactly 3 decimal places in Kuwaiti Dinar format.
- **FR-013**: All user-facing strings MUST be delivered via i18n keys — zero hardcoded display strings in any Phase 5.0 screen.
- **FR-014**: All analytics data MUST be scoped to the owner's currently active branch — switching the active branch refreshes all data.

### Key Entities

- **PerformanceSummary**: Aggregated metrics for a period. Contains total booking count, completed booking count, cancellation rate (percentage), average customer rating, and total revenue in KD.
- **BookingTrend**: A time-series data point representing booking volume for a specific day or week. Contains the period label, completed booking count, and cancelled booking count.
- **RevenueByCategoryEntry**: Revenue contribution for a single service category in a period. Contains category name (bilingual), completed booking count, and revenue amount in KD.
- **RatingDistribution**: A breakdown of customer review counts by star level (1 through 5). Used alongside the average rating and total review count to form the satisfaction summary.
- **PeakHourEntry**: Booking volume for a single hour of the day. Contains the hour (0–23) and the booking count for that hour in the selected period.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Analytics screen loads and renders the performance summary within 3 seconds on a standard mobile connection.
- **SC-002**: Switching the selected period updates all visible analytics sections within 2 seconds.
- **SC-003**: A center owner can identify their single highest-revenue service category and their single peak booking hour without navigating away from the Analytics screen.
- **SC-004**: All analytics sections render correctly in both Arabic (right-to-left) and English (left-to-right) without layout breaks.
- **SC-005**: A section with no data for the selected period shows a clear zero or "N/A" state — no blank areas, missing labels, or rendering errors.
- **SC-006**: 100% of user-facing strings in Phase 5.0 screens use i18n keys — confirmed by zero hardcoded display strings in new screen files.

## Assumptions

- The backend provides a dedicated analytics API endpoint (or set of endpoints) that aggregates the required metrics server-side — the mobile app does not compute aggregates from raw booking data.
- The analytics API supports period filtering via query parameters (e.g., start date, end date, or named period such as "THIS_WEEK").
- Revenue figures are based on completed bookings only — bookings in progress or pending payment are excluded from revenue totals.
- The analytics screen is read-only — no actions are taken from this screen that modify any booking, review, or pricing data.
- Charts and data visualizations are rendered using a suitable charting library compatible with the existing React Native setup — the specific library is an implementation decision outside this spec's scope.
- Data is aggregated per branch — the analytics backend scopes all queries to the center ID of the authenticated owner's active branch.
- Historical data going back at least 90 days is available in the backend database before this feature launches — the "Last 3 Months" period would otherwise return partial data for new centers.
- i18n translation keys for the `analytics` namespace are added to both Arabic and English locale files as part of this phase.
