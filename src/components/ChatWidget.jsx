import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatWidget = ({ isVisible, onClose }) => {
    const [messages, setMessages] = useState([
        { sender: 'bot', text: 'Hello! How can I help you with the LazAI Data Marketplace today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/chat', { message: input });
            const botMessage = { sender: 'bot', text: res.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Chat API error:", error);
            toast.error(error.response?.data?.message || 'Failed to get a response from the assistant.');
            const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 right-4 w-96 h-[440px] bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-2xl flex flex-col z-30 border border-gray-700">
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-t-xl">
                <h3 className="font-bold text-white flex items-center gap-2"><Bot size={20} /> LazAI Assistant</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-white"/></div>}
                        <div className={`p-3 rounded-lg max-w-xs text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-300 rounded-bl-none'}`}>
                            {msg.sender === 'bot' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : <p>{msg.text}</p>}
                        </div>
                        {msg.sender === 'user' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><User size={20} className="text-white"/></div>}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0"><Bot size={20} className="text-white"/></div>
                        <div className="p-3 rounded-lg bg-gray-700">
                           <Loader size={20} className="animate-spin text-gray-300" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full bg-gray-700 text-white p-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isLoading}
                />
                <button type="submit" className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-500" disabled={isLoading}>
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export const FloatingChatButton = ({ onClick }) => (
    <button 
        onClick={onClick}
        className="fixed bottom-4 right-4 bg-purple-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition-transform hover:scale-110 z-30"
        aria-label="Open Chat"
    >
        <MessageSquare size={32} />
    </button>
);

export default ChatWidget;
