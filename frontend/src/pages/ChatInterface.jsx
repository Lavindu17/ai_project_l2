import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import '../styles/chat.css';

const ChatInterface = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sprint, setSprint] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    // Auto-scroll
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        try {
            const response = await client.get(`/chat/validate/${token}`);
            if (response.data.valid) {
                setSprint(response.data.sprint);
                // Load initial history if any or welcome message
                // Currently backend creates new session, so history is empty.
                // WE could add a welcome message locally or fetch it.
                // Let's create a local welcome message for better UX
                setMessages([{
                    role: 'ai',
                    content: "Hi! I'm here to help improve your team's sprint process. Let's start with the positives - what went really well this sprint?"
                }]);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid link');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        const userMsg = input.trim();
        setInput('');
        setSending(true);

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);

        try {
            const response = await client.post('/chat/message', { message: userMsg });
            if (response.data.success) {
                setMessages([...newMessages, { role: 'ai', content: response.data.response }]);
            }
        } catch (err) {
            console.error('Chat error', err);
            // Optionally show error in chat
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="text-center" style={{ marginTop: '2rem' }}>Loading...</div>;
    if (error) return <div className="text-center" style={{ marginTop: '2rem', color: 'red' }}>{error}</div>;

    return (
        <div className="chat-container">
            <header className="chat-header">
                <h2>{sprint?.name} Retrospective</h2>
                <div className="subtitle">Share your feedback honestly</div>
            </header>

            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role === 'user' ? 'user-message' : ''}`}>
                        <div className="avatar">
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div className="content">
                            <p>{msg.content}</p>
                        </div>
                    </div>
                ))}
                {sending && (
                    <div className="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
                <div className="input-group">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your answer here..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button type="submit" className="btn-send" disabled={sending || !input.trim()}>
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;
