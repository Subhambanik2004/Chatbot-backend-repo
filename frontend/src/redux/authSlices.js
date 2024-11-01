// authSlices.js
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isSidebarOpen: true,
    },
    reducers: {
        setOpenSidebar: (state, action) => {
            state.isSidebarOpen = action.payload;
        },
        setUser: (state, action) => {
            // Store the user in the state when authenticated
            state.user = action.payload;
        },
        clearUser: (state) => {
            // Clear the user when logged out
            state.user = null;
        },
    },
});

export const { setOpenSidebar, setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
