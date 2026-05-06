# Maintenance Center Platform — Claude Code Context

## 🎯 Project Overview

A service marketplace connecting users with verified maintenance centers across Kuwait
and the broader Middle East. Users can discover, review, and book repair services for
cars, electronics, and home appliances. Expansion into restaurants, hotels, and other
service verticals is planned.

**Target Market:** Kuwait (primary), GCC / Middle East (expansion)
**Languages:** Arabic (primary), English
**Status:** Backend fully implemented and tested. Center owner app (this repo) in active
development — core screens working.

### Active Development: Phase 3.5+ Features
- [ ] Service pricing management
- [ ] Work progress updates with photos
- [ ] Quote creation and sending
- [ ] Trust badges display

---

## 🏗️ Architecture

### Overall Strategy
- **Phase 1:** Modular Spring Boot monolith (current) — fast to build, easy to debug
- **Phase 2:** Extract to microservices as traffic and team grow
- Domain boundaries are kept clean now to make future extraction straightforward

### Repository Structure (3 Separate Repos)
```
service-center/               # Spring Boot API — backend at ~/IdeaProjects/life-experience-app/service-center/
maintenance-customer-app/     # React Native — customer-facing (~30 screens, not started)
maintenance-center-app/       # React Native — center owner (~20 screens, IN PROGRESS)
```

The backend module is named `service-center`, Maven artifact ID is `service-center`,
group `com.maintainance`. The root IntelliJ project is named `life-experience-app`.

### ⚠️ Multi-Branch Architecture Decision

A single owner (User) can own **multiple MaintenanceCenter branches**. The backend already
supports this — `findByOwnerIdAndIsActiveTrue` returns a `Page`. However, the center owner
app currently operates in single-branch mode using `findFirstByOwnerId`.

**Planned design for multi-branch support:**
- After login, show a branch selector screen if owner has > 1 branch
- Store `activeCenterId` in Redux (`authSlice` or a new `centerSlice`)
- All API calls that currently use implicit `/my` ownership should continue to work via
  the `activeCenterId` context
- The `GET /centers/my/profile`, `PUT /centers/my`, and all booking/review/chat endpoints
  are currently scoped to the first center found — this works for single-branch owners
- **Do not refactor to explicit centerId yet** — wait until multi-branch is actually needed

### Actual Backend Package Structure
```
service-center/src/main/java/com/maintainance/service_center/
├── address/        # Address (embeddable) + AddressRequest DTO
├── auth/           # AuthController, AuthService, RegistrationRequest, AuthRequest/Response
├── booking/        # Booking entity + enums + BookingController, BookingService, BookingResponse
├── category/       # ServiceCategory entity + Repository + Controller + Response
├── center/         # MaintenanceCenter entity + full CRUD service + DTOs + Controller
├── chat/           # Conversation, Message entities + ChatController, ChatService, ConversationResponse
├── complaint/      # Complaint entity + enums
├── config/         # BeansConfig, FileStorageService
├── email/          # EmailService, EmailTemplateName
├── favorite/       # UserFavorite entity
├── handler/        # GlobalExceptionHandling, ExceptionResponse, BusinessErrorCodes
├── notification/   # Notification entity + enums + NotificationController, NotificationService
├── review/         # Review entity + ReviewController, ReviewService, ReviewResponse, ReviewRepository
├── role/           # Role entity, RoleRepository
├── search/         # SearchHistory entity, SearchSource enum + SearchController
├── security/       # JwtService, JwtFilter, SecurityConfig, UserDetailsServiceImpl
├── admin/          # AdminController, AdminService, UserResponse — center owner approval + platform admin (Phase 6.0, NOT YET BUILT)
└── user/           # User, Token, TokenRepository, UserRepository, UserType, ApprovalStatus (PENDING_APPROVAL/APPROVED/REJECTED), Language
```

---

## 🛠️ Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | Spring Boot **3.5.6** |
| Language | Java **17** (compiled), JDK 21 in IntelliJ |
| Database | PostgreSQL **15** |
| ORM | Spring Data JPA / Hibernate |
| Auth | JWT via **jjwt 0.11.5** (api + impl + jackson) |
| Email | JavaMailSender + Thymeleaf |
| Validation | spring-boot-starter-validation |
| Security | spring-boot-starter-security |
| API Docs | springdoc-openapi-starter-webmvc-ui **2.1.0** |
| Lombok | 1.18.40 |
| Build | Maven wrapper (mvnw, Maven 3.9.11) |
| Containers | Docker Compose — postgres + maildev |

### Center Owner App (this repo)
| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State | Redux Toolkit + RTK Query |
| Persistence | expo-secure-store (native) + localStorage (web fallback) |
| Forms | React Hook Form + Zod |
| i18n | react-i18next (Arabic RTL + English) |
| Web support | react-native-web |
| Camera | expo-camera (for work progress photos) |

---

## 🗄️ Database — Actual State

### Docker Compose Services
- **postgres** — container `le-postgres`, image `postgres:15`, port `5432`
  - DB name: **`experience`** (not `maintenance_db`)
  - Username: `abdelqodous`, Password: `P@ssw0rd`
- **mail-dev** — container `le-mail-dev`, image `maildev/maildev`
  - Web UI: port `1080`, SMTP: port `1025`

### Tables in DB
| Table | Notes |
|-------|-------|
| `_user` | Underscore prefix avoids `user` reserved word conflict |
| `_user_roles` | Join table: users ↔ roles |
| `role` | Roles table |
| `token` | Email verification OTP tokens |
| `maintenance_centers` | Created by Hibernate on first run |
| `service_categories` | Seeded with 6 rows (CAR, ELECTRONICS, HOME_APPLIANCE, etc.) |
| `center_categories` (join) | centers ↔ service_categories |
| `booking` | Created by Hibernate |
| `review` | Created by Hibernate |
| `conversations`, `messages` | Created by Hibernate |

### Key JPA Patterns
- **No shared `BaseEntity`** — each entity has its own `@CreatedDate` / `@LastModifiedDate`
  with `@EntityListeners(AuditingEntityListener.class)` directly
- `@EnableJpaAuditing` is on `ServiceCenterApplication`
- `Address` is `@Embeddable`, embedded in `User` and `MaintenanceCenter`
- Bilingual pattern: `nameAr` / `nameEn`, `descriptionAr` / `descriptionEn`
  — always use this pattern for any user-facing string field
- **Address uses bilingual fields**: `cityAr`/`cityEn`, `districtAr`/`districtEn`,
  `streetAr`/`streetEn`, `governorateAr`/`governorateEn` — no single-language `city`/`street`

---

## 🔐 Authentication — Actual Implementation

### Working Endpoints
```
POST  /api/v1/auth/register           → 202 Accepted (sends OTP email)
                                         Body: { firstname, lastname, email, password, userType? }
                                         userType: "CUSTOMER" (default) | "OWNER"
                                         OWNER starts with approvalStatus=PENDING_APPROVAL

POST  /api/v1/auth/authenticate       → 200 { "token": "<jwt>", "approvalStatus": "APPROVED|PENDING_APPROVAL" }
                                         REJECTED owners receive 500 (blocked at login)

GET   /api/v1/auth/activate-account   → ?token=XXXXXX
```

### Owner Approval Flow
- New OWNER registers → `approvalStatus = PENDING_APPROVAL`
- Admin calls `PUT /admin/users/{id}/approve` → `approvalStatus = APPROVED`
- After login, `approvalStatus` is returned in the auth response
- `(app)/_layout.tsx` also calls `GET /users/me` on session restore to re-check approval status
- If `PENDING_APPROVAL` → user is redirected to `app/(app)/pending-approval.tsx`

### JWT Config (application-dev.yml)
- Expiry: `8640000` ms = **2.4 hours**
- 401 auto-logout middleware in Redux store handles expired tokens

---

## 📡 API Design

- Server context path: `/api/v1/`
- Swagger UI: `http://localhost:8080/api/v1/swagger-ui/index.html`
- Authenticated endpoints require: `Authorization: Bearer <jwt>`
- `LocalTime` fields serialize/deserialize as `"HH:mm:ss"` (ISO format)
  — configured via `spring.jackson.serialization.write-dates-as-timestamps: false`
  and `@JsonFormat(pattern = "HH:mm:ss")` on request DTOs

### Working Endpoints (center owner app)

**Auth**
```
POST  /auth/register                  → 202 (OWNER self-registration)
POST  /auth/authenticate              → { token, approvalStatus }
GET   /auth/activate-account          → ?token=XXXXXX
```

**Admin** (ROLE_ADMIN only)
```
GET   /admin/users/pending            → Page<UserResponse> (pending center owners)
PUT   /admin/users/{id}/approve       → UserResponse
PUT   /admin/users/{id}/reject        → UserResponse
```

**Admin** (ROLE_ADMIN only — Phase 6.0, NOT YET BUILT on backend)
```
GET   /admin/users/pending            → Page<UserResponse> (pending OWNER accounts)
PUT   /admin/users/{id}/approve       → UserResponse
PUT   /admin/users/{id}/reject        → { reason? } → UserResponse
GET   /admin/users?page=&size=&type=  → Page<UserResponse> (all users, filterable by UserType)
```

**Users**
```
GET   /users/me                       → UserResponse (includes approvalStatus)
PUT   /users/me/push-token            → { token } → void
```

**Center**
```
GET   /centers/my/profile             → MaintenanceCenterResponse (full, single object)
PUT   /centers/my                     → MaintenanceCenterRequest → MaintenanceCenterResponse
POST  /centers/my/images              → multipart/form-data file → MaintenanceCenterResponse
GET   /centers/my                     → Page<MaintenanceCenterSummaryResponse>
```

**Categories**
```
GET   /categories                     → ServiceCategory[] (or Page — transformResponse handles both)
```

**Bookings**
```
GET   /bookings?page=&size=&status=   → PageResponse<BookingResponse>
GET   /bookings/{id}                  → BookingResponse
GET   /bookings/stats                 → BookingStats
PUT   /bookings/{id}/status           → { status, reason?, notes? } → BookingResponse
```

**Reviews**
```
GET   /reviews/center?page=&size=     → PageResponse<ReviewResponse>
POST  /reviews/{id}/reply             → { reply } → ReviewResponse
```

**Chat**
```
GET   /conversations/center?page=&size= → PageResponse<ConversationResponse>
GET   /conversations/{id}/messages    → PageResponse<MessageResponse>
POST  /conversations/{id}/messages    → { content, messageType } → MessageResponse
```

**Notifications**
```
GET   /notifications?page=&size=      → PageResponse<NotificationResponse>
PUT   /notifications/{id}/read        → void
PUT   /notifications/read-all         → void
```

### Key Response Field Names (do not rename)
| Field | Type | Notes |
|-------|------|-------|
| `bookingStatus` | enum | NOT `status` |
| `bookingDate` | string | NOT `scheduledDate` |
| `bookingTime` | string | NOT `scheduledTime` |
| `isRead` | boolean | NOT `read` |
| `notificationType` | enum | NOT `type` |
| `totalReviews` | number | NOT `reviewCount` |
| `isActive` | boolean | NOT `isOpen` |
| `userFirstname` + `userLastname` | string | NOT `customerName` on reviews |
| `ownerReply` | string | maps from `Review.centerResponse` |

### PageResponse wrapper
Backend returns paginated data as:
```json
{ "content": [...], "totalElements": 0, "totalPages": 0, "number": 0, "size": 20 }
```
All paginated RTK Query endpoints use `transformResponse` to unwrap this.

### Error Response
```json
{ "businessErrorCode": 304, "businessErrorDescription": "...", "error": "...", "validationErrors": [...] }
```

### RTK Query Tag Types
```typescript
tagTypes: [
  'Bookings', 'Reviews', 'Notifications', 'Conversations',
  'CenterProfile', 'CenterImages',
  'Pricing',        // Phase 3.5
  'WorkProgress',   // Phase 4.0
  'Quotes',         // Phase 4.0
  'Analytics',      // Phase 5.0
]
```

### Base API Config
```typescript
// lib/constants/config.ts
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1/',
  ios: 'http://localhost:8080/api/v1/',
  web: 'http://localhost:8080/api/v1/',
  default: 'http://localhost:8080/api/v1/',
});

export const WS_URL = API_BASE_URL.replace('http', 'ws').replace('/api/v1/', '/ws');
```

---

## 📱 Frontend App Structure

### File Layout
```
maintenance-center-app/
├── app/
│   ├── _layout.tsx                   # Root: Provider + Stack
│   ├── pending-approval.tsx          # Root-level fallback pending screen
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                 # Login screen
│   │   ├── register.tsx              # OWNER self-registration form
│   │   └── verify-otp.tsx            # OTP verification after registration
│   └── (app)/
│       ├── _layout.tsx               # Auth guard + session restore + approval check
│       ├── pending-approval.tsx      # Shown when approvalStatus=PENDING_APPROVAL
│       ├── branch-select.tsx         # Shown when owner has >1 center
│       ├── setup-center.tsx          # First-time center profile setup screen
│       ├── settings/index.tsx        # App settings screen
│       └── (tabs)/
│           ├── _layout.tsx           # Bottom tab navigator
│           ├── index.tsx             # Dashboard
│           ├── bookings/
│           │   ├── _layout.tsx
│           │   ├── index.tsx         # Booking list with status tabs
│           │   └── [id].tsx          # Booking detail + status actions
│           ├── chat/
│           │   ├── _layout.tsx
│           │   ├── index.tsx         # Conversation list
│           │   └── [id].tsx          # Chat thread + WebSocket/STOMP
│           ├── profile/index.tsx     # Center profile editor
│           ├── reviews/index.tsx     # Reviews + reply
│           └── notifications/index.tsx
├── components/
│   ├── bookings/BookingCard.tsx
│   ├── bookings/StatusBadge.tsx
│   ├── chat/MessageBubble.tsx
│   ├── reviews/ReviewCard.tsx
│   └── ui/AppText.tsx, RatingStars.tsx, SearchBar.tsx
├── store/
│   ├── index.ts                      # Store + 401 middleware
│   ├── authSlice.ts                  # session: { token, email }
│   ├── centerSlice.ts                # activeCenterId for multi-branch support
│   └── api/
│       ├── authApi.ts                # login, registerOwner, activateAccount, resendOtp
│       ├── bookingsApi.ts
│       ├── centerApi.ts
│       ├── chatApi.ts
│       ├── notificationsApi.ts
│       └── reviewsApi.ts
├── lib/
│   ├── constants/config.ts           # API_BASE_URL (platform-aware: 10.0.2.2 on Android)
│   ├── storage.ts                    # SecureStore + localStorage fallback
│   └── i18n/locales/en.json ar.json
```

### Session Persistence
- Login → `storage.saveSession(token, email)` → Redux `setSession`
- If `approvalStatus === 'PENDING_APPROVAL'` → redirect to `pending-approval` screen
- App launch → `(app)/_layout.tsx` restores session, then calls `GET /users/me` to re-check `approvalStatus`
- 401 response → Redux middleware clears session → redirect to login
- Logout → `storage.clearAll()` + `dispatch(clearSession())` + `router.replace`

---

## ⚙️ Development Environment

### Running the Backend
```bash
# Start Docker services (postgres + maildev)
docker-compose up -d

# Run Spring Boot
cd ~/IdeaProjects/life-experience-app/service-center
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# API:        http://localhost:8080/api/v1/
# Swagger UI: http://localhost:8080/api/v1/swagger-ui/index.html
# MailDev:    http://localhost:1080
```

### Running the App
```bash
cd ~/MaintenanceCenters/maintenance-center-app
npx expo start --web        # web
npx expo start              # native (needs emulator)
```

---

## 📋 Coding Standards

### Java / Spring Boot
- **`@RequiredArgsConstructor`** for constructor injection — no `@Autowired` on fields
- **`@Slf4j`** for logging
- DTOs for all request/response — never expose JPA entities in controllers
- `@Valid` on all `@RequestBody` parameters
- Service layer owns all business logic — controllers are thin
- Never call `Optional.get()` without checking — use `orElseThrow()`
- `@Transactional` on service methods that write
- Passwords always `BCryptPasswordEncoder` — never plain
- Use `Objects.equals()` for nullable field comparisons — never `a.equals(b)` where `a` can be null

