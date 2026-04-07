import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CenterState {
  activeCenterId: number | null;
}

const initialState: CenterState = {
  activeCenterId: null,
};

const centerSlice = createSlice({
  name: 'center',
  initialState,
  reducers: {
    setActiveCenterId: (state, action: PayloadAction<number>) => {
      state.activeCenterId = action.payload;
    },
    clearActiveCenter: (state) => {
      state.activeCenterId = null;
    },
  },
});

export const { setActiveCenterId, clearActiveCenter } = centerSlice.actions;
export default centerSlice.reducer;
