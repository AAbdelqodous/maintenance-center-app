# Data Model: Offers & Promotions

**Branch**: `013-offers-promotions` | **Date**: 2026-05-03

---

## 1. Enums

### DiscountType
**Package**: `com.maintainance.service_center.offer`

```
PERCENTAGE     Discount expressed as a percentage (e.g. 15%)
FIXED_AMOUNT   Discount expressed as a fixed KD amount (e.g. KD 5.000)
```

### OfferStatus
**Package**: `com.maintainance.service_center.offer`
Computed — never stored in the DB.

```
SCHEDULED   startDate is in the future (and not cancelled)
ACTIVE      today is within [startDate, endDate] (and not cancelled)
EXPIRED     endDate is in the past (and not cancelled)
CANCELLED   cancelledAt is non-null
```

---

## 2. CenterOffer Entity

**Table**: `center_offers`
**Package**: `com.maintainance.service_center.offer`
**Lombok**: `@Getter @Setter @Builder @AllArgsConstructor @NoArgsConstructor`
**JPA**: `@Entity @EntityListeners(AuditingEntityListener.class)`

| Column | DB Type | Java Type | Nullable | Notes |
|--------|---------|-----------|----------|-------|
| `id` | `BIGINT` (PK) | `Long` | No | `@GeneratedValue(IDENTITY)` |
| `center_id` | `BIGINT` (FK → maintenance_centers.id) | `MaintenanceCenter` | No | `@ManyToOne(fetch=LAZY)` |
| `title_ar` | `VARCHAR(255)` | `String` | No | Arabic title |
| `title_en` | `VARCHAR(255)` | `String` | No | English title |
| `description_ar` | `VARCHAR(1000)` | `String` | Yes | |
| `description_en` | `VARCHAR(1000)` | `String` | Yes | |
| `discount_type` | `VARCHAR(50)` | `DiscountType` | No | `@Enumerated(STRING)` |
| `discount_value` | `DECIMAL(10,3)` | `BigDecimal` | No | |
| `start_date` | `DATE` | `LocalDate` | No | |
| `end_date` | `DATE` | `LocalDate` | No | |
| `max_redemptions` | `INTEGER` | `Integer` | Yes | null = unlimited |
| `current_redemptions` | `INTEGER` | `int` | No | default 0 |
| `cancelled_at` | `TIMESTAMP` | `LocalDateTime` | Yes | null = not cancelled |
| `created_at` | `TIMESTAMP` | `LocalDateTime` | No | `@CreatedDate` |
| `updated_at` | `TIMESTAMP` | `LocalDateTime` | Yes | `@LastModifiedDate` |

### Join Table: center_offer_service_types
Stores `applicableServiceTypes`. Empty = offer applies to all services.

| Column | DB Type | Notes |
|--------|---------|-------|
| `center_offer_id` | `BIGINT` | FK → center_offers.id |
| `service_type` | `VARCHAR(50)` | ServiceType enum value |

**Java mapping on CenterOffer**:
```java
@ElementCollection(fetch = FetchType.EAGER)
@CollectionTable(name = "center_offer_service_types",
    joinColumns = @JoinColumn(name = "center_offer_id"))
@Column(name = "service_type")
@Enumerated(EnumType.STRING)
private List<ServiceType> applicableServiceTypes = new ArrayList<>();
```

---

## 3. OfferRequest DTO

**File**: `offer/OfferRequest.java`
**Lombok**: `@Getter @NoArgsConstructor`
**Validation**: `@Valid` on controller

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `titleAr` | `String` | `@NotBlank` | |
| `titleEn` | `String` | `@NotBlank` | |
| `descriptionAr` | `String` | none | optional |
| `descriptionEn` | `String` | none | optional |
| `discountType` | `DiscountType` | `@NotNull` | |
| `discountValue` | `BigDecimal` | `@NotNull @DecimalMin("0.001")` | service validates ≤ 100 for PERCENTAGE |
| `applicableServiceTypes` | `List<ServiceType>` | none | empty = all services |
| `startDate` | `LocalDate` | `@NotNull` | |
| `endDate` | `LocalDate` | `@NotNull` | service validates > startDate and in future |
| `maxRedemptions` | `Integer` | `@Min(1)` | optional |

---

## 4. OfferResponse DTO

**File**: `offer/OfferResponse.java`
**Lombok**: `@Builder @Getter`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `Long` | |
| `titleAr` | `String` | |
| `titleEn` | `String` | |
| `descriptionAr` | `String` | nullable |
| `descriptionEn` | `String` | nullable |
| `discountType` | `DiscountType` | |
| `discountValue` | `BigDecimal` | |
| `applicableServiceTypes` | `List<ServiceType>` | empty = all services |
| `startDate` | `LocalDate` | |
| `endDate` | `LocalDate` | |
| `maxRedemptions` | `Integer` | nullable |
| `currentRedemptions` | `int` | |
| `status` | `OfferStatus` | computed in service |
| `cancelledAt` | `LocalDateTime` | nullable |
| `createdAt` | `LocalDateTime` | |

---

## 5. OfferRepository

**File**: `offer/OfferRepository.java`
Extends `JpaRepository<CenterOffer, Long>`

