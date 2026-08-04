import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/auth';
import { LogOut, ChevronDown } from 'react-feather';
import userIcon from '../assets/user.jpg';

const Navbar = () => {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

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

    const signOutUser = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
        } else {
            navigate('/');
        }
    };

    const displayName = user?.user_metadata?.name || user?.user_metadata?.email || 'User';

    return (
        <nav className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">PDF Chatbot</h1>
            </div>

            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-indigo-100 flex items-center justify-center bg-gray-200">
                        <img
                            src={user?.user_metadata?.avatar_url || userIcon}
                            alt="user_pic"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[140px] truncate">
                        {displayName}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}
                    />
                </button>

                {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg ring-1 ring-black/5 py-1.5 z-10 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-100">
                            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                            {user?.user_metadata?.email && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{user.user_metadata.email}</p>
                            )}
                        </div>
                        <button
                            onClick={signOutUser}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;