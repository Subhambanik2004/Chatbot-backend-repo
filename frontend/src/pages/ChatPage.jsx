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


                console.log("API Base URL:", process.env.REACT_APP_FASTAPI_BASEURL);

                console.log(`${process.env.REACT_APP_FASTAPI_BASEURL}/add_pdf/${sessionId}`);
                const response = await axios.post(`https://chatbot-backend-repo.vercel.app/add_pdf/${sessionId}`,
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
        if (!inputMessage.trim() || !activeSessionId) return;

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
            console.log(`${process.env.REACT_APP_FASTAPI_BASEURL}`)
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
        <div className="flex h-screen">
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

            <div className="flex-1 flex flex-col">
                <Navbar handleLogout={() => supabase.auth.signOut()} />
                {activeSessionId ? (
                    <Chat
                        messages={messages}
                        inputMessage={inputMessage}
                        setInputMessage={setInputMessage}
                        handleSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        setSidebarOpen={setSidebarOpen}

                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select or create a chat to start messaging
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
