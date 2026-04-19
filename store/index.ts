import { configureStore, isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer, { clearSession } from './authSlice';
import centerReducer, { clearActiveCenter } from './centerSlice';
import { storage } from '../lib/storage';
import { authApi } from './api/authApi';
import { bookingsApi } from './api/bookingsApi';
import { centerApi } from './api/centerApi';
import { chatApi } from './api/chatApi';
import { notificationsApi } from './api/notificationsApi';
import { reviewsApi } from './api/reviewsApi';
import { pricingApi } from './api/pricingApi';
import { trustApi } from './api/trustApi';
import { workProgressApi } from './api/workProgressApi';
import { quotesApi } from './api/quotesApi';
import { analyticsApi } from './api/analyticsApi';

const unauthenticatedMiddleware: Middleware = ({ dispatch }) => (next) => (action) => {
  if (isRejectedWithValue(action) && (action.payload as any)?.status === 401) {
    storage.clearAll().catch(() => {});
    dispatch(clearSession());
    dispatch(clearActiveCenter());
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    center: centerReducer,
    [authApi.reducerPath]: authApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [centerApi.reducerPath]: centerApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [reviewsApi.reducerPath]: reviewsApi.reducer,
    [pricingApi.reducerPath]: pricingApi.reducer,
    [trustApi.reducerPath]: trustApi.reducer,
    [workProgressApi.reducerPath]: workProgressApi.reducer,
    [quotesApi.reducerPath]: quotesApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(
      unauthenticatedMiddleware,
      authApi.middleware,
      bookingsApi.middleware,
      centerApi.middleware,
      chatApi.middleware,
      notificationsApi.middleware,
      reviewsApi.middleware,
      pricingApi.middleware,
      trustApi.middleware,
      workProgressApi.middleware,
      quotesApi.middleware,
      analyticsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
