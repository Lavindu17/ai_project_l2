// Chat Interface JavaScript

let messageCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('chat-form');
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to UI
        addMessage('user', message);
        messageInput.value = '';
        messageCount++;

        // Show typing indicator
        const typingId = showTyping();

        // Send to backend
        try {
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            // Remove typing indicator
            removeTyping(typingId);

            if (data.success) {
                addMessage('ai', data.response);

                // Show submit button after several exchanges
                if (data.message_count >= 8) {
                    document.getElementById('submit-btn')style.display = 'block';
                }
            } else {
                alert('Error: ' + (data.error || 'Failed to send message'));
            }
        } catch (error) {
            removeTyping(typingId);
            console.error('Error:', error);
            alert('Failed to send message. Please try again.');
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Submit with Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
});

function addMessage(role, content) {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'ai' ? '🤖' : '👤';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';

    const p = document.createElement('p');
    p.textContent = content;

    contentDiv.appendChild(p);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
    const messagesContainer = document.getElementById('chat-messages');

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';

    contentDiv.appendChild(indicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(contentDiv);

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return 'typing-indicator';
}

function removeTyping(id) {
    const typing = document.getElementById(id);
    if (typing) {
        typing.remove();
    }
}

async function submitRetrospective() {
    const isAnonymous = document.getElementById('is-anonymous').checked;
    let userName = 'Anonymous';

    if (!isAnonymous) {
        userName = prompt('Please enter your name:');
        if (!userName || userName.trim() === '') {
            alert('Name is required for non-anonymous submissions');
            return;
        }
    }

    try {
        const response = await fetch('/api/response/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                is_anonymous: isAnonymous
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success modal
            document.getElementById('success-modal').style.display = 'flex';

            // Hide chat interface
            document.querySelector('.chat-container').style.display = 'none';
        } else {
            alert('Error: ' + (data.error || 'Failed to submit'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit. Please try again.');
    }
}
