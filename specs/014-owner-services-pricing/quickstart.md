# Quickstart: My Services Screen — Developer Onboarding

**Branch**: `014-owner-services-pricing` | **Date**: 2026-05-10

---

## What this feature does

Owners can declare which services their center performs and at what price range.
Services are picked from an admin-curated two-level catalog (category → service type).
This replaces the old flat "Manage Pricing" flow with a structured "Manage Services" flow.

---

## Files Changed / Created

### New files
| Path | Purpose |
|------|---------|
| `app/(app)/(tabs)/profile/services/_layout.tsx` | Stack navigator for the services sub-flow |
| `app/(app)/(tabs)/profile/services/index.tsx` | Services list screen (grouped by category) |
| `app/(app)/(tabs)/profile/services/add.tsx` | 3-step add flow (category → service → pricing) |
| `app/(app)/(tabs)/profile/services/[id].tsx` | Edit screen (pricing/description only; identity read-only) |
| `components/services/CategorySection.tsx` | Collapsible section header + service cards |
| `components/services/ServiceCard.tsx` | Single service offering row with price and duration |
| `components/services/PriceRangeInput.tsx` | Min/max KD input pair with validation |
| `components/services/BilingualDescriptionFields.tsx` | Two TextArea inputs (Ar + En) with char counter |
| `components/services/servicesSchema.ts` | Zod schemas for add and edit forms |

### Modified files
| Path | Change |
|------|--------|
| `store/api/centerApi.ts` | +6 endpoints, +2 tag types, +4 TypeScript types |
| `app/(app)/(tabs)/_layout.tsx` | +1 hidden Tabs.Screen for `profile/services` |
| `app/(app)/(tabs)/profile/index.tsx` | Remove categories multi-select; add derived-categories read-only section; change "Manage Pricing" row to "Manage Services" |
| `lib/i18n/locales/en.json` | New `services.*` keys |
| `lib/i18n/locales/ar.json` | New `services.*` keys (Arabic) |

### Unchanged files (verified not broken)
| Path | Why checked |
|------|-------------|
| `store/api/pricingApi.ts` | Old pricing flow still works; not touched |
| `app/(app)/(tabs)/profile/pricing/` | Old pricing screens still reachable via direct URL; profile no longer links to them |

---

## Backend Prerequisites

The following endpoints must be live before the smoke test passes:

```
GET  /api/v1/services
GET  /api/v1/categories/{id}/services
GET  /api/v1/centers/my/services
POST /api/v1/centers/my/services
PUT  /api/v1/centers/my/services/{id}
DELETE /api/v1/centers/my/services/{id}
```

Existing endpoint `GET /api/v1/categories` is already live.

Development against a local backend: ensure `center_services`, `category_services`, and `services` tables are seeded. Use Swagger UI at `http://localhost:8080/api/v1/swagger-ui/index.html`.

---

## Running the App

```bash
cd ~/MaintenanceCenters/maintenance-center-app

# Web (quickest for UI iteration)
npx expo start --web

# Navigate: Profile tab → "Manage Services" row
```

---

## Smoke Test Sequence

1. Log in as a center owner (approval status: APPROVED)
2. Tap **Profile** tab → tap **"Manage Services"** row
3. See empty state → tap **"Add your first service"**
4. Step 1: select a category → Step 2: select a service → Step 3: enter min/max price
5. Tap **"Save"** → confirm the new service appears in the list under the correct category header
6. Return to **Profile** tab → confirm "Categories you serve" shows the added category
7. Tap the new service card → edit the max price → save → confirm the updated price
8. Long-press (or tap delete icon) → confirm delete → confirm service disappears
9. Return to Profile → confirm "Categories you serve" is empty (or reflects remaining services)

---

## Key Code Patterns

### Deriving categories from services (profile screen)
```typescript
const { data: centerServices } = useGetMyCenterServicesQuery();

const derivedCategories = useMemo(() => {
  if (!centerServices) return [];
  const seen = new Set<number>();
  return centerServices.filter(s => s.isActive).reduce<ServiceCategory[]>((acc, s) => {
    if (!seen.has(s.category.id)) { seen.add(s.category.id); acc.push(s.category); }
    return acc;
  }, []);
}, [centerServices]);
```

### Identifying already-offered services (step 2)
```typescript
const { data: myCenterServices } = useGetMyCenterServicesQuery();
const alreadyOfferedIds = useMemo(
  () => new Set(
    (myCenterServices ?? [])
      .filter(s => s.category.id === selectedCategoryId)
      .map(s => s.service.id)
  ),
  [myCenterServices, selectedCategoryId]
);
```

### Price formatting
```typescript
import { formatPriceRange } from '@/lib/utils/formatPrice';
// "KD 5.000 – 15.000" or "Price on request"
```

### Delete confirmation (web-compatible)
```typescript
const handleDelete = () => {
  if (Platform.OS === 'web') {
    if (!window.confirm(t('services.deleteConfirmWeb'))) return;
    doDelete();
  } else {
    Alert.alert(t('services.deleteConfirmTitle'), t('services.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: doDelete },
    ]);
  }
};
```
