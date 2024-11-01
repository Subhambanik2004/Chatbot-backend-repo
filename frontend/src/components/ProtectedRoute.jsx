// ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ element: Element }) => {
    const user = useSelector((state) => state.auth.user); // Get user data from Redux

    // If the user is not logged in, redirect to the Auth page
    return user ? <Element /> : <Navigate to="/" />;
};

export default ProtectedRoute;
