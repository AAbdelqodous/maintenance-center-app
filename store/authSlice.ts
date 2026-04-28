import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  session: { token: string; email: string; userType: 'CUSTOMER' | 'CENTER_OWNER' | 'ADMIN' } | null;
}

const initialState: AuthState = { session: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ token: string; email: string; userType: 'CUSTOMER' | 'CENTER_OWNER' | 'ADMIN' }>) {
      state.session = action.payload;
    },
    clearSession(state) {
      state.session = null;
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
