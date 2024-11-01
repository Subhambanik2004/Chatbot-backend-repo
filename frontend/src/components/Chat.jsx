import React from 'react';

const Chat = ({ messages, inputMessage, setInputMessage, handleSendMessage, setSidebarOpen }) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* Header Section */}
            <header className="bg-white shadow-md p-4 flex items-center justify-between md:justify-end">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold text-indigo-900">Chat with PDF</h2>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Message Display */}
                {messages.map(message => (
                    <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-lg shadow ${message.isUser ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            {message.text}
                        </div>
                    </div>
                ))}
            </main>

            <footer className="bg-white shadow-md p-4">
                <form onSubmit={handleSendMessage} className="flex items-center">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H4m0 0l8-8m-8 8l8 8" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default Chat;
