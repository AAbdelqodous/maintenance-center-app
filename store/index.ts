import { configureStore, isRejectedWithValue, Middleware } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer, { clearSession } from './authSlice';
import { storage } from '../lib/storage';
import { authApi } from './api/authApi';
import { bookingsApi } from './api/bookingsApi';
import { centerApi } from './api/centerApi';
import { chatApi } from './api/chatApi';
import { notificationsApi } from './api/notificationsApi';
import { reviewsApi } from './api/reviewsApi';

const unauthenticatedMiddleware: Middleware = ({ dispatch }) => (next) => (action) => {
  if (isRejectedWithValue(action) && (action.payload as any)?.status === 401) {
    storage.clearAll().catch(() => {});
    dispatch(clearSession());
  }
  return next(action);
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [bookingsApi.reducerPath]: bookingsApi.reducer,
    [centerApi.reducerPath]: centerApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [reviewsApi.reducerPath]: reviewsApi.reducer,
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
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
