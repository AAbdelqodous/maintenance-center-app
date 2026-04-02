# Feature Specification: Phase 6 — Analytics & Reports

**Feature Branch**: `phase-6-analytics`
**Created**: 2026-04-02
**Status**: Draft
**Phase**: 6 of 7

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Performance Overview Dashboard (Priority: P1)

A center owner opens the Analytics screen. They see a performance summary for their center: total bookings, completed bookings, cancellation rate, overall rating, and total revenue — all filterable by time period (Today, This Week, This Month, Custom Range). Metric cards are the primary entry point; they give instant answers to "How are we doing right now?"

**Why this priority**: Business owners make decisions based on numbers. Without analytics, they cannot know if they are growing, stagnating, or declining. This is the most strategic screen in the app.

**Independent Test**: Open Analytics → Today's total bookings count matches the number of bookings with today's date in the Bookings tab.

**Acceptance Scenarios**:

1. **Given** a logged-in center owner, **When** they open the Analytics screen, **Then** metric cards are displayed for: Total Bookings, Completed Bookings, Cancelled Bookings, Completion Rate (%), Average Rating, and Total Revenue (KD).
2. **Given** the Analytics screen, **When** the owner selects a time period (Today / This Week / This Month), **Then** all metric cards update to reflect data within that period.
3. **Given** the owner selects "Custom Range", **When** they pick a start and end date, **Then** all metric cards update to reflect data within the selected range.
4. **Given** a period with no data, **When** the screen loads, **Then** metric cards show 0 (or KD 0.000 for revenue) — not blank or error.
5. **Given** the Analytics screen, **When** a metric card is tapped, **Then** the user is navigated to the relevant detailed view (e.g., tapping "Total Bookings" navigates to the bookings list filtered to that period).
6. **Given** the Analytics screen in Arabic, **When** rendered, **Then** numbers use appropriate formatting, currency shows as "KD X.XXX", percentages are correctly positioned, and layout is RTL.

---

### User Story 2 — Booking Trends Chart (Priority: P1)

Below the metric cards, the owner sees a line or bar chart showing booking volume over time. The chart defaults to the last 30 days, grouped by day. The owner can switch between "Bookings Over Time" and "Revenue Over Time" views. This reveals trends: busy days, slow weeks, growth or decline.

**Why this priority**: A single number tells you where you are; a trend tells you where you are going. Trends are essential for planning staffing, promotions, and capacity.

**Independent Test**: Switch chart to "Revenue Over Time" for "This Month" → bars/lines should match the sum of completed booking amounts for each day of the current month.

**Acceptance Scenarios**:

1. **Given** the Analytics screen, **When** the chart section loads, **Then** a bar chart displays daily booking counts for the selected time period.
2. **Given** the chart, **When** the owner switches the chart type to "Revenue Over Time", **Then** the chart updates to show daily revenue in KD.
3. **Given** a bar in the chart, **When** the owner taps it, **Then** a tooltip appears showing the exact value and date for that bar.
4. **Given** a period with very few data points (e.g., "Today"), **When** the chart loads, **Then** it gracefully shows a single bar or a minimal chart — not an error.
5. **Given** a time period producing more than 90 data points, **When** displayed, **Then** data is grouped by week instead of day to prevent chart overcrowding.

---

### User Story 3 — Service Popularity Breakdown (Priority: P2)

The owner sees a breakdown of which services have been booked most frequently — a ranked list (or pie/donut chart) of services by booking count and by revenue generated. This helps identify star services to promote and underperforming services to reconsider.

**Why this priority**: Understanding which services drive revenue helps owners focus their marketing and operational energy.

**Independent Test**: For "This Month", verify that the top service in the breakdown matches the service with the most bookings in the Bookings tab this month.

**Acceptance Scenarios**:

1. **Given** the Analytics screen, **When** the Service Breakdown section loads, **Then** services are listed ranked by booking count (descending), showing: service name, booking count, percentage of total bookings, revenue generated.
2. **Given** the breakdown, **When** the owner taps "Sort by Revenue", **Then** the list re-sorts by revenue generated (descending).
3. **Given** a service with 0 bookings in the selected period, **When** displayed, **Then** it is excluded from the breakdown (only services with at least 1 booking are shown).
4. **Given** the breakdown in Arabic, **When** rendered, **Then** service names are shown in Arabic and the layout is RTL.

---

### User Story 4 — Export Report (Priority: P3)

A center owner taps "Export Report" and a summary PDF is generated and shared to their device (or a sharing sheet). The PDF includes the metric cards snapshot, booking trends chart, and service breakdown for the selected time period. This is useful for record-keeping and sharing with partners.

