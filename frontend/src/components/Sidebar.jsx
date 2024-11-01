import React from 'react';

const Sidebar = ({ sidebarOpen, setSidebarOpen, chats = [], activeChat, setActiveChat, handleNewChat, handleDeleteChat, fetchMessagesForSession }) => {
    return (
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-indigo-800">
                    <h2 className="text-xl font-bold">Chats</h2>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <button onClick={handleNewChat} className="flex items-center w-full p-4 hover:bg-indigo-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </button>
                    {chats.length > 0 ? (
                        chats.map(chat => (
                            <div key={chat.session_id} className="relative group">
                                <button
                                    onClick={() => {
                                        setActiveChat(chat.session_id);
                                        fetchMessagesForSession(chat.session_id);
                                    }}
                                    className={`flex items-center w-full p-4 hover:bg-indigo-800 transition-colors text-sm ${activeChat === chat.session_id ? 'bg-indigo-800' : ''}`}
                                >
                                    {/* Display the session's description or timestamp */}
                                    {chat.pdf_descriptions || new Date(chat.started_at).toLocaleString()}
                                </button>
                                <button
                                    onClick={() => handleDeleteChat(chat.session_id)}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-gray-400">No chats available</div>
                    )}

                </div>
                <button className="flex items-center justify-center p-4 border-t border-indigo-800 hover:bg-indigo-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instructions
                </button>
            </div>
        </div>
    );
};


export default Sidebar;
