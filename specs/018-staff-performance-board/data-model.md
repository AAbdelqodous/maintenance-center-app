# Data Model: Staff Performance Board (Spec 018)

## Frontend Types (`types/staffPerformance.ts` — new file)

### Enums

```typescript
export type StaffStatus = 'AVAILABLE' | 'ON_TASK' | 'OVERLOADED' | 'OFFLINE';

export type PerformanceTier =
  | 'TOP_PERFORMER'
  | 'STRONG'
  | 'ON_TRACK'
  | 'NEEDS_ATTENTION';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';
```

---

### StaffPerformanceCard

One row in the board — returned per active staff member.

```typescript
export interface StaffPerformanceCard {
  membershipId: number;            // Links back to CenterMembership
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string;              // null → show initials
  role: import('@/types/staff').CenterRole;

  // Workload
  status: StaffStatus;
  activeBookingsCount: number;

  // Performance (may be absent for TECHNICIAN-role viewers — ethics guardrail)
  tier?: PerformanceTier;
  isNew?: boolean;                 // true when zero lifetime completions
  avgRatingThisMonth?: number | null;     // null → "—"
  avgCompletionTimeMinutes?: number | null; // null → "—"
  completedThisMonth?: number;
  onTimeRateThisMonth?: number | null;   // 0–1; null → "—"

  // Trend (absent for TECHNICIAN-role viewers)
  trendDirection?: TrendDirection;
  compositeScore?: number;         // 0–100
  previousMonthScore?: number;     // 0–100; null if no prior month

  // Overload flag (absent for TECHNICIAN-role viewers)
  isOverloaded?: boolean;

  // Active bookings (for rebalance view)
  activeBookings?: ActiveBookingSummary[];
}
```

---

### ActiveBookingSummary

Lightweight booking row shown inside the Rebalance modal.

```typescript
export interface ActiveBookingSummary {
  bookingId: number;
  customerName: string;
  serviceType: string;
  bookingDate: string;
  bookingTime: string;
  bookingStatus: import('@/store/api/bookingsApi').BookingStatus;
}
```

---

### StaffPerformanceBoardResponse

The full API response for the board.

```typescript
export interface StaffPerformanceBoardResponse {
  staff: StaffPerformanceCard[];
  branchAverageActiveLoad: number;  // average non-zero load (for overload context)
  config: PerformanceTierConfig;    // thresholds, sent so UI can display them if needed
  generatedAt: string;              // ISO timestamp of when metrics were computed
}
```

---

### PerformanceTierConfig

Configurable thresholds — returned by the server; never hardcoded in the client.

```typescript
export interface PerformanceTierConfig {
  topPerformerMinRating: number;     // default 4.5
  topPerformerMinOnTime: number;     // default 0.85
  topPerformerMinVolume: number;     // default 5
  strongMinRating: number;           // default 4.0
  strongMinOnTime: number;           // default 0.70
  needsAttentionMaxRating: number;   // default 3.5
  needsAttentionMinDecline: number;  // default 0.5 (rating drop)
  needsAttentionMaxOnTime: number;   // default 0.60
  trendThreshold: number;            // default 10.0 (composite score delta, 0–100 scale)
  overloadMultiplier: number;        // default 2.0
}
```

---

### StaffMonthlyMetrics

One month of a technician's performance history — used in the drill-down detail screen.

```typescript
export interface StaffMonthlyMetrics {
  year: number;
  month: number;              // 1–12
  completedBookings: number;
  avgRating: number | null;
  avgCompletionTimeMinutes: number | null;
  onTimeRate: number | null;  // 0–1
  complaintCount: number;
}
```

---

### StaffHistoryResponse

Drill-down API response.

```typescript
export interface StaffHistoryResponse {
  membershipId: number;
  firstName: string;
  lastName: string;
  months: StaffMonthlyMetrics[];    // ordered newest-first, at least 3 months
  recentBookings: ActiveBookingSummary[];
}
```

---

### Frontend-Only View Model: RebalanceSuggestion

Not a server type — constructed client-side inside `RebalanceModal`.

```typescript
export interface RebalanceSuggestion {
  overloadedStaff: StaffPerformanceCard[];   // those with isOverloaded === true
  eligibleRecipients: StaffPerformanceCard[]; // Available or On Task, not Overloaded
}
```

---

## Sorting Logic (client-side, deterministic)

Applied inside `useStaffPerformanceBoard` after data arrives:

```typescript
function sortBoard(staff: StaffPerformanceCard[]): StaffPerformanceCard[] {
  return [...staff].sort((a, b) => {
    // 1. Overloaded first
    const aOv = a.isOverloaded ? 0 : 1;
    const bOv = b.isOverloaded ? 0 : 1;
    if (aOv !== bOv) return aOv - bOv;
    // 2. Needs Attention next
    const aNa = a.tier === 'NEEDS_ATTENTION' ? 0 : 1;
    const bNa = b.tier === 'NEEDS_ATTENTION' ? 0 : 1;
    if (aNa !== bNa) return aNa - bNa;
    // 3. Rest by active booking count descending
    return b.activeBookingsCount - a.activeBookingsCount;
  });
}
```

---

## State Transitions

### Staff Status Machine

```
             join/activate
                  │
                  ▼
             AVAILABLE ◄──────── last booking completed / reassigned away
                  │
          gets a booking
                  │
                  ▼
              ON_TASK ──── count > 2× branch avg ──► OVERLOADED
                  │                                       │
                  └──────────── count drops ──────────────┘
                  │
         8 hrs inactivity
         (during biz hours)
                  │
                  ▼
              OFFLINE ──── activity detected ──► AVAILABLE
```

### Performance Tier Assignment (server-side)

```
compositeScore > topPerformerMin AND volume ≥ topPerformerMinVolume
  → TOP_PERFORMER

compositeScore > strongMin
  → STRONG

rating dropped > needsAttentionMinDecline OR onTimeRate < needsAttentionMaxOnTime
  → NEEDS_ATTENTION

otherwise
  → ON_TRACK
```

---

## Backend Entities (new — requires backend spec)

### `booking_assignment_history` table

Required for accurate time-to-completion attribution (Research decision 10).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial PK | |
| `booking_id` | bigint FK → booking | |
| `assigned_membership_id` | bigint FK → membership | null = unassigned |
| `assigned_at` | timestamp | when assignment was made |
| `assigned_by_membership_id` | bigint | who performed the assignment |

The most recent row with a non-null `assigned_membership_id` at `COMPLETED` transition = the attributing technician. Time-to-completion = `COMPLETED` timestamp − `assigned_at` of this row.

### `performance_tier_config` table

Stores the tunable thresholds. One row per center (allows per-branch customization later).

| Column | Type | Default |
|--------|------|---------|
| `center_id` | bigint FK | |
| `top_performer_min_rating` | decimal(3,2) | 4.50 |
| `top_performer_min_on_time` | decimal(4,3) | 0.850 |
| `top_performer_min_volume` | int | 5 |
| `strong_min_rating` | decimal(3,2) | 4.00 |
| `strong_min_on_time` | decimal(4,3) | 0.700 |
| `needs_attention_max_rating` | decimal(3,2) | 3.50 |
| `needs_attention_min_decline` | decimal(3,2) | 0.50 |
| `needs_attention_max_on_time` | decimal(4,3) | 0.600 |
| `trend_threshold` | decimal(5,2) | 10.00 |
| `overload_multiplier` | decimal(4,2) | 2.00 |