### React Native / TypeScript
- RTK Query for all API calls — no raw `fetch`
- `??` not `||` for null/undefined fallbacks on form state (avoid swallowing `false`)
- `Platform.OS === 'web'` guard for `Alert.alert` multi-button dialogs — use `window.confirm` on web
- Bilingual address fields: always `cityAr`/`cityEn` pairs, never a single `city` field
- Time inputs: separate `openingTime` and `closingTime` in `HH:mm:ss` format

### Existing Enums (do not redefine)
`BookingStatus`, `ServiceType`, `PaymentMethod`, `PaymentStatus`, `CancelledBy`,
`MessageType`, `SenderType`, `ComplaintType`, `ComplaintStatus`, `ComplaintPriority`,
`NotificationType`, `NotificationPriority`, `UserType`, `ApprovalStatus`, `Language`, `SearchSource`

---

## 🚀 Development Phases

### Phase 1 — Backend ✅ Complete
- [x] Project structure, Docker Compose, Maven setup
- [x] User, Role, Token entities + DB tables
- [x] Auth: register, OTP email, activate, login (JWT)
- [x] Global exception handling + BusinessErrorCodes
- [x] All domain entities (Booking, Center, Category, Review, Chat, etc.)
- [x] MaintenanceCenter: full CRUD + image upload + category assignment
- [x] ServiceCategory: seeded with 6 categories
- [x] Booking: list, detail, stats, status transitions
- [x] Review: center reviews list, owner reply
- [x] Chat: conversation list for center, messages
- [x] Notification: list, mark read, mark all read
- [x] Fixed all 7 original bugs from initial audit

### Phase 2 — Center Owner App ✅ Complete
- [x] Expo Router navigation (tabs + nested stacks)
- [x] Auth guard + session persistence (SecureStore / localStorage)
- [x] 401 auto-logout middleware
- [x] Arabic RTL + English i18n
- [x] Dashboard screen
- [x] Bookings list + detail + status update
- [x] Profile editor (bilingual address, categories, opening time, images)
- [x] Reviews list + owner reply
- [x] Chat list + thread + WebSocket/STOMP real-time
- [x] Notifications list + mark read
- [x] Push notifications (expo-notifications + FCM token registration)
- [x] Multi-branch support (branch selector after login, centerSlice in Redux)
- [x] OWNER self-registration + email OTP verification
- [x] Admin approval gate — pending-approval screen, approvalStatus checked on login + session restore

### Phase 2.5 — Production Hardening ⏳ Pending
- [ ] Set EAS project ID in app.json (required for push notifications in production)
- [ ] Switch API_BASE_URL and WS_URL to HTTPS/WSS for production builds
- [ ] Add error boundary component
- [ ] Add crash reporting (Sentry or Firebase Crashlytics)
- [ ] Configure EAS build profiles (dev / staging / prod)

### Phase 3.5 — Trust MVP 🆕
- [ ] Service pricing management screen
- [ ] Pricing CRUD operations
- [ ] Display current trust score/badges

### Phase 3.6 — Offers & Promotions 🆕
- [ ] CenterOffer entity + backend CRUD (create, list, edit, cancel)
- [ ] Offer status computed server-side (SCHEDULED / ACTIVE / EXPIRED / CANCELLED)
- [ ] Offer list screen with status filter tabs
- [ ] Add offer form (bilingual, discount type, date range, service types, redemption cap)
- [ ] Edit offer screen (field restrictions enforced for ACTIVE offers)
- [ ] Redemption counter display (read-only)

### Phase 4.0 — Deep Trust
- [ ] Work stage update screen
- [ ] Photo upload for work progress
- [ ] Quote builder component
- [ ] Quote creation/sending
- [ ] Progress timeline view

### Phase 5.0 — Analytics
- [ ] Performance dashboard
- [ ] Revenue analytics
- [ ] Customer insights

### Phase 3 — Customer App 🔄 ~90% Complete
- [x] Project scaffold (maintenance-customer-app)
- [x] Foundation: auth flow, session, i18n, onboarding, error boundary
- [x] Centers: search/filter list, center detail
- [x] Bookings: list, new (multi-step form), detail + cancel, confirmation, success
- [x] Favorites, notifications, profile view/edit/logout
- [x] My reviews list + write review
- [x] Complaints: list, new, detail
- [x] Chat: conversations list + thread (WebSocket/STOMP)
- [x] Help screen (FAQ)
- [ ] Push notifications (FCM)
- [ ] Privacy, Terms, Notification prefs stub screens
- [ ] Production hardening (HTTPS/WSS, EAS project ID, Sentry)

### Phase 4 — Advanced
- [ ] KNET payment integration (Kuwait)
- [ ] Analytics dashboard for center owners
- [ ] Multi-branch management UI
- [ ] Offline support

### Phase 6.0 — Admin Panel 🆕
- [ ] `ApprovalStatus` enum (PENDING_APPROVAL / APPROVED / REJECTED) + `User.approvalStatus` field (backend)
- [ ] `AdminController` + `AdminService` — approve/reject/list center owners (backend)
- [ ] `ADMIN` role seeding + default admin user bootstrapped on startup (backend)
- [ ] `SecurityConfig`: protect `/admin/**` with `ROLE_ADMIN`
- [ ] `RegistrationRequest`: add optional `userType` field for OWNER self-registration
- [ ] `AuthenticationResponse`: return `approvalStatus` so the app can gate pending owners
- [ ] `AuthenticationService`: set PENDING_APPROVAL on OWNER register; block REJECTED at login

---

## 🆕 Phase 3.5 — Service Pricing

### Types
```typescript
// types/pricing.ts
export interface CenterServicePricing {
  id: number;
  serviceType: ServiceType;
  serviceNameAr: string;
  serviceNameEn: string;
  minPrice: number;
  maxPrice: number;
  typicalDurationMinutes?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePricingRequest {
  serviceType: ServiceType;
  serviceNameAr: string;
  serviceNameEn: string;
  minPrice: number;
  maxPrice: number;
  typicalDurationMinutes?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface UpdatePricingRequest extends CreatePricingRequest {
  isActive?: boolean;
}
```

### API Endpoints
```
GET    /centers/my/pricing            → CenterServicePricing[]
POST   /centers/my/pricing            → CenterServicePricing
PUT    /centers/my/pricing/{id}       → CenterServicePricing
DELETE /centers/my/pricing/{id}       → void
```

### API Slice (store/api/pricingApi.ts)
```typescript
export const pricingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyPricing:   builder.query<CenterServicePricing[], void>({ query: () => 'centers/my/pricing', providesTags: ['Pricing'] }),
    createPricing:  builder.mutation<CenterServicePricing, CreatePricingRequest>({ query: (body) => ({ url: 'centers/my/pricing', method: 'POST', body }), invalidatesTags: ['Pricing'] }),
    updatePricing:  builder.mutation<CenterServicePricing, { id: number; data: UpdatePricingRequest }>({ query: ({ id, data }) => ({ url: `centers/my/pricing/${id}`, method: 'PUT', body: data }), invalidatesTags: ['Pricing'] }),
    deletePricing:  builder.mutation<void, number>({ query: (id) => ({ url: `centers/my/pricing/${id}`, method: 'DELETE' }), invalidatesTags: ['Pricing'] }),
  }),
});
```

---

## 🆕 Phase 4.0 — Work Progress & Quotes

### Work Stage Types
```typescript
// types/workProgress.ts
export type WorkStage =
  | 'RECEIVED' | 'DIAGNOSING' | 'QUOTE_READY' | 'QUOTE_APPROVED' | 'QUOTE_REJECTED'
  | 'PARTS_ORDERED' | 'PARTS_RECEIVED' | 'WORK_IN_PROGRESS' | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP' | 'PICKED_UP';

export interface WorkStageInfo {
  stage: WorkStage;
  displayNameAr: string;
  displayNameEn: string;
  order: number;
  canTransitionTo: WorkStage[];
}

export const WORK_STAGES: WorkStageInfo[] = [
  { stage: 'RECEIVED',         displayNameAr: 'تم استلام السيارة',   displayNameEn: 'Car Received',       order: 1,  canTransitionTo: ['DIAGNOSING'] },
  { stage: 'DIAGNOSING',       displayNameAr: 'جاري الفحص',          displayNameEn: 'Diagnosing',          order: 2,  canTransitionTo: ['QUOTE_READY'] },
  { stage: 'QUOTE_READY',      displayNameAr: 'عرض السعر جاهز',      displayNameEn: 'Quote Ready',         order: 3,  canTransitionTo: ['QUOTE_APPROVED', 'QUOTE_REJECTED'] },
  { stage: 'QUOTE_APPROVED',   displayNameAr: 'تمت الموافقة',         displayNameEn: 'Quote Approved',      order: 4,  canTransitionTo: ['PARTS_ORDERED', 'WORK_IN_PROGRESS'] },
  { stage: 'PARTS_ORDERED',    displayNameAr: 'تم طلب القطع',         displayNameEn: 'Parts Ordered',       order: 5,  canTransitionTo: ['PARTS_RECEIVED'] },
  { stage: 'PARTS_RECEIVED',   displayNameAr: 'وصلت القطع',           displayNameEn: 'Parts Received',      order: 6,  canTransitionTo: ['WORK_IN_PROGRESS'] },
  { stage: 'WORK_IN_PROGRESS', displayNameAr: 'جاري العمل',           displayNameEn: 'Work In Progress',    order: 7,  canTransitionTo: ['QUALITY_CHECK'] },
  { stage: 'QUALITY_CHECK',    displayNameAr: 'فحص الجودة',           displayNameEn: 'Quality Check',       order: 8,  canTransitionTo: ['READY_FOR_PICKUP', 'WORK_IN_PROGRESS'] },
  { stage: 'READY_FOR_PICKUP', displayNameAr: 'جاهز للاستلام',        displayNameEn: 'Ready for Pickup',    order: 9,  canTransitionTo: ['PICKED_UP'] },
  { stage: 'PICKED_UP',        displayNameAr: 'تم الاستلام',          displayNameEn: 'Picked Up',           order: 10, canTransitionTo: [] },
];

export interface UpdateWorkStageRequest {
  stage: WorkStage;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  estimatedMinutesRemaining?: number;
}

export interface BookingWorkProgress {
  id: number;
  stage: WorkStage;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;  // Only visible to center
  photoUrl?: string;
  videoUrl?: string;
  estimatedMinutesRemaining?: number;
  createdAt: string;
  createdByName?: string;
}

export type MediaCategory =
  | 'VEHICLE_ARRIVAL' | 'ISSUE_FOUND' | 'PARTS_USED' | 'WORK_IN_PROGRESS'
  | 'BEFORE_REPAIR' | 'AFTER_REPAIR' | 'QUALITY_CHECK' | 'CUSTOMER_PICKUP';

export interface BookingMedia {
  id: number;
  mediaType: 'PHOTO' | 'VIDEO';
  category: MediaCategory;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  captionAr?: string;
  isVisibleToCustomer: boolean;
  createdAt: string;
}
```

