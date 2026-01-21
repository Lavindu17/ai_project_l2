from flask import Blueprint, request, jsonify, render_template, session
from app.services.gemini_service import GeminiService
from app.services.database_service import DatabaseService
import uuid
from datetime import datetime

chat_bp = Blueprint('chat', __name__)
db = DatabaseService()
ai = GeminiService()

@chat_bp.route('/api/chat/validate/<token>', methods=['GET'])
def validate_chat_token(token):
    """Validate chat token and return session info"""
    # Validate token and get sprint info
    sprint = db.get_sprint_by_token(token)
    
    if not sprint:
        return jsonify({'valid': False, 'error': 'Invalid or expired link'}), 404
    
    if sprint.get('status') not in ['collecting', 'active']:
        return jsonify({'valid': False, 'error': 'This retrospective is no longer accepting responses'}), 403
    
    # Create new session for this chat
    session_token = str(uuid.uuid4())
    session['session_token'] = session_token
    session['sprint_id'] = sprint['id']
    
    # Create session in database
    db.create_session(sprint['id'], session_token)
    
    return jsonify({
        'valid': True,
        'sprint': sprint,
        'session_token': session_token
    })

@chat_bp.route('/api/chat/message', methods=['POST'])
def send_message():
    """Process user message and return AI response"""
    data = request.json
    user_message = data.get('message', '').strip()
    session_token = session.get('session_token')
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
    
    if not session_token:
        return jsonify({'error': 'No active session'}), 401
    
    # Get conversation history
    history = db.get_conversation_history(session_token)
    
    # Add user message to history
    history.append({
        'role': 'user',
        'content': user_message,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Get AI response
    try:
        ai_response = ai.conduct_interview(history, user_message)
        
        # Add AI response to history
        history.append({
            'role': 'ai',
            'content': ai_response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Save updated history
        db.save_conversation_state(session_token, history)
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'message_count': len(history)
        })
    
    except Exception as e:
        print(f"Error in chat: {e}")
        return jsonify({'error': 'Failed to get AI response'}), 500

@chat_bp.route('/api/response/submit', methods=['POST'])
def submit_response():
    """Submit completed retrospective response"""
    data = request.json
    session_token = session.get('session_token')
    sprint_id = session.get('sprint_id')
    
    if not session_token or not sprint_id:
        return jsonify({'error': 'No active session'}), 401
    
    user_name = data.get('name', '').strip() or 'Anonymous'
    is_anonymous = data.get('is_anonymous', False)
    
    # Get final conversation
    conversation = db.get_conversation_history(session_token)
    
    if len(conversation) == 0:
        return jsonify({'error': 'No conversation to submit'}), 400
    
    # Save response
    try:
        response_id = db.save_response(
            sprint_id=sprint_id,
            user_name=user_name if not is_anonymous else 'Anonymous',
            is_anonymous=is_anonymous,
            conversation=conversation,
            session_token=session_token
        )
        
        # Mark team member as submitted (if not anonymous)
        if not is_anonymous:
            db.mark_member_submitted(sprint_id, user_name)
        
        # Clear session
        session.clear()
        
        return jsonify({
            'success': True,
            'message': 'Thank you for your feedback!',
            'response_id': response_id
        })
    
    except Exception as e:
        print(f"Error submitting response: {e}")
        return jsonify({'error': 'Failed to submit response'}), 500

@chat_bp.route('/api/chat/<session_token>/history', methods=['GET'])
def get_chat_history(session_token):
    """Get conversation history for a session"""
    history = db.get_conversation_history(session_token)
    return jsonify({'history': history})
