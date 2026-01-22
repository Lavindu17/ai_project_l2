import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client';
import '../styles/chat.css';

const ChatInterface = () => {
    const { token } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sprint, setSprint] = useState(null);
    const [member, setMember] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [readyToSubmit, setReadyToSubmit] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);
    const [totalQuestions] = useState(8);
    const [interviewComplete, setInterviewComplete] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        initializeChat();
    }, [token, location.state]);

    const initializeChat = async () => {
        console.log('Initializing Chat. Token:', token, 'Location State:', location.state);

        // Priority 1: State passed from navigation (e.g. from Dashboard)
        if (location.state?.member && location.state?.sprint) {
            console.log('Restoring from location state');
            const { member: memberInfo, sprint: sprintInfo, history, submitted: isSubmitted } = location.state;
            setMember(memberInfo);
            setSprint(sprintInfo);

            if (isSubmitted) {
                setSubmitted(true);
                setIsReadOnly(true);
            }

            if (history && history.length > 0) {
                console.log('History found in state:', history.length);
                setMessages(history);
            } else {
                console.log('No history in state, generating welcome');
                const welcomeMessage = generateWelcomeMessage(memberInfo, sprintInfo);
                setMessages([{
                    role: 'ai',
                    content: welcomeMessage
                }]);
            }
            setLoading(false);
            return;
        }

        // Priority 2: Token in URL (e.g. email link or refresh on chat page)
        if (token) {
            console.log('Validating token from URL...');
            await validateToken();
            return;
        }

        // Priority 3: Recover from session cookie (e.g. /chat/session route)
        console.log('Recovering session from cookie...');
        await recoverSession();
    };

    const recoverSession = async () => {
        console.log('Calling /api/chat/current-session');
        try {
            const response = await client.get('/api/chat/current-session');
            console.log('Current session response:', response.data);

            if (response.data.active) {
                setMember(response.data.member);
                setSprint(response.data.sprint);

                if (response.data.member?.has_submitted) {
                    console.log('User has already submitted');
                    setSubmitted(true);
                    setIsReadOnly(true);
                }

                if (response.data.history && response.data.history.length > 0) {
                    setMessages(response.data.history);
                } else {
                    const welcomeMessage = generateWelcomeMessage(response.data.member, response.data.sprint);
                    setMessages([{
                        role: 'ai',
                        content: welcomeMessage
                    }]);
                }
                setLoading(false);
            } else {
                console.warn('No active session returned from backend');
                setError('No active session found. Please use your access code or link again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Recover session error:', err);
            setError('Session expired or invalid. Please login again.');
            setLoading(false);
        }
    };

    const generateWelcomeMessage = (memberInfo, sprintInfo) => {
        const name = memberInfo?.name || 'there';
        const role = memberInfo?.role || 'Team Member';
        const sprintName = sprintInfo?.name || 'this sprint';

        let message = `Hi ${name}! 👋 I'm here to gather your feedback for ${sprintName}.`;

        if (role.toLowerCase().includes('developer') || role.toLowerCase().includes('engineer')) {
            message += ` As a ${role}, I'd love to hear about your technical experiences.`;
        } else if (role.toLowerCase().includes('qa') || role.toLowerCase().includes('test')) {
            message += ` As a ${role}, your perspective on quality and testing is valuable.`;
        } else if (role.toLowerCase().includes('design')) {
            message += ` As a ${role}, I'm interested in your design and UX insights.`;
        } else if (role.toLowerCase().includes('product') || role.toLowerCase().includes('manager')) {
            message += ` As a ${role}, your strategic perspective helps us improve.`;
        }

        if (sprintInfo?.goals && sprintInfo.goals.length > 0) {
            message += `\n\nFor context, this sprint's goals were:`;
            sprintInfo.goals.slice(0, 3).forEach((goal) => {
                const goalText = goal.goal_text || goal;
                if (goalText) {
                    message += `\n• ${goalText}`;
                }
            });
        }

        message += `\n\nLet's start with the positives - what went really well this sprint?`;

        return message;
    };

    const validateToken = async () => {
        try {
            console.log('Validating token:', token);
            const response = await client.get(`/api/chat/validate/${token}`);
            console.log('Validate response:', response.data);

            if (response.data.valid) {
                setSprint(response.data.sprint);
                if (response.data.member) {
                    setMember(response.data.member);
                }

                if (response.data.submitted) {
                    setSubmitted(true);
                    setIsReadOnly(true);
                }

                if (response.data.history && response.data.history.length > 0) {
                    console.log('History found:', response.data.history.length);
                    setMessages(response.data.history);
                } else {
                    console.log('No history, setting welcome message');
                    setMessages([{
                        role: 'ai',
                        content: "Hi! I'm here to help improve your team's sprint process. Let's start with the positives - what went really well this sprint?"
                    }]);
                }
            }
        } catch (err) {
            console.error('Validate token error:', err);
            setError(err.response?.data?.error || 'Invalid link');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending || isReadOnly || readyToSubmit) return;

        const userMsg = input.trim();
        setInput('');
        setSending(true);

        const newMessages = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);

        try {
            const response = await client.post('/api/chat/message', { message: userMsg });
            if (response.data.success) {
                setMessages([...newMessages, { role: 'ai', content: response.data.response }]);

                // Update question progress
                if (response.data.question_number) {
                    setQuestionNumber(response.data.question_number);
                }

                // Check if interview is complete
                if (response.data.interview_complete) {
                    setInterviewComplete(true);
                    setReadyToSubmit(true);
                } else if (response.data.ready_to_submit) {
                    setReadyToSubmit(true);
                }
            }
        } catch (err) {
            console.error('Chat error', err);
            setMessages([...newMessages, {
                role: 'ai',
                content: "I'm sorry, I encountered an error. Please try again."
            }]);
        } finally {
            setSending(false);
        }
    };

    const handleSubmit = async () => {
        if (!readyToSubmit && messages.length < 4) {
            alert('Please have a bit more conversation before submitting.');
            return;
        }

        try {
            const response = await client.post('/api/response/submit', {
                name: member?.name,
                is_anonymous: false
            });

            if (response.data.success) {
                setSubmitted(true);
                setIsReadOnly(true);
            }
        } catch (err) {
            console.error('Submit error', err);
            alert('Failed to submit. Please try again.');
        }
    };

    if (loading) {
        return (
            <div style={styles.fullPage}>
                <div style={styles.loadingContainer}>
                    <div className="loading-spinner"></div>
                    <p style={styles.loadingText}>Preparing your retrospective session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.fullPage}>
                <div style={styles.errorContainer}>
                    <div style={styles.errorIcon}>⚠️</div>
                    <h3 style={styles.errorTitle}>Unable to Access</h3>
                    <p style={styles.errorText}>{error}</p>
                    <button onClick={() => navigate('/')} style={styles.backButton}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    // New logic: If submitted, we show the chat in read-only mode, but maybe with a banner
    // We do NOT return the full success screen immediately unless we want to exit.
    // However, the previous logic returned success screen immediately on `submitted`.
    // The requirement is: "user should be able to login again and see the chathistory"
    // So if they are submitted, they should see history.

    // Let's change the "Success" screen to be an overlay or just a banner, 
    // OR we only show the Success Screen if they JUST submitted.
    // If they re-login (isReadOnly=true on init), we show chat.

    // Actually, let's keep the Success Screen as a "Exit" state, but allow them to "View History" from it?
    // Or better: Just render the chat with a "Feedback Submitted" header.

    return (
        <div style={styles.chatWrapper}>
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.headerLeft}>
                        <h2 style={styles.headerTitle}>{sprint?.name || 'Sprint'} Retrospective</h2>
                        {member && (
                            <div style={styles.headerMeta}>
                                <span style={styles.memberName}>{member.name}</span>
                                <span style={styles.roleBadge}>{member.role}</span>
                            </div>
                        )}
                    </div>

                    {/* Progress Tracker */}
                    {!isReadOnly && !interviewComplete && (
                        <div style={styles.progressTracker}>
                            <div style={styles.progressLabel}>
                                Question {questionNumber} of {totalQuestions}
                            </div>
                            <div style={styles.progressBarContainer}>
                                <div style={{
                                    ...styles.progressBarFill,
                                    width: `${(questionNumber / totalQuestions) * 100}%`
                                }} />
                            </div>
                        </div>
                    )}

                    {isReadOnly ? (
                        <div style={styles.submittedBadge}>
                            ✓ Feedback Submitted
                        </div>
                    ) : (
                        interviewComplete && (
                            <button onClick={handleSubmit} style={styles.submitButton}>
                                ✓ Submit Feedback
                            </button>
                        )
                    )}
                </div>
            </header>

            <div style={styles.messagesArea}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={msg.role === 'user' ? styles.userMessageRow : styles.aiMessageRow}>
                        <div style={msg.role === 'user' ? styles.userAvatar : styles.aiAvatar}>
                            {msg.role === 'user' ? '👤' : '🤖'}
                        </div>
                        <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                            <p style={styles.messageText}>{msg.content}</p>
                        </div>
                    </div>
                ))}
                {sending && (
                    <div style={styles.typingContainer}>
                        <div style={styles.typingDot}></div>
                        <div style={{ ...styles.typingDot, animationDelay: '0.15s' }}></div>
                        <div style={{ ...styles.typingDot, animationDelay: '0.3s' }}></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={styles.inputForm}>
                <div style={styles.inputGroup}>
                    {interviewComplete && !isReadOnly && (
                        <div style={styles.readyOverlay}>
                            <p>✅ Interview complete! Please submit your feedback above.</p>
                        </div>
                    )}
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isReadOnly ? "Feedback submitted. Chat is read-only." : (interviewComplete ? "Interview complete. Please submit your feedback." : "Share your thoughts...")}
                        style={{
                            ...styles.textarea,
                            backgroundColor: (isReadOnly || interviewComplete) ? '#edf2f7' : '#fafbff',
                            cursor: (isReadOnly || interviewComplete) ? 'not-allowed' : 'text'
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                        disabled={isReadOnly || interviewComplete}
                    />
                    <button
                        type="submit"
                        style={(input.trim() && !sending && !isReadOnly && !interviewComplete) ? styles.sendButton : styles.sendButtonDisabled}
                        disabled={sending || !input.trim() || isReadOnly || interviewComplete}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    fullPage: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px',
    },
    loadingContainer: {
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    },
    loadingText: {
        color: '#4a5568',
        fontSize: '16px',
        marginTop: '16px',
    },
    errorContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxWidth: '400px',
    },
    errorIcon: {
        fontSize: '56px',
        marginBottom: '20px',
    },
    errorTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '12px',
    },
    errorText: {
        color: '#718096',
        fontSize: '16px',
        marginBottom: '24px',
    },
    backButton: {
        padding: '14px 32px',
        background: '#4299e1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '15px',
        boxShadow: '0 4px 6px rgba(66, 153, 225, 0.3)',
    },
    successContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '48px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxWidth: '440px',
    },
    successIcon: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        fontSize: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 28px',
        boxShadow: '0 10px 30px rgba(17, 153, 142, 0.35)',
    },
    successTitle: {
        fontSize: '26px',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '12px',
    },
    successText: {
        color: '#4a5568',
        fontSize: '16px',
    },
    successHint: {
        color: '#718096',
        marginTop: '12px',
        fontSize: '14px',
        maxWidth: '320px',
        margin: '12px auto 0',
        lineHeight: '1.5',
    },
    doneButton: {
        marginTop: '28px',
        padding: '16px 40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.35)',
    },
    chatWrapper: {
        maxWidth: '900px',
        margin: '0 auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    },
    header: {
        background: 'white',
        padding: '20px 24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        borderBottom: '1px solid #e2e8f0',
    },
    headerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {},
    headerTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#1a202c',
        marginBottom: '6px',
    },
    headerMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    memberName: {
        color: '#4a5568',
        fontSize: '14px',
    },
    roleBadge: {
        background: '#ebf8ff',
        color: '#4299e1',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
    },
    submitButton: {
        padding: '12px 24px',
        background: '#48bb78',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(72, 187, 120, 0.3)',
        transition: 'all 0.2s',
    },
    messagesArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: 'white',
        margin: '16px',
        borderRadius: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    userMessageRow: {
        display: 'flex',
        flexDirection: 'row-reverse',
        gap: '12px',
        marginBottom: '20px',
    },
    aiMessageRow: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#4299e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0,
        color: 'white',
    },
    aiAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#48bb78',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0,
        color: 'white',
    },
    userBubble: {
        background: '#4299e1',
        color: 'white',
        padding: '14px 18px',
        borderRadius: '18px 18px 4px 18px',
        maxWidth: '70%',
        boxShadow: '0 2px 8px rgba(66, 153, 225, 0.2)',
    },
    aiBubble: {
        backgroundColor: '#f8fafc',
        color: '#2d3748',
        padding: '14px 18px',
        borderRadius: '18px 18px 18px 4px',
        maxWidth: '70%',
        border: '1px solid #e2e8f0',
    },
    messageText: {
        margin: 0,
        fontSize: '15px',
        lineHeight: '1.5',
        whiteSpace: 'pre-line',
    },
    typingContainer: {
        display: 'flex',
        gap: '6px',
        padding: '16px 20px',
        backgroundColor: 'white',
        borderRadius: '18px',
        width: 'fit-content',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    },
    typingDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: '#4299e1',
        animation: 'bounce 1.4s infinite',
    },
    inputForm: {
        padding: '16px 16px 24px',
        backgroundColor: 'transparent',
    },
    inputGroup: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end',
        background: 'white',
        padding: '16px',
        borderRadius: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    },
    textarea: {
        flex: 1,
        resize: 'none',
        minHeight: '48px',
        maxHeight: '120px',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '2px solid #e2e8f0',
        fontSize: '15px',
        color: '#2d3748',
        background: '#fafbff',
        outline: 'none',
        fontFamily: 'inherit',
    },
    sendButton: {
        padding: '14px 28px',
        background: '#4299e1',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(66, 153, 225, 0.3)',
        transition: 'all 0.2s',
    },
    sendButtonDisabled: {
        padding: '14px 28px',
        background: '#e2e8f0',
        color: '#a0aec0',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'not-allowed',
    },
    submittedBadge: {
        background: '#f0fff4',
        color: '#047857',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    readyOverlay: {
        position: 'absolute',
        bottom: '100%',
        left: '0',
        right: '0',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '10px',
        fontSize: '14px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(17, 153, 142, 0.25)',
        animation: 'fadeIn 0.3s ease',
    },
    progressTracker: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        minWidth: '140px',
    },
    progressLabel: {
        color: '#4a5568',
        fontSize: '13px',
        fontWeight: '600',
        letterSpacing: '0.3px',
    },
    progressBarContainer: {
        width: '100%',
        height: '6px',
        backgroundColor: '#e2e8f0',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        background: '#4299e1',
        borderRadius: '10px',
        transition: 'width 0.4s ease-out',
    }
};

export default ChatInterface;
