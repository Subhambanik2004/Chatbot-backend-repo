// store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlices'; // Import authReducer

const store = configureStore({
    reducer: {
        auth: authReducer, // Add the auth reducer
    },
});

export default store;
