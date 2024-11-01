import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux'; // Import useSelector to get the user from Redux
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirection
import { supabase } from '../utils/auth'; // Supabase import
import { LogOut } from 'react-feather'; // Assuming you're using react-feather for icons
import userIcon from '../assets/user.jpg'; // Placeholder icon if the user has no avatar

const Navbar = () => {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const dropdownRef = useRef(null); // Create a ref for the dropdown
    const navigate = useNavigate(); // Initialize navigate for redirecting
    const { user } = useSelector((state) => state.auth); // Get the user from the Redux state

    // Handle clicking outside the dropdown to close it
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowProfileDropdown(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Sign out function
    const signOutUser = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        } else {
            navigate('/'); // Redirect to homepage after successful logout
        }
    };

    return (
        <nav className="bg-white shadow-sm p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-indigo-900">PDF Chatbot</h1>

            <div className="relative flex items-center" ref={dropdownRef}>
                <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                    <div className="h-12 w-12 rounded-full bg-[#414141] flex items-center justify-center">
                        <img
                            src={user?.user_metadata?.avatar_url || userIcon} // Display user's avatar or a default icon
                            alt="user_pic"
                            className="rounded-full"
                        />
                    </div>
                    <span className="hidden sm:inline">
                        {user?.user_metadata?.name || user?.user_metadata?.email || 'User'}
                    </span>
                </div>

                {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                        <button
                            onClick={signOutUser} // Call the signOutUser function when clicking logout
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                            <LogOut className="mr-2" /> Log out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;