import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import UploadModal from '../components/UploadModal';
import { supabase } from "../utils/auth";
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChatPage = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const sidebarRef = useRef(null);

    useEffect(() => {
        // Load all sessions for the logged-in user
        const fetchSessions = async () => {
            try {
                // Wait until the session is available
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (user) {
                    const { data: sessions, error } = await supabase
                        .from('sessions')
                        .select('session_id, started_at, document_ids')
                        .eq('user_id', user.id);  // Use user.id instead of email

                    if (error) {
                        console.error('Error fetching sessions:', error);
                    } else {
                        // Fetch metadata for each document if document_ids exist
                        const updatedSessions = await Promise.all(sessions.map(async (session) => {
                            if (session.document_ids.length > 0) {
                                // Fetch document metadata for each document ID
                                const { data: documents } = await supabase
                                    .from('documents')
                                    .select('metadata')
                                    .in('id', session.document_ids);

                                // Create a description string for the PDFs
                                const descriptions = documents.map(doc => doc.metadata?.filename || 'Unnamed PDF');
                                return { ...session, pdf_descriptions: descriptions.join(', ') };
                            }
                            return session;
                        }));

                        setSessions(updatedSessions);  // Update the sessions state with document descriptions
                    }
                }
            } catch (error) {
                console.error('Error fetching user sessions:', error);
            }
        };

        fetchSessions();
    }, []); // Runs once on component mount
    // Runs once on component mount

    useEffect(() => {
        // Close sidebar if clicked outside
        const handleClickOutside = (event) => {
            if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setSidebarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [sidebarOpen]);

    const fetchMessagesForSession = async (sessionId) => {
        console.log('Fetching messages for session ID:', sessionId); // Debug log

        if (!sessionId) {
            console.warn('No session ID provided.'); // Check if sessionId is valid
            return;
        }

        try {
            // Get session details to check document_ids
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('document_ids')
                .eq('session_id', sessionId)
                .single();

            if (sessionError) {
                console.error('Error fetching session details:', sessionError);
                return;
            }

            // Check if document_ids is empty or null
            if (!sessionData.document_ids || sessionData.document_ids.length === 0) {
                setShowUploadModal(true); // Show upload modal if no documents are present
                setActiveSessionId(sessionId); // Set active session ID in case modal needs it
                return; // Exit if we need to upload documents first
            }

            // Fetch chat messages for the session
            const { data, error } = await supabase
                .from('chat_history')
                .select('message, role, timestamp')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching chat messages:', error);
                setMessages([]); // Clear messages on error
                return;
            }

            setMessages(data.map(msg => ({
                id: msg.id,
                text: msg.message,
                isUser: msg.role === 'human',
                timestamp: msg.timestamp,
            })));
        } catch (e) {
            console.error('Exception fetching messages:', e);
            setMessages([]); // Clear messages on exception
        }
    };

    useEffect(() => {
        if (activeSessionId) {
            fetchMessagesForSession(activeSessionId);
        }
    }, [activeSessionId]);

    const handleNewChat = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const session_id = crypto.randomUUID();  // Generate a session ID similar to backend
        const timestamp = new Date().toISOString();

        const { data, error } = await supabase
            .from('sessions')
            .insert([{
                session_id,                // Use generated session ID
                started_at: timestamp,     // Set the start timestamp
                last_updated: timestamp,   // Set the last updated timestamp
                user_id: user.id,          // Replace email with user_id
                document_ids: [],          // Initialize with an empty list of document IDs
            }])
            .select();

        if (error) {
            console.error('Error creating new session:', error);
        } else if (data && data.length > 0) {
            const newSession = data[0];
            setSessions(prevSessions => [newSession, ...prevSessions]);
            setActiveSessionId(newSession.session_id);
            setMessages([]);  // Clear messages for new session
            setShowUploadModal(true);  // Show upload modal to allow file uploads
        }
    };


    const handleFileUpload = async (event) => {
        const files = event.target.files;

        // Proceed only if files are selected
        if (files.length) {
            try {
                // Get the current user's session
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                if (!user) return;

                // Set session ID and timestamp
                const sessionId = activeSessionId;
                const timestamp = new Date().toISOString();

                // Prepare form data for uploading multiple files
                const formData = new FormData();
                Array.from(files).forEach((file) => {
                    formData.append('files', file);
                });

                console.log(`${process.env.REACT_APP_FASTAPI_BASEURL}`)
                const response = await axios.post(`${process.env.REACT_APP_FASTAPI_BASEURL}add_pdf/${sessionId}`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                // Handle response from the backend
                if (response.status === 200) {
                    const result = response.data;

                    // Update sessions with new document IDs
                    const updatedSessions = sessions.map(session =>
                        session.session_id === sessionId
                            ? { ...session, document_ids: result.documentIds }
                            : session
                    );
                    setSessions(updatedSessions); // Update the sessions state

                    // Show success notification
                    toast.success("PDFs uploaded successfully!");

                    // Close the upload modal
                    setShowUploadModal(false);

                    // Update session's last_updated timestamp in Supabase
                    await supabase
                        .from('sessions')
                        .update({ last_updated: timestamp })
                        .eq('session_id', sessionId);

                } else {
                    // Handle unexpected response
                    console.error("Failed to upload PDFs: Unexpected response status");
                    toast.error("Failed to upload PDFs. Please try again.");
                }
            } catch (error) {
                console.error('Error uploading PDFs:', error);
                toast.error("Failed to upload PDFs. Please try again.");
            }
        }
    };



    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeSessionId || isLoading) return;

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        const newMessage = { id: Date.now(), text: inputMessage, isUser: true };
        setMessages([...messages, newMessage]);
        setInputMessage('');
        setIsLoading(true);

        // Save the user's message to the database
        const timestamp = new Date().toISOString();
        await supabase
            .from('chat_history')
            .insert([{
                session_id: activeSessionId,
                user_id: user.id,
                message: inputMessage,
                role: 'human',
                timestamp,
            }]);

        try {
            // Send user message to the backend API
            console.log(`${process.env.REACT_APP_FASTAPI_BASEURL}chat`)
            const response = await axios.post(`${process.env.REACT_APP_FASTAPI_BASEURL}chat`, {
                session_id: activeSessionId,
                text: inputMessage,
            });
            // Get the response from the backend (bot's reply)
            const botResponse = response.data.reply;

            // Append bot's response to the chat
            const newBotMessage = { id: Date.now() + 1, text: botResponse, isUser: false };
            setMessages(prevMessages => [...prevMessages, newBotMessage]);

            // Save bot response to the database
            await supabase
                .from('chat_history')
                .insert([{
                    session_id: activeSessionId,
                    user_id: user.id,
                    message: botResponse,
                    role: 'ai',  // Save as AI response
                    timestamp: new Date().toISOString(),
                }]);

        } catch (error) {
            console.error("Error communicating with the chat API:", error);
            toast.error("Failed to get a response from the bot.");
        }

        setIsLoading(false);
    };


    const handleDeleteChat = async (sessionId) => {
        await supabase
            .from('sessions')
            .delete()
            .eq('session_id', sessionId);

        setSessions(sessions.filter(session => session.session_id !== sessionId));
        if (activeSessionId === sessionId) setActiveSessionId(null);
    };

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900">
            <Sidebar
                sidebarRef={sidebarRef}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                chats={sessions} // Replace 'sessions' with 'chats' prop
                activeChat={activeSessionId}
                setActiveChat={(sessionId) => {
                    setActiveSessionId(sessionId);
                    fetchMessagesForSession(sessionId);
                }}
                handleNewChat={handleNewChat}
                handleDeleteChat={handleDeleteChat}
                fetchMessagesForSession={fetchMessagesForSession}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Navbar handleLogout={() => supabase.auth.signOut()} />

                <header className="bg-white/95 backdrop-blur border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Open sidebar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2 mx-auto md:mx-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-indigo-600" style={{ height: 18, width: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {activeSessionId
                                ? `Chat with ${sessions.find(s => s.session_id === activeSessionId)?.pdf_descriptions || "PDF"}`
                                : "PDF Chat"}
                        </h2>
                    </div>
                </header>

                {activeSessionId ? (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <Chat
                            messages={messages}
                            inputMessage={inputMessage}
                            setInputMessage={setInputMessage}
                            handleSendMessage={handleSendMessage}
                            isLoading={isLoading}
                        />

                        {/* Subtle "assistant is typing" indicator, layered on top so Chat's own layout is untouched */}
                        {isLoading && (
                            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2">
                                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-md backdrop-blur">
                                    <span className="flex gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">Thinking…</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center px-6">
                        <div className="flex flex-col items-center text-center max-w-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 mb-5">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-8 w-8 text-indigo-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.05 0-2.058-.16-3-.457L3 21l1.512-4.032C3.55 15.658 3 13.895 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                No chat selected
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-500">
                                Pick a conversation from the sidebar, or start a new one to upload a PDF and begin chatting.
                            </p>
                            <button
                                onClick={handleNewChat}
                                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Start new chat
                            </button>
                        </div>
                    </div>
                )}

                <UploadModal
                    showUploadModal={showUploadModal}
                    setShowUploadModal={setShowUploadModal}
                    handleFileUpload={handleFileUpload}
                />
                <ToastContainer />
            </div>
        </div>
    );
};

export default ChatPage;