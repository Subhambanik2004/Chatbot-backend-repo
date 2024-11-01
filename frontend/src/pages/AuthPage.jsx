// AuthPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser, clearUser } from "../redux/authSlices"; // Import actions from Redux
import { supabase } from "../utils/auth"; // Supabase client
// import { Auth } from "@supabase/auth-ui-react"; // Supabase Auth UI component
// import { ThemeSupa } from "@supabase/auth-ui-shared"; // Supabase theme
import "../styles/auth.css"; // Your custom CSS

const AuthPage = () => {
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between Sign In and Sign Up
    const [showEmailSignUp, setShowEmailSignUp] = useState(false); // Email signup form toggle
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        // Listen for authentication state changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_IN") {
                const user = session.user;
                dispatch(setUser(user)); // Store the user in Redux
                navigate("/chat"); // Navigate to chat page after login
            } else if (event === "SIGNED_OUT") {
                dispatch(clearUser()); // Clear user data in Redux on logout
                navigate("/"); // Navigate back to home
            }
        });

        // Cleanup the listener on component unmount
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [dispatch, navigate]);

    // Handle Google sign-up/login
    const handleGoogleSignUp = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
            if (data) {
                const { user } = data;
                dispatch(setUser(user)); // Dispatch user data to Redux store
                navigate("/chat"); // Navigate to chat page
            }
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    // Handle email-based form submission for login/sign-up
    const handleSubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        try {
            let data, error;
            if (isSignUp) {
                // Sign-up logic
                const name = e.target.name.value;
                const confirmPassword = e.target['confirm-password'].value;

                if (password !== confirmPassword) {
                    alert("Passwords do not match!");
                    return;
                }

                ({ data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name }, // Storing user metadata like name
                    },
                }));
            } else {
                // Sign-in logic
                ({ data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                }));
            }

            if (error) throw error;

            if (data) {
                const { user } = data;
                dispatch(setUser(user)); // Dispatch user data to Redux store
                navigate("/chat"); // Navigate to chat page
            }
        } catch (error) {
            console.error("Error in authentication:", error);
            alert("Authentication failed! Please try again.");
        }
    };

    return (
        <div className="auth-container">
            <div className={`auth-box ${isSignUp ? 'sign-up' : ''}`}>
                <h2 className="auth-title">Welcome to AI Doc Assist</h2>
                <p className="auth-subtitle">
                    {isSignUp ? "Create your account" : "Sign in to your account"}
                </p>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-fields">
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="Email address"
                        />
                        <input
                            type="password"
                            name="password"
                            required
                            placeholder="Password"
                        />
                        {showEmailSignUp && isSignUp && (
                            <>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Full Name"
                                />
                                <input
                                    type="password"
                                    name="confirm-password"
                                    required
                                    placeholder="Confirm Password"
                                />
                            </>
                        )}
                    </div>
                    <button type="submit" className="auth-button primary-button">
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>Or continue with</span>
                </div>
                <button onClick={handleGoogleSignUp} className="auth-google-button">
                    <i className="fab fa-google"></i> Sign up with Google
                </button>

                {isSignUp && !showEmailSignUp && (
                    <button
                        onClick={() => setShowEmailSignUp(true)}
                        className="auth-switch-link"
                    >
                        Sign up with email
                    </button>
                )}

                <div className="auth-switch-container">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setShowEmailSignUp(false);
                        }}
                        className="auth-switch-link"
                    >
                        {isSignUp
                            ? "Already have an account? Sign In"
                            : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
