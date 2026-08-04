import React, { useEffect, useRef } from 'react';

const Chat = ({
    messages,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    isLoading,
}) => {
    const bottomRef = useRef(null);

    // Keep the latest message in view as the conversation grows
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isLoading]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Empty state, shown before the first message arrives */}
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.05 0-2.058-.16-3-.457L3 21l1.512-4.032C3.55 15.658 3 13.895 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-600">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-[220px]">Ask a question about your document to get started</p>
                    </div>
                )}

                {/* Message Display */}
                {messages.map(message => (
                    <div key={message.id} className={`flex items-end gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                        {!message.isUser && (
                            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        )}
                        <div
                            className={`max-w-[75%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed text-[15px] ${message.isUser
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                                }`}
                            dangerouslySetInnerHTML={{
                                __html: message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }}
                        ></div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-bl-md shadow-sm bg-white text-gray-800 border border-gray-200">
                            <div className="typing-indicator" aria-label="Waiting for response">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                )}

                {/* Scroll anchor */}
                <div ref={bottomRef} />
            </main>

            <footer className="bg-white/95 backdrop-blur border-t border-gray-200 p-3">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputMessage.trim()}
                        aria-label="Send message"
                        className="flex-shrink-0 bg-indigo-600 text-white h-10 w-10 rounded-full hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m0 0l-6-6m6 6l-6 6" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default Chat;