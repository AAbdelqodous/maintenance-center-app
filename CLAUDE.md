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
└── user/           # User, Token, TokenRepository, UserRepository, UserType, Language
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
| i18n | react-i18next (Arabic RTL + English) |
| Web support | react-native-web |

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
POST  /api/v1/auth/authenticate       → 200 { "token": "<jwt>" }
GET   /api/v1/auth/activate-account   → ?token=XXXXXX
```

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
POST  /auth/authenticate              → { token }
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

---

## 📱 Frontend App Structure

### File Layout
```
maintenance-center-app/
├── app/
│   ├── _layout.tsx                   # Root: Provider + Stack
│   ├── (auth)/login.tsx              # Login screen
│   └── (app)/
│       ├── _layout.tsx               # Auth guard + session restore
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
│           │   └── [id].tsx          # Chat thread
│           ├── profile/index.tsx     # Center profile editor
│           ├── reviews/index.tsx     # Reviews + reply
│           └── notifications/index.tsx
├── components/
│   ├── bookings/BookingCard.tsx
│   ├── bookings/StatusBadge.tsx
│   ├── reviews/ReviewCard.tsx
│   └── ui/RatingStars.tsx
├── store/
│   ├── index.ts                      # Store + 401 middleware
│   ├── authSlice.ts                  # session: { token, email }
│   └── api/
│       ├── authApi.ts
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
- App launch → `(app)/_layout.tsx` restores session from SecureStore/localStorage
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
cd ~/MaintenanceCenter/maintenance-center-app
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
`NotificationType`, `NotificationPriority`, `UserType`, `Language`, `SearchSource`

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

### Phase 2 — Center Owner App (IN PROGRESS)
- [x] Expo Router navigation (tabs + nested stacks)
- [x] Auth guard + session persistence (SecureStore / localStorage)
- [x] 401 auto-logout middleware
- [x] Arabic RTL + English i18n
- [x] Dashboard screen
- [x] Bookings list + detail + status update
- [x] Profile editor (bilingual address, categories, opening time, images)
- [x] Reviews list + owner reply
- [x] Chat list + thread
- [x] Notifications list + mark read
- [ ] Push notifications (FCM)
- [ ] Real-time chat (WebSocket/STOMP)
- [ ] Multi-branch support (branch selector after login)

### Phase 3 — Customer App
- [ ] React Native customer app (~30 screens)

### Phase 4 — Advanced
- [ ] KNET payment integration (Kuwait)
- [ ] Analytics dashboard for center owners
- [ ] Multi-branch management UI
- [ ] Offline support

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
- `maintenance-customer-app` — React Native customer app (not started)
- `maintenance-center-app` — React Native center owner app (this repo, in progress)