### Work Progress API Endpoints
```
PUT  /bookings/{id}/work-stage        → void
POST /bookings/{id}/work-progress     → BookingWorkProgress  (multipart/form-data)
GET  /bookings/{id}/work-progress     → BookingWorkProgress[]
POST /bookings/{id}/media             → BookingMedia  (multipart/form-data)
GET  /bookings/{id}/media             → BookingMedia[]
```

### Quote Types
```typescript
// types/quote.ts
export interface QuoteLineItem {
  description: string;
  descriptionAr?: string;
  partsCost: number;
  laborCost: number;
}

export interface CreateQuoteRequest {
  lineItems: QuoteLineItem[];
  discountAmount?: number;
  discountReason?: string;
  estimatedDurationMinutes?: number;
  notes?: string;
  notesAr?: string;
}

export interface BookingQuote {
  id: number;
  bookingId: number;
  version: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  totalAmount: number;
  estimatedDurationMinutes?: number;
  notes?: string;
  notesAr?: string;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED';
  sentAt?: string;
  respondedAt?: string;
  responseNotes?: string;
  createdAt: string;
}
```

### Quote API Endpoints
```
GET  /bookings/{id}/quotes            → BookingQuote[]
POST /bookings/{id}/quotes            → BookingQuote
POST /bookings/{id}/quotes/{qid}/send → BookingQuote
```

---

## 🆕 Phase 3.5/4.0 — New Components

### Planned component locations
```
components/
├── bookings/
│   ├── WorkStageSelector.tsx   # Shows available next stages from canTransitionTo
│   └── QuoteBuilder.tsx        # React Hook Form + Zod quote form with line items
├── progress/
│   ├── StageUpdateForm.tsx
│   ├── PhotoUploader.tsx       # expo-image-picker + expo-camera, max 5 photos
│   └── ProgressTimeline.tsx
├── pricing/
│   ├── PricingCard.tsx
│   ├── PricingForm.tsx
│   └── PricingList.tsx
└── dashboard/
    └── TrustScoreCard.tsx      # Phase 4.0
```

### WorkStageSelector — key logic
- Derives available transitions from `WORK_STAGES[currentStage].canTransitionTo`
- Renders only reachable next stages as buttons
- Uses `i18n.language === 'ar'` to pick `displayNameAr` vs `displayNameEn`

### PhotoUploader — key logic
- Uses `expo-image-picker` (gallery) and `expo-camera` (camera)
- Enforces `maxPhotos` limit (default 5)
- Returns `uri[]`; caller builds `FormData` and calls `uploadMedia` mutation

### QuoteBuilder — key logic
- `useFieldArray` for dynamic line items
- Zod schema validates min 1 line item
- Live subtotal/total computed from `watch('lineItems')` and `watch('discountAmount')`
- Amounts displayed as `x.toFixed(3) KD` (Kuwaiti Dinar 3 decimals)

---

## 🌍 i18n Keys to Add

### Phase 3.5
```json
{
  "pricing": {
    "title": "Service Pricing",
    "add": "Add Service",
    "edit": "Edit Pricing",
    "serviceName": "Service Name",
    "minPrice": "Min Price (KD)",
    "maxPrice": "Max Price (KD)",
    "duration": "Typical Duration (minutes)",
    "description": "Description (optional)",
    "saved": "Pricing saved successfully"
  }
}
```

### Phase 4.0
```json
{
  "progress": {
    "title": "Work Progress",
    "updateStage": "Update Stage",
    "currentStage": "Current Stage",
    "addUpdate": "Add Progress Update",
    "notes": "Notes for customer",
    "internalNotes": "Internal notes (not visible to customer)",
    "uploadPhotos": "Upload Photos",
    "gallery": "Gallery",
    "camera": "Camera",
    "estimatedTime": "Estimated time remaining"
  },
  "quote": {
    "createQuote": "Create Quote",
    "lineItems": "Line Items",
    "description": "Service Description",
    "partsCost": "Parts Cost",
    "laborCost": "Labor Cost",
    "addLineItem": "Add Line Item",
    "subtotal": "Subtotal",
    "discount": "Discount",
    "total": "Total",
    "saveQuote": "Save Quote",
    "sendToCustomer": "Send to Customer",
    "quoteSent": "Quote sent successfully"
  },
  "workStage": {
    "RECEIVED": "Car Received",
    "DIAGNOSING": "Diagnosing",
    "QUOTE_READY": "Quote Ready",
    "QUOTE_APPROVED": "Quote Approved",
    "QUOTE_REJECTED": "Quote Rejected",
    "PARTS_ORDERED": "Parts Ordered",
    "PARTS_RECEIVED": "Parts Received",
    "WORK_IN_PROGRESS": "Work In Progress",
    "QUALITY_CHECK": "Quality Check",
    "READY_FOR_PICKUP": "Ready for Pickup",
    "PICKED_UP": "Picked Up"
  }
}
```

---

## 🧠 Claude Code Preferences

### ⚠️ MUST follow — non-negotiable rules

**1. Always ask before executing any command.**
Never run `mvn`, `npm`, `docker`, `git`, or any shell command without stating
what you are about to run and waiting for explicit confirmation.

