import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setSentryCenter } from '@/lib/sentry';
import type { CenterRole, CenterPermission } from '@/types/staff';

interface CenterState {
  activeCenterId: number | null;
  activeUserRole: CenterRole | null;
  activePermissions: CenterPermission[];
}

const initialState: CenterState = {
  activeCenterId: null,
  activeUserRole: null,
  activePermissions: [],
};

const centerSlice = createSlice({
  name: 'center',
  initialState,
  reducers: {
    setActiveCenterId: (state, action: PayloadAction<number>) => {
      state.activeCenterId = action.payload;
      setSentryCenter(action.payload);
    },
    setActiveCenter: (state, action: PayloadAction<{ centerId: number; role: CenterRole; permissions: CenterPermission[] }>) => {
      state.activeCenterId = action.payload.centerId;
      state.activeUserRole = action.payload.role;
      state.activePermissions = action.payload.permissions;
      setSentryCenter(action.payload.centerId);
    },
    clearActiveCenter: (state) => {
      state.activeCenterId = null;
      state.activeUserRole = null;
      state.activePermissions = [];
    },
  },
});

export const { setActiveCenterId, setActiveCenter, clearActiveCenter } = centerSlice.actions;
export default centerSlice.reducer;
