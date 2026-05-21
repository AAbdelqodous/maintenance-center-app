# Tasks: Dashboard Pipeline & KPI Cards

**Input**: Design documents from `/specs/017-dashboard-pipeline-kpi/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story (P1 → P2 → P3) to enable independent delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no inter-task dependency)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths in every description

---

## Phase 1: Setup (Shared Types & i18n)

**Purpose**: Create the TypeScript types and all i18n keys that every subsequent task depends on. No component or API work begins until these are done.

- [x] T001 Create `types/dashboard.ts` — define `PipelineWorkStage` union type and `PIPELINE_STAGE_ORDER` constant (6 active stages in order: RECEIVED, DIAGNOSING, QUOTE_READY, IN_PROGRESS, QUALITY_CHECK, READY_FOR_PICKUP); define `PipelineStageData { stage, count }`, `KpiMetric { value, baseline, hasSufficientHistory }`, `OnTimeRateMetric extends KpiMetric { target }`, `DashboardKpis { bookingsToday, avgCompletionTimeHours, onTimeCompletionRate, revenueToday }`, `DashboardSnapshot { pipeline, kpis }`, `KpiCardViewModel { labelKey, subtitleKey, value, baseline, hasSufficientHistory, positiveIsGood, formatValue, target? }`, and exported `computeDelta(value, baseline, hasSufficientHistory): number | null` helper (returns null when baseline is 0, null, or hasSufficientHistory is false)

- [x] T002 [P] Add EN i18n keys to `lib/i18n/locales/en.json` under `dashboard.pipeline` and `dashboard.kpi` — pipeline keys: `title` ("Live Pipeline"), `bottleneck` ("Bottleneck: {{stage}}"), `stages` object (6 abbreviated labels: RECEIVED→"Rcvd", DIAGNOSING→"Diag", QUOTE_READY→"Quote", IN_PROGRESS→"In Prg", QUALITY_CHECK→"QA", READY_FOR_PICKUP→"Ready"), `stagesLong` object (6 full labels); KPI keys: `bookingsToday`, `bookingsTodayBaseline` ("vs. same day last week"), `avgCompletionTime`, `avgCompletionTimeBaseline` ("vs. 30-day avg"), `avgCompletionTimeUnit` ("{{hours}}h"), `onTimeRate`, `onTimeRateBaseline` ("vs. prev 7 days"), `onTimeRateTarget` ("Target: {{target}}%"), `revenueToday`, `revenueTodayBaseline` ("vs. 30-day avg"), `revenueUnavailable` ("Revenue tracking not available"), `notEnoughHistory` ("Not enough history yet"), `noChange` ("No change")

- [x] T003 [P] Add AR i18n keys to `lib/i18n/locales/ar.json` — mirror all keys added in T002 with Arabic translations: pipeline.title→"خط الإنتاج المباشر", pipeline.bottleneck→"اختناق: {{stage}}", pipeline.stages (abbreviated Arabic stage names), pipeline.stagesLong (full Arabic stage names), all KPI label/baseline/target/unavailable/notEnoughHistory keys in Arabic as defined in `data-model.md`

**Checkpoint**: All TypeScript types compile and i18n keys are accessible — required before any component work.

---

## Phase 2: Foundational (API Endpoint & Hook)

**Purpose**: Wire the data pipeline from backend to React state. Must complete before any screen integration.

**⚠️ CRITICAL**: US1, US2, and US3 all consume `useDashboardSnapshot` — this phase blocks all user story work.

- [x] T004 Add `getDashboardSnapshot` endpoint to `store/api/analyticsApi.ts` — import `DashboardSnapshot` from `@/types/dashboard`; inside the existing `endpoints` builder block add: `getDashboardSnapshot: builder.query<DashboardSnapshot, void>({ query: () => 'analytics/center/dashboard-snapshot', providesTags: ['Analytics'] })`; export `useGetDashboardSnapshotQuery` in the named exports at the bottom of the file (matching the existing export pattern)

- [x] T005 Create `hooks/useDashboardSnapshot.ts` — import `useIsFocused` from `@react-navigation/native` and `useGetDashboardSnapshotQuery` from `@/store/api/analyticsApi`; export `useDashboardSnapshot()` hook that calls `useGetDashboardSnapshotQuery(undefined, { pollingInterval: isFocused ? 60_000 : 0, refetchOnFocus: true })`; return the full RTK Query result object (data, isLoading, isFetching, isError, refetch) so callers can distinguish first-load (`isLoading`) from background-refresh (`isFetching && !isLoading`) — this distinction is required by US3

**Checkpoint**: `useDashboardSnapshot()` can be imported and called; `data` is `DashboardSnapshot | undefined`.

---

## Phase 3: User Story 1 — Live Pipeline Bottleneck Scan (Priority: P1) 🎯 MVP

**Goal**: Horizontal pipeline strip showing booking counts per work stage, with bottleneck detection and tap-to-filter navigation. Replaces the 5 vanity stat cards on the staff dashboard.

**Independent Test**: Seed bookings at different work stages via backend. Open the staff dashboard and verify: correct count per chip, bottleneck highlighted when one stage has ≥ 2× the mean of others, no bottleneck when balanced, tapping a chip navigates to filtered bookings list, and all 6 chips render (including zero-count chips at minimum width).

- [x] T006 [P] [US1] Create `components/dashboard/PipelineChip.tsx` — props: `stage: PipelineWorkStage`, `count: number`, `flexWeight: number`, `isBottleneck: boolean`, `isRTL: boolean`, `onPress: () => void`; render a `TouchableOpacity` with `style={{ flexGrow: Math.max(flexWeight, 0.01), minWidth: 44 }}` (minWidth ensures zero-count chips remain visible); display abbreviated stage label via `t('dashboard.pipeline.stages.{stage}')` and the `count` value; when `isBottleneck` is true apply a visually distinct border color (amber/orange #F59E0B) and slightly elevated background; use `StyleSheet.create` consistent with the existing `staff/dashboard.tsx` style pattern

- [x] T007 [US1] Create `components/dashboard/PipelineStrip.tsx` — props: `stages: PipelineStageData[]`, `isFetching: boolean`, `onStagePress: (stage: PipelineWorkStage) => void`; implement `findBottleneck(stages)`: find the stage with max count, compute mean of the other 5, return that stage if its count ≥ 2 × mean, else null; compute `flexWeight` for each stage as `stage.count / Math.max(totalCount, 1)` where `totalCount = stages.reduce((s, p) => s + p.count, 0) || 1`; render section title `t('dashboard.pipeline.title')` with a subtle right-aligned `isFetching` spinner (small, no layout shift); render a `View` with `flexDirection: isRTL ? 'row-reverse' : 'row'` containing one `PipelineChip` per stage; when a bottleneck is detected render a caption below the strip: `t('dashboard.pipeline.bottleneck', { stage: t('dashboard.pipeline.stagesLong.{bottleneckStage}') })` in amber color; import `useTranslation` and `i18n.dir()` for RTL detection

- [x] T008 [US1] Modify `app/(app)/staff/dashboard.tsx` — remove the `statsGrid` `View` and all five `<StatCard ... />` lines; remove the inline `StatCard` function component; import `PipelineStrip` from `@/components/dashboard/PipelineStrip`; import `useDashboardSnapshot` from `@/hooks/useDashboardSnapshot`; call `const { data, isLoading, isFetching } = useDashboardSnapshot()`; render a loading spinner (`ActivityIndicator`) only when `isLoading` (first load); render `<PipelineStrip stages={data?.pipeline ?? []} isFetching={isFetching && !isLoading} onStagePress={(stage) => router.push({ pathname: '/staff/bookings', params: { workStage: stage } })} />` in place of the removed grid; keep the greeting header, logout button, and quick actions sections unchanged

- [x] T009 [US1] Modify `app/(app)/(tabs)/index.tsx` — import `PipelineStrip` from `@/components/dashboard/PipelineStrip`; import `useDashboardSnapshot` from `@/hooks/useDashboardSnapshot`; inside `DashboardScreen` call `const { data: snapshot, isFetching: snapshotFetching } = useDashboardSnapshot(undefined, { skip: !isOwner || !activeCenterId })`; insert a `<PipelineStrip>` section between the stat card grid and the `<AttentionPanel>` — guard with `isOwner` (same guard used for other owner-only sections); wire `onStagePress` to `router.push({ pathname: '/(tabs)/bookings/', params: { workStage: stage } })`; keep all existing stat cards, AttentionPanel, recent bookings, and quick actions unchanged

**Checkpoint**: Staff dashboard no longer shows 5 vanity cards. Pipeline strip renders with correct counts, bottleneck is flagged when applicable, tapping navigates to bookings. Owner dashboard shows pipeline above AttentionPanel.

---

## Phase 4: User Story 2 — Trend-Aware KPI Card Review (Priority: P2)

**Goal**: 2×2 grid of four KPI cards (Bookings Today, Avg Completion Time, On-Time Rate, Revenue Today), each showing current value, trend delta vs. baseline, color-coded direction, and a baseline subtitle. Appears below the pipeline strip on both dashboards.

**Independent Test**: Populate historical bookings in the backend (at least 8 days). Verify all four cards show: correct current value, correct delta percentage, correct arrow direction and color (green/red/grey), correct subtitle text, and "—" for the delta when history is insufficient or baseline is zero.

- [x] T010 [P] [US2] Create `components/dashboard/KpiCard.tsx` — props: `vm: KpiCardViewModel`; implement `computeDeltaDisplay(vm)`: call `computeDelta(vm.value, vm.baseline, vm.hasSufficientHistory)` from `@/types/dashboard`; if null → display "—" badge in grey with `t('dashboard.kpi.notEnoughHistory')` substituted for subtitle; if 0 → display "=" badge in grey with `t('dashboard.kpi.noChange')`; if non-null → format as `${Math.round(Math.abs(delta))}%` with ↑ or ↓ arrow, colored via `getDeltaColor(delta, vm.positiveIsGood)` (green #10B981 if good direction, red #EF4444 if bad); implement `getDeltaColor(delta, positiveIsGood): string`; render card with: metric label via `t(vm.labelKey)`, formatted value via `vm.formatValue(vm.value)` (show "—" when value is null), delta badge, subtitle via `t(vm.subtitleKey)`, optional target line `t('dashboard.kpi.onTimeRateTarget', { target: vm.target })` when `vm.target` is defined; card width is `'48%'` with `minWidth: 150` so 2-column layout holds at 360px; use `StyleSheet.create` consistent with existing dashboard style

- [x] T011 [US2] Create `components/dashboard/KpiGrid.tsx` — props: `kpis: DashboardKpis | undefined`, `isLoading: boolean`; when `isLoading` render a placeholder grid (4 grey shimmer cards at same dimensions); when `kpis` is defined build 4 `KpiCardViewModel` objects: (1) bookingsToday — `positiveIsGood: true`, `formatValue: (v) => String(Math.round(v))`, `labelKey: 'dashboard.kpi.bookingsToday'`, `subtitleKey: 'dashboard.kpi.bookingsTodayBaseline'`; (2) avgCompletionTimeHours — `positiveIsGood: false`, `formatValue: (v) => t('dashboard.kpi.avgCompletionTimeUnit', { hours: v.toFixed(1) })`, label/subtitle keys; (3) onTimeCompletionRate — `positiveIsGood: true`, `formatValue: (v) => `${Math.round(v)}%``, `target: kpis.onTimeCompletionRate.target`, label/subtitle/target keys; (4) revenueToday — `positiveIsGood: true`, `formatValue: (v) => v === null ? '—' : `KD ${v.toFixed(3)}``, when `kpis.revenueToday.value === null` override subtitle with `t('dashboard.kpi.revenueUnavailable')`; render a `View` with `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 12`, containing 4 `<KpiCard>` components

- [x] T012 [US2] Add `KpiGrid` to `app/(app)/staff/dashboard.tsx` — import `KpiGrid` from `@/components/dashboard/KpiGrid`; render `<KpiGrid kpis={data?.kpis} isLoading={isLoading} />` immediately below the `<PipelineStrip>` section; the `data` and `isLoading` values already come from the `useDashboardSnapshot()` call added in T008 — no additional API call needed

- [x] T013 [US2] Add `KpiGrid` to `app/(app)/(tabs)/index.tsx` — import `KpiGrid`; render `<KpiGrid kpis={snapshot?.kpis} isLoading={false} />` immediately below the `<PipelineStrip>` section added in T009; guard with `isOwner` check; `isLoading` is false here because the first-load spinner for the overall dashboard is already handled by `statsLoading`

**Checkpoint**: Both dashboards show the 2×2 KPI grid below the pipeline strip. All four cards display correct values, deltas, colors, and baseline subtitles. Revenue card shows unavailable message when `value === null`. "—" shown when `hasSufficientHistory === false`.

---

## Phase 5: User Story 3 — Auto-Refresh While Dashboard Is Focused (Priority: P3)

**Goal**: Pipeline counts and KPI values silently update every 60 seconds while the screen is focused. No loading flash. No fetch when screen is in the background.

**Independent Test**: Note current pipeline counts. Move a booking to a different work stage via the backend. Wait up to 60 seconds without touching the app. Verify counts update. Navigate to another tab and wait >60s — verify no network request fires (check device network log). Return to dashboard — verify data refreshes immediately (`refetchOnFocus: true`).

- [x] T014 [US3] Audit and document `hooks/useDashboardSnapshot.ts` — verify the hook correctly passes `pollingInterval: isFocused ? 60_000 : 0`; add an inline comment explaining why `pollingInterval: 0` when unfocused (prevents background fetch, saves battery and data); verify `refetchOnFocus: true` triggers an immediate re-fetch on screen return; return both `isLoading` (first fetch, components show spinner) and `isFetching` (subsequent fetch, components stay visible) as named exports from the hook; no behavioral change needed if T005 was implemented correctly — this task is verification + documentation

- [x] T015 [US3] Update `components/dashboard/PipelineStrip.tsx` — confirm the `isFetching` prop drives only a small non-blocking indicator (e.g., a 16px `ActivityIndicator` at the far end of the section title row) — not a full overlay or skeleton that would cause layout shift; verify the chip strip and bottleneck caption remain visible and readable during the background refresh cycle; if the prop was not wired in T007, wire it now

- [x] T016 [US3] Update `components/dashboard/KpiGrid.tsx` — add optional `isFetching?: boolean` prop; when `isFetching` is true and `isLoading` is false, show a small spinner next to the section title (matching the PipelineStrip pattern) — not a shimmer overlay; pass `isFetching={isFetching && !isLoading}` from both `staff/dashboard.tsx` (T008) and `(tabs)/index.tsx` (T009) — update those call sites if not already passing the prop

**Checkpoint**: Dashboard data refreshes silently every 60s while focused. No layout shift or loading flash on refresh. No fetches when the tab is not active.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: RTL verification, edge-case audit, and final integration smoke test.

- [x] T017 [P] RTL layout verification — switch the app to Arabic locale; open staff dashboard and verify: PipelineStrip chips render right-to-left (READY_FOR_PICKUP on the left, RECEIVED on the right); delta arrows in KpiCard remain semantically correct (↑ = increase in both locales); KpiGrid 2-column layout holds without overflow; pipeline bottleneck caption aligns to the right edge; test at 360px width in web browser

- [x] T018 [P] Edge-case audit — in the staff dashboard, trigger these scenarios and verify the UI handles each without crash or invalid text: (a) all 6 pipeline stages have count 0 → 6 chips at minWidth=44, no bottleneck caption; (b) one stage has all bookings (e.g., 10 at IN_PROGRESS, 0 elsewhere) → bottleneck flagged on IN_PROGRESS; (c) `hasSufficientHistory: false` on all four KPI metrics → all 4 delta badges show "—" with "Not enough history yet" subtitle; (d) `revenueToday.value === null` → Revenue card shows "—" value and "Revenue tracking not available" subtitle; (e) `computeDelta` receives `baseline: 0` → returns null, badge shows "—" not "Infinity%"

- [x] T019 Final smoke test per `quickstart.md` — follow the test scenarios in `specs/017-dashboard-pipeline-kpi/quickstart.md`: pipeline counts match booking work stages, bottleneck flag appears/disappears at the 2× threshold, tapping each stage chip navigates to the correctly filtered bookings list, 60-second auto-refresh cycle updates counts, Arabic locale renders without overflow, and all four KPI deltas compute correctly against known test data

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T002 and T003 can start immediately in parallel with T001
- **Foundational (Phase 2)**: T004 depends on T001 (needs `DashboardSnapshot` type); T005 depends on T004 (needs `useGetDashboardSnapshotQuery`)
- **US1 (Phase 3)**: All tasks depend on Foundational completion; T006 and T007 can parallelize; T008 and T009 depend on T007
- **US2 (Phase 4)**: Depends on Foundational (Phase 2) completion; T010 and T011 require T001 (types); T012 depends on T011 and T008; T013 depends on T011 and T009
- **US3 (Phase 5)**: Depends on US1 (Phase 3) and US2 (Phase 4) completion — verifies and updates components built there
- **Polish (Phase 6)**: Depends on US3 completion; T017 and T018 can run in parallel

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — independent of US2 and US3
- **US2 (P2)**: Starts after Phase 2 — independent of US1 (different components), but ships after US1 as it sits below the pipeline in the UI
- **US3 (P3)**: Depends on US1 + US2 — refines components built in both

### Within Each Phase

- Phase 1: T001 first, then T002 and T003 in parallel
- Phase 2: T004 then T005 sequentially
- Phase 3: T006 (parallel with T007 start) → T007 → T008 and T009 in parallel
- Phase 4: T010 (parallel) → T011 → T012 and T013 in parallel
- Phase 5: T014 → T015 and T016 in parallel

---

## Parallel Examples

### Phase 3 (US1) — after T007 completes
```
T008: Modify app/(app)/staff/dashboard.tsx
T009: Modify app/(app)/(tabs)/index.tsx
```

### Phase 4 (US2) — after T011 completes
```
T012: Add KpiGrid to staff/dashboard.tsx
T013: Add KpiGrid to (tabs)/index.tsx
```

### Phase 6 (Polish) — after T016
```
T017: RTL layout verification
T018: Edge-case audit
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001–T003)
2. Complete Phase 2 (T004–T005)
3. Complete Phase 3 (T006–T009)
4. **STOP and VALIDATE**: Pipeline strip replaces vanity cards; tap navigation works; bottleneck detection correct
5. Ship or demo — the dashboard is already more useful than before

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 → pipeline strip (MVP) — immediately useful ✅
3. Phase 4 → KPI cards — adds trend context ✅
4. Phase 5 → auto-refresh — makes it "live" ✅
5. Phase 6 → polish — production-ready ✅

---

## Notes

- No test tasks — not requested in spec
- `[P]` tasks touch different files and can safely run in parallel
- `[Story]` label maps each implementation task to its user story for traceability
- Each user story phase produces something independently demonstrable before the next starts
- `isFetching && !isLoading` is the key distinction for silent refresh — `isLoading` drives initial spinner only
- `computeDelta` is the single source of truth for delta math — imported by `KpiCard`, not re-implemented
- Commit after each phase checkpoint at minimum; commit after each task where possible