```java
// Used to list offers (with optional status filter delegated to service)
List<CenterOffer> findByCenterIdOrderByCreatedAtDesc(Long centerId);

// Used for cap enforcement: count active+scheduled offers
@Query("SELECT COUNT(o) FROM CenterOffer o WHERE o.center.id = :centerId " +
       "AND o.cancelledAt IS NULL AND o.endDate >= :today")
long countActiveOrScheduled(@Param("centerId") Long centerId,
                            @Param("today") LocalDate today);
```

---

## 6. Status Computation Helper

Placed in `OfferService` or a static method on `OfferResponse`:

```java
public static OfferStatus computeStatus(CenterOffer offer) {
    if (offer.getCancelledAt() != null) return OfferStatus.CANCELLED;
    LocalDate today = LocalDate.now();
    if (offer.getStartDate().isAfter(today))  return OfferStatus.SCHEDULED;
    if (!offer.getEndDate().isBefore(today))  return OfferStatus.ACTIVE;
    return OfferStatus.EXPIRED;
}
```

---

## 7. TypeScript Types (Frontend)

**File**: `types/offers.ts`

```typescript
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type OfferStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface CenterOffer {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableServiceTypes: string[];   // ServiceType values; empty = all
  startDate: string;                  // ISO date "YYYY-MM-DD"
  endDate: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  status: OfferStatus;
  cancelledAt?: string;
  createdAt: string;
}

export interface CreateOfferRequest {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableServiceTypes?: string[];
  startDate: string;
  endDate: string;
  maxRedemptions?: number;
}

export interface UpdateOfferRequest extends CreateOfferRequest {
  // same shape; backend enforces field-lock for ACTIVE offers
}
```

---

## 8. i18n Keys to Add

### en.json
```json
{
  "offers": {
    "title": "Offers & Promotions",
    "add": "Add Offer",
    "edit": "Edit Offer",
    "cancel": "Cancel Offer",
    "cancelConfirm": "Are you sure you want to cancel this offer? This cannot be undone.",
    "titleAr": "Title (Arabic)",
    "titleEn": "Title (English)",
    "descriptionAr": "Description (Arabic)",
    "descriptionEn": "Description (English)",
    "discountType": "Discount Type",
    "discountValue": "Discount Value",
    "percentage": "Percentage (%)",
    "fixedAmount": "Fixed Amount (KD)",
    "applicableServices": "Applicable Services",
    "allServices": "All Services",
    "startDate": "Start Date",
    "endDate": "End Date",
    "maxRedemptions": "Max Redemptions (optional)",
    "redeemed": "redeemed",
    "of": "of",
    "noOffers": "No Offers Yet",
    "noOffersSubtitle": "Create your first promotion to attract more customers",
    "saved": "Offer saved successfully",
    "cancelled": "Offer cancelled",
    "errorSave": "Failed to save offer",
    "errorCancel": "Failed to cancel offer",
    "limitReached": "You have reached the maximum of 10 active or scheduled offers",
    "status": {
      "SCHEDULED": "Scheduled",
      "ACTIVE": "Active",
      "EXPIRED": "Expired",
      "CANCELLED": "Cancelled"
    },
    "filter": {
      "all": "All",
      "active": "Active",
      "scheduled": "Scheduled",
      "expired": "Expired"
    },
    "fieldLocked": "This field cannot be changed while the offer is active"
  }
}
```

### ar.json (same keys, Arabic values)
```json
{
  "offers": {
    "title": "العروض والترقيات",
    "add": "إضافة عرض",
    "edit": "تعديل العرض",
    "cancel": "إلغاء العرض",
    "cancelConfirm": "هل أنت متأكد من إلغاء هذا العرض؟ لا يمكن التراجع عن هذا الإجراء.",
    "titleAr": "العنوان (عربي)",
    "titleEn": "العنوان (إنجليزي)",
    "descriptionAr": "الوصف (عربي)",
    "descriptionEn": "الوصف (إنجليزي)",
    "discountType": "نوع الخصم",
    "discountValue": "قيمة الخصم",
    "percentage": "نسبة مئوية (%)",
    "fixedAmount": "مبلغ ثابت (د.ك)",
    "applicableServices": "الخدمات المشمولة",
    "allServices": "جميع الخدمات",
    "startDate": "تاريخ البدء",
    "endDate": "تاريخ الانتهاء",
    "maxRedemptions": "الحد الأقصى للاستخدامات (اختياري)",
    "redeemed": "مُستخدم",
    "of": "من",
    "noOffers": "لا توجد عروض بعد",
    "noOffersSubtitle": "أنشئ أول عرض ترويجي لجذب المزيد من العملاء",
    "saved": "تم حفظ العرض بنجاح",
    "cancelled": "تم إلغاء العرض",
    "errorSave": "فشل في حفظ العرض",
    "errorCancel": "فشل في إلغاء العرض",
    "limitReached": "لقد وصلت إلى الحد الأقصى وهو 10 عروض نشطة أو مجدولة",
    "status": {
      "SCHEDULED": "مجدول",
      "ACTIVE": "نشط",
      "EXPIRED": "منتهي",
      "CANCELLED": "ملغى"
    },
    "filter": {
      "all": "الكل",
      "active": "النشطة",
      "scheduled": "المجدولة",
      "expired": "المنتهية"
    },
    "fieldLocked": "لا يمكن تغيير هذا الحقل أثناء تفعيل العرض"
  }
}
```