**Why this priority**: Some owners need to share performance data with partners or accountants. A PDF export is a low-effort high-value feature for this audience.

**Independent Test**: Tap "Export" for "This Month" → a PDF is generated and the share sheet appears with a preview of the report.

**Acceptance Scenarios**:

1. **Given** the Analytics screen, **When** the owner taps "Export Report", **Then** a share sheet appears after a brief generation delay (<3 seconds).
2. **Given** the generated PDF, **Then** it MUST include: center name, report period, all metric card values, a table of service breakdown data, and a footer with the generation timestamp.
3. **Given** a PDF generation failure, **When** the generation fails, **Then** an error toast is shown: "Could not generate report. Please try again."
4. **Given** the owner's active locale is Arabic, **When** the PDF is generated, **Then** the PDF content is in Arabic with RTL layout.

---

### Edge Cases

- What if the center has been operating for less than 7 days? → "This Week" and "This Month" views are still available — they simply show fewer data points. The chart handles sparse data gracefully.
- What if the revenue data is unavailable (backend doesn't support it yet)? → Hide the Revenue metric card and the "Revenue Over Time" chart option with a note: "Revenue tracking coming soon."
- What if the custom date range is reversed (end date before start date)? → The date picker should enforce that end date >= start date; the "Apply" button is disabled until valid dates are selected.
- What if the completion rate is 100%? → Display "100%" cleanly — no rounding artifacts.
- What if there are more than 50 unique services? → Show the top 10 services in the breakdown with a "View all" option that expands the full list.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide an Analytics screen accessible from the main navigation.
- **FR-002**: The Analytics screen MUST display metric cards for: Total Bookings, Completed Bookings, Cancelled Bookings, Completion Rate (%), Average Rating, Total Revenue (KD).
- **FR-003**: All metric cards MUST be filterable by time period: Today, This Week, This Month, Custom Range.
- **FR-004**: Tapping a metric card MUST navigate to the relevant filtered view.
- **FR-005**: The app MUST display a bar chart of booking volume over time for the selected period.
- **FR-006**: The app MUST support switching the chart between "Bookings Over Time" and "Revenue Over Time".
- **FR-007**: Chart bars MUST show a tooltip with exact value and date on tap.
- **FR-008**: The app MUST group chart data by week when the period produces more than 90 data points.
- **FR-009**: The app MUST display a service popularity breakdown ranked by booking count, showing: service name, count, percentage, revenue.
- **FR-010**: The service breakdown MUST support toggling sort between "By Bookings" and "By Revenue".
- **FR-011**: The app MUST provide an "Export Report" action that generates and shares a PDF.
- **FR-012**: The generated PDF MUST include: center name, period, metric card values, service breakdown table, and generation timestamp.
- **FR-013**: The custom date range picker MUST enforce end date >= start date.
- **FR-014**: All user-facing strings MUST be delivered via i18n keys.

### Key Entities

- **AnalyticsSummary**: totalBookings, completedBookings, cancelledBookings, completionRate, averageRating, totalRevenue — aggregated for a period.
- **BookingTrend**: date, bookingCount, revenue — one record per day (or week).
- **ServiceBreakdown**: serviceId, serviceName, bookingCount, percentageOfTotal, revenueGenerated — ranked list.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Analytics screen loads all metric cards within 3 seconds on a standard 4G connection.
- **SC-002**: Switching between time periods updates all metrics and the chart within 2 seconds.
- **SC-003**: The PDF export generates and presents the share sheet within 3 seconds.
- **SC-004**: All Analytics screens render correctly in both Arabic (RTL) and English (LTR).
- **SC-005**: Revenue values display with exactly 3 decimal places in KD format (e.g., "KD 15.500").
- **SC-006**: 100% of user-facing strings in this phase use i18n keys.

---

## Assumptions

- The backend provides aggregation endpoints that calculate metrics server-side — the app does not perform calculations on raw booking data.
- Revenue data is derived from completed bookings with a known price. Partially paid or disputed bookings are excluded from the revenue total.
- The chart library used is Victory Native or similar — chart selection is a planning-phase decision.
- PDF generation is done client-side using a React Native PDF library (e.g., react-native-pdf-lib) — no server-side PDF rendering.
- The app does not store historical analytics data locally — all data is fetched fresh from the API per period selection.
- The custom date range is limited to a maximum of 365 days (backend enforced).
- Analytics data is always scoped to the authenticated owner's center — no cross-center comparison in this phase.