**2. Always ask before modifying any existing file.**
For every existing file that would change, show:
- The full file path
- A clear summary of what will change and why
Then wait for confirmation before writing.

**3. Always run tests after making changes — and report results.**
```bash
cd ~/IdeaProjects/life-experience-app/service-center && ./mvnw test
```

**4. Always write production-ready code — no pseudocode or placeholders.**

### General Workflow
- **New feature pattern:** Repository → Service → DTOs → Controller
- **Bilingual fields:** Always add both `Ar` and `En` variants
- **Ambiguity:** Ask one focused clarifying question — do not assume
- **Secrets:** Use `application.yml` properties — never hardcode

### Repo Awareness
3 separate repos — always confirm which repo before acting:
- `service-center` — Spring Boot backend at `~/IdeaProjects/life-experience-app/service-center/`
- `maintenance-customer-app` — React Native customer app (in progress, ~90% complete)
- `maintenance-center-app` — React Native center owner app (this repo, complete)



# CLAUDE.md additions — Frontend (`maintenance-center-app`)

> Append these sections to `maintenance-center-app/CLAUDE.md`. Existing content stays.
> The Owner experience is **frozen** for this phase — only add Staff variants alongside,
> never modify Owner screens.

---

## 👥 Two User Types in One App (Phase 2.6)

This app now serves two distinct roles authenticated against the same backend:

| Role          | `userType` from API | Approval gate | Branch selector |
|---------------|---------------------|---------------|-----------------|
| Center Owner  | `CENTER_OWNER`      | ✅ existing   | ✅ if >1 branch |
| Center Staff  | `STAFF`             | ❌ skipped    | ❌ skipped (single `affiliatedCenterId`) |

`AuthResponse` and `GET /users/me` now return `userType` and (for staff)
`affiliatedCenterId`. Both are persisted in `authSlice`.

---

## 🧭 Navigation Strategy — Parallel Layouts

Use **separate route groups** in `app/(app)/`. Do **not** put `if (isOwner)` checks
inside Owner screens. The router decides which tab bar loads.

```
app/
├── (auth)/                           # unchanged
└── (app)/
    ├── _layout.tsx                   # auth guard + role gate
    ├── pending-approval.tsx          # owner-only (unchanged)
    ├── (owner)/                      # ← rename existing tabs into here
    │   ├── _layout.tsx               # 5-tab bar — UNCHANGED behavior
    │   ├── dashboard.tsx
    │   ├── bookings/
    │   ├── reviews/
    │   ├── notifications.tsx
    │   ├── analytics.tsx
    │   ├── profile/                  # CenterProfileScreen + EditCenterScreen
    │   └── staff/                    # ← NEW: owner-only staff management
    │       ├── index.tsx             # list of staff at center
    │       ├── invite.tsx            # invite form
    │       └── [id].tsx              # edit / deactivate
    └── (staff)/                      # ← NEW group
        ├── _layout.tsx               # 5-tab bar — staff variant
        ├── dashboard.tsx             # StaffDashboardScreen
        ├── bookings/
        │   ├── index.tsx             # only assigned bookings
        │   └── [id].tsx              # status update allowed if assigned
        ├── reviews.tsx               # read-only, no Reply button
        ├── notifications.tsx         # personal (same data, different screen file)
        ├── analytics.tsx             # StaffAnalyticsScreen (no revenue)
        └── profile.tsx               # MemberProfileScreen (user, not center)
```

### Role-gate logic (in `app/(app)/_layout.tsx`)

```tsx
const { token, userType, approvalStatus, hydrated } = useSelector(s => s.auth);

if (!hydrated) return <Splash />;
if (!token) return <Redirect href="/(auth)/login" />;

if (userType === 'CENTER_OWNER') {
  if (approvalStatus === 'PENDING_APPROVAL') return <Redirect href="/(app)/pending-approval" />;
  if (approvalStatus === 'REJECTED')         return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)/(owner)/dashboard" />;
}

if (userType === 'STAFF') {
  return <Redirect href="/(app)/(staff)/dashboard" />;
}

// CUSTOMER somehow logged into the wrong app
return <Redirect href="/(auth)/login?error=wrong-app" />;
```

> **Why redirect not Slot?** Expo Router resolves Slot lazily and we want the URL
> to reflect the active role (helpful for deep links and debugging).

---

## 🎨 Staff Tab Bar — Spec

5 tabs, in this order, mirroring the Owner layout for muscle memory:

| Tab           | Icon (lucide)    | Screen                            | Notes |
|---------------|------------------|-----------------------------------|-------|
| Dashboard     | `LayoutDashboard`| `StaffDashboardScreen`            | Stats card grid (4 cards) + recent assigned bookings list. **No Center Profile shortcut.** Quick-action buttons: "My Bookings", "My Reviews", "My Profile". |
| Bookings      | `CalendarCheck`  | `StaffBookingsScreen`             | Same card layout as owner; data source is `useGetMyAssignedBookingsQuery`. Filters by status. |
| Reviews       | `Star`           | `StaffReviewsScreen`              | Read-only `ReviewCard` variant — `ReviewCard.tsx` accepts `showReply: boolean = true`; pass `false` here. |
| Notifications | `Bell`           | `StaffNotificationsScreen`        | Identical UI to owner (personal notifications). Reuse `NotificationsList` component. |
| Profile       | `User`           | `MemberProfileScreen`             | Edits `_user` fields (firstname, lastname, phone, dateOfBirth, language, password change). **No center fields.** |

**Hidden for staff** vs owner:
- ❌ "Center Profile" quick action on dashboard
- ❌ "Reply" button on review cards
- ❌ Center editor / images / hours / categories
- ❌ Staff management screen
- ❌ Center-wide analytics & revenue numbers

---

## 🗂️ Redux — `authSlice` changes

Extend the existing slice; do not create a new one.

```ts
interface AuthState {
  token: string | null;
  user: UserResponse | null;
  approvalStatus: ApprovalStatus | null;
  userType: 'CENTER_OWNER' | 'STAFF' | 'CUSTOMER' | null;   // ← new
  affiliatedCenterId: number | null;                         // ← new
  hydrated: boolean;
}
```

Persist all fields via `expo-secure-store` (native) and `localStorage` (web)
using the existing keys + `lex.userType` and `lex.affiliatedCenterId`.

### `centerSlice` interaction
- For **OWNER**: `activeCenterId` is set by branch-selector flow (unchanged).
- For **STAFF**: on login, copy `affiliatedCenterId` → `centerSlice.activeCenterId`
  immediately. Skip the branch selector entirely.

---

## 🌐 RTK Query — New Endpoints

Add to `services/centerApi.ts` (or wherever your `createApi` lives):

```ts
// Owner-side staff management
getCenterStaff:    builder.query<Page<CenterStaffResponse>, { active?: boolean; page?: number }>({...})
inviteStaff:       builder.mutation<CenterStaffResponse, StaffInviteRequest>({...})
updateStaff:       builder.mutation<CenterStaffResponse, { id: number } & StaffUpdateRequest>({...})
deactivateStaff:   builder.mutation<void, number>({...})
assignBooking:     builder.mutation<BookingResponse, { bookingId: number; staffUserId: number | null }>({...})

// Staff-side
getMyAssignedBookings: builder.query<Page<BookingResponse>, { status?: BookingStatus; page?: number }>({...})
getMyAssignedReviews:  builder.query<Page<ReviewResponse>, { page?: number }>({...})
getStaffDashboard:     builder.query<StaffDashboardResponse, void>({...})
getStaffAnalytics:     builder.query<StaffAnalyticsResponse, { period: 'WEEK'|'MONTH'|'QUARTER'|'YEAR' }>({...})

// Public
activateStaff:     builder.mutation<AuthResponse, { token: string; password: string }>({...})
```

Tag invalidation: `'Staff'`, `'Booking'`, `'Review'` — mutations that affect
the other party (e.g. `assignBooking`) must invalidate `Booking` for both
the owner and (when WebSocket-pushed) the staff session.

---

## 🧩 Reusable Components — Variants Needed

| Component             | Change                                                       |
|-----------------------|--------------------------------------------------------------|
| `ReviewCard`          | Add prop `showReplyAction?: boolean = true`. When false, hide owner-reply UI. |
| `BookingCard`         | Add prop `showAssignedTo?: boolean = false`. Owner uses true to show "Assigned: <staff>". Staff list passes false. |
| `BookingDetailScreen` | Owner sees an "Assign to staff" picker; staff sees just an assignee badge. Branch on `userType` from authSlice. |
| `StatCard`            | No change — just instantiate with different titles/values. |
| `QuickActionButton`   | No change — just render a different set per role. |

---

## 🔁 Push Notifications

`expo-notifications` token registration is unchanged — same `PUT /users/me/push-token`.
Backend will route notifications based on the user (not role), so:
- New assigned booking → push to `assigned_staff_id`'s token
- New review on assigned booking → push to that staff member
- New booking arriving at center (any) → push to owner

No frontend change beyond ensuring staff users register their token on login
just like owners do.

---

## 🌍 i18n — New Keys

Add to `locales/en.json` and `locales/ar.json` (always both):

```
staff.dashboard.title
staff.dashboard.assignedTotal
staff.dashboard.assignedActive
staff.dashboard.assignedCompleted
staff.dashboard.assignedThisWeek
staff.dashboard.avgRating
staff.bookings.empty
staff.reviews.title
staff.reviews.empty
staff.profile.title
staff.profile.memberSince
staff.profile.jobTitle
staff.analytics.title
staff.analytics.completionRate
staff.analytics.onTimeRate
staff.activate.title
staff.activate.setPassword
owner.staff.title
owner.staff.invite
owner.staff.inviteSuccess
owner.staff.deactivate
owner.staff.deactivateConfirm
owner.bookings.assignTo
owner.bookings.unassign
```

---

## 🚀 Phase Tracker — Add Entry

Append under "Development Phases":

```
### Phase 2.6 — Center Staff (Frontend) ⏳ Pending
- [ ] authSlice: userType + affiliatedCenterId persisted
- [ ] (app)/_layout.tsx role gate (OWNER vs STAFF redirect)
- [ ] (owner)/ route group — move existing tabs without behavior changes
- [ ] (owner)/staff — list, invite, edit/deactivate screens
- [ ] (owner) BookingDetail — assign/unassign UI
- [ ] (staff)/ route group — 5 tabs as specified
- [ ] StaffDashboard, StaffBookings, StaffReviews, StaffAnalytics, MemberProfile
- [ ] ReviewCard.showReplyAction prop, BookingCard.showAssignedTo prop
- [ ] /activate-account?staff=true flow → POST /auth/staff/activate
- [ ] i18n keys added in en + ar
- [ ] Visual smoke test: login as staff → cannot navigate to (owner)/* via deep link
```
