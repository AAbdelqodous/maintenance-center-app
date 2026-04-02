# Maintenance Center Owner App

A React Native mobile application for maintenance center owners to manage their business operations.

## Tech Stack

- **Expo** with Expo Router (file-based routing)
- **TypeScript**
- **Redux Toolkit + RTK Query** for API calls and state management
- **react-i18next** for Arabic/English (RTL support)
- **StyleSheet.create** only — no NativeWind, no Tailwind, no inline styles
- **@expo/vector-icons** (Ionicons) for icons
- **expo-image-picker** for photos
- **@stomp/stompjs** for real-time WebSocket communication

## Project Structure

```
maintenance-center-app/
├── app/                          # Expo Router pages
│   ├── (app)/                    # Authenticated app screens
│   │   ├── (tabs)/               # Bottom tab navigator
│   │   │   ├── index.tsx         # Dashboard
│   │   │   ├── bookings/         # Bookings management
│   │   │   ├── chat/             # Real-time messaging
│   │   │   ├── reviews/          # Reviews management
│   │   │   ├── notifications/    # Notifications
│   │   │   └── profile/          # Center profile
│   │   └── _layout.tsx           # Auth guard layout
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx             # Login screen
│   │   └── _layout.tsx           # Auth layout
│   └── _layout.tsx               # Root layout (Redux Provider + i18n)
├── components/                   # Reusable components
│   ├── ui/                       # UI components
│   │   ├── AppText.tsx           # RTL-aware Text wrapper
│   │   ├── SearchBar.tsx         # Search input
│   │   └── RatingStars.tsx       # Star rating display
│   ├── bookings/                 # Booking-related components
│   │   ├── BookingCard.tsx       # Booking summary card
│   │   └── StatusBadge.tsx       # Colored status badge
│   ├── chat/                     # Chat components
│   │   └── MessageBubble.tsx     # Chat message bubble
│   └── reviews/                  # Review components
│       └── ReviewCard.tsx        # Review with reply form
├── store/                        # Redux store configuration
│   ├── index.ts                  # Store configuration
│   ├── authSlice.ts              # Authentication slice
│   └── api/                      # RTK Query API slices
│       ├── authApi.ts            # Authentication endpoints
│       ├── centerApi.ts          # Center profile endpoints
│       ├── bookingsApi.ts        # Booking management endpoints
│       ├── reviewsApi.ts         # Reviews endpoints
│       ├── chatApi.ts            # Chat/messaging endpoints
│       └── notificationsApi.ts   # Notifications endpoints
└── lib/                          # Utility libraries
    ├── constants/
    │   └── config.ts             # API URLs and configuration
    └── i18n/                     # Internationalization
        ├── index.ts              # i18next configuration
        └── locales/
            ├── en.json           # English translations
            └── ar.json           # Arabic translations
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (optional, can use npx)

### Installation

1. Navigate to the project directory:
```bash
cd maintenance-center-app
```

2. Install dependencies (already done):
```bash
npm install
```

### Running the App

Start the development server:
```bash
npm start
```

Then run on your preferred platform:
- **iOS**: Press `i` in the terminal or run `npm run ios`
- **Android**: Press `a` in the terminal or run `npm run android`
- **Web**: Press `w` in the terminal or run `npm run web`

### API Configuration

The API base URL is configured in `lib/constants/config.ts`:

```typescript
export const API_BASE_URL = 'http://10.0.2.2:8080/api/v1'; // Android emulator
// export const API_BASE_URL = 'http://localhost:8080/api/v1'; // iOS simulator / web
```

Uncomment the appropriate line based on your target platform.

## Features

### Dashboard
- Today's bookings statistics
- Pending and confirmed booking counts
- Average rating display
- Recent bookings list
- Quick action buttons

### Bookings Management
- List all bookings with status filters
- View booking details
- Update booking status (Confirm, Start Service, Complete, Cancel)
- Real-time status updates

### Chat/Messaging
- Real-time messaging using STOMP WebSocket
- Conversation list with unread counts
- Message history
- Auto-scroll to latest messages

### Reviews
- View all customer reviews
- Star rating display
- Reply to reviews
- Average rating calculation

### Notifications
- Real-time notifications
- Mark as read functionality
- Notification categories
- Unread count badge

### Profile Management
- Edit center information
- Manage opening hours
- Toggle open/closed status
- Upload and delete center photos
- Multilingual support (Arabic/English)

## Internationalization

The app supports Arabic and English with full RTL (Right-to-Left) support for Arabic.

Switch languages by modifying the i18n configuration in `lib/i18n/index.ts`:

```typescript
i18n.use(initReactI18next).init({
  lng: 'en', // Change to 'ar' for Arabic
  // ...
});
```

## Authentication

The app uses JWT token-based authentication. The token is stored in Redux and automatically included in all API requests via the RTK Query baseQuery configuration.

## State Management

- **Redux Toolkit** for global state management
- **RTK Query** for API calls with caching, loading states, and automatic re-fetching
- **Auth slice** for managing user session

## Styling

All styles use `StyleSheet.create` for consistent, maintainable styling. No inline styles, NativeWind, or Tailwind CSS are used.

## Build for Production

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```

## License

This project is proprietary and confidential.
