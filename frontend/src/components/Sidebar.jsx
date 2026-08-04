import React from 'react';

const Sidebar = ({ sidebarOpen, setSidebarOpen, chats = [], activeChat, setActiveChat, handleNewChat, handleDeleteChat, fetchMessagesForSession }) => {
    return (
        <>
            {/* Mobile backdrop, dims the page behind the drawer */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 md:hidden"
                    aria-hidden="true"
                ></div>
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-indigo-950 to-indigo-900 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 flex flex-col shadow-xl md:shadow-none`}>

                {/* Brand / header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-400/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-indigo-300" style={{ height: 18, width: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.05 0-2.058-.16-3-.457L3 21l1.512-4.032C3.55 15.658 3 13.895 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h2 className="text-base font-semibold tracking-tight">Chats</h2>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-indigo-300 hover:text-white transition-colors"
                        aria-label="Close sidebar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* New chat action */}
                <div className="p-3">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium shadow-sm transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* Chat list */}
                <div className="flex-grow overflow-y-auto px-3 pb-3">
                    {chats.length > 0 && (
                        <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                            Recent
                        </p>
                    )}

                    {chats.length > 0 ? (
                        <div className="space-y-1">
                            {chats.map(chat => (
                                <div key={chat.session_id} className="relative group">
                                    <button
                                        onClick={() => {
                                            setActiveChat(chat.session_id);
                                            fetchMessagesForSession(chat.session_id);
                                        }}
                                        className={`flex flex-col w-full rounded-lg px-3 py-2.5 pr-9 text-left transition-colors ${activeChat === chat.session_id
                                                ? 'bg-indigo-500/25 ring-1 ring-inset ring-indigo-400/40'
                                                : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`text-sm truncate ${activeChat === chat.session_id ? 'text-white font-medium' : 'text-indigo-100'}`}>
                                            {chat.pdf_descriptions || 'Untitled chat'}
                                        </span>
                                        <span className="text-xs text-indigo-400 mt-0.5">
                                            {new Date(chat.started_at).toLocaleString()}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteChat(chat.session_id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-opacity"
                                        aria-label="Delete chat"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center px-4 py-10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.05 0-2.058-.16-3-.457L3 21l1.512-4.032C3.55 15.658 3 13.895 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-sm text-indigo-300">No chats yet</p>
                            <p className="text-xs text-indigo-400 mt-0.5">Start a new chat to begin</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <button className="flex items-center justify-center gap-2 p-4 border-t border-white/10 text-sm text-indigo-200 hover:bg-white/5 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instructions
                </button>
            </div>
        </>
    );
};


export default Sidebar;