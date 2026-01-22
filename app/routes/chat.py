from flask import Blueprint, request, jsonify, render_template, session
from app.services.groq_service import GroqService
from app.services.gemini_service import GeminiService
from app.services.database_service import DatabaseService
import uuid
from datetime import datetime

chat_bp = Blueprint('chat', __name__)
db = DatabaseService()
chat_ai = GroqService()      # Fast chat with Groq
summary_ai = GeminiService() # Summaries with Gemini

@chat_bp.route('/api/chat/start-session', methods=['POST'])
def start_session():
    """Start chat session for logged-in user"""
    if not session.get('email'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    sprint_id = data.get('sprint_id')
    
    # Check membership
    user_email = session.get('email')
    members = db.get_team_members(sprint_id)
    member = next((m for m in members if m.get('email') == user_email), None)
    
    if not member and session.get('role') != 'leader':
        return jsonify({'error': 'Not a member of this sprint'}), 403
        
    # If leader is testing, mock a member object or handle differently
    if not member and session.get('role') == 'leader':
        member = {'id': None, 'name': session.get('full_name', 'Leader'), 'role': 'Project Lead'}
    
    # Check for existing active session
    if member.get('id'):
        existing_session = db.get_active_session(sprint_id, member.get('id'))
        if existing_session:
            session_token = existing_session['session_token']
            history = existing_session.get('conversation_history', [])
            
            session['session_token'] = session_token
            session['sprint_id'] = sprint_id
            session['member_id'] = member.get('id')
            session['member_name'] = member.get('name')
            session['member_role'] = member.get('role', 'Team Member')
            
            return jsonify({
                'success': True,
                'session_token': session_token,
                'member': member,
                'history': history,
                'restored': True
            })

    # Create session
    session_token = str(uuid.uuid4())
    session['session_token'] = session_token
    session['sprint_id'] = sprint_id
    session['member_id'] = member.get('id')
    session['member_name'] = member.get('name')
    session['member_role'] = member.get('role', 'Team Member')
    
    db.create_session(sprint_id, session_token, member_id=member.get('id'))
    
    return jsonify({
        'success': True,
        'session_token': session_token,
        'member': member
    })

@chat_bp.route('/api/chat/validate/<token>', methods=['GET'])
def validate_chat_token(token):
    """Validate chat token and return session info"""
    # Validate token and get sprint info
    sprint = db.get_sprint_by_token(token)
    
    if not sprint:
        return jsonify({'valid': False, 'error': 'Invalid or expired link'}), 404
    
    if sprint.get('status') not in ['collecting', 'active']:
        return jsonify({'valid': False, 'error': 'This retrospective is no longer accepting responses'}), 403
    
    # Check for existing active session in cookie
    current_session_token = session.get('session_token')
    if current_session_token:
        # Verify it belongs to this sprint
        history = db.get_conversation_history(current_session_token)
        # We assume if history exists (or even empty list returned from verify), it's valid.
        # Ideally we'd validte sprint_id too, but session['sprint_id'] should match.
        if session.get('sprint_id') == sprint['id']:
            return jsonify({
                'valid': True,
                'sprint': sprint,
                'session_token': current_session_token,
                'history': history,
                'restored': True
            })

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

@chat_bp.route('/api/chat/validate-code/<code>', methods=['GET'])
def validate_access_code(code):
    """Validate access code and return team member info with sprint context"""
    # Get team member by access code
    member = db.get_team_member_by_code(code)
    
    if not member:
        return jsonify({'valid': False, 'error': 'Invalid access code'}), 404
    
    # Check if already submitted
    is_submitted = member.get('has_submitted', False)
    # We now allow them to proceed but in read-only mode if submitted

    
    # Get sprint info (nested in the query result)
    sprint = member.get('sprints')
    if not sprint:
        return jsonify({'valid': False, 'error': 'Sprint not found'}), 404
    
    if sprint.get('status') not in ['collecting', 'active']:
        return jsonify({
            'valid': False, 
            'error': 'This retrospective is no longer accepting responses'
        }), 403
    
    # Check for existing active session
    existing_session = db.get_active_session(sprint['id'], member['id'])
    
    if existing_session:
        session_token = existing_session['session_token']
        history = existing_session.get('conversation_history', [])
        
        session['session_token'] = session_token
        session['sprint_id'] = sprint['id']
        session['member_id'] = member['id']
        session['member_name'] = member['name']
        session['member_role'] = member.get('role', 'Team Member')
        
        # Get sprint context for AI (needed for response structure)
        sprint_context = db.get_sprint_with_context(sprint['id'])
        
        return jsonify({
            'valid': True,
            'member': {
                'id': member['id'],
                'name': member['name'],
                'role': member.get('role', 'Team Member'),
                'email': member.get('email'),
                'has_submitted': is_submitted
            },
            'sprint': {
                'id': sprint['id'],
                'name': sprint.get('name'),
                'start_date': sprint.get('start_date'),
                'end_date': sprint.get('end_date'),
                'goals': sprint_context.get('goals', []) if sprint_context else [],
                'outcomes': sprint_context.get('outcomes') if sprint_context else None,
                'project': sprint_context.get('project') if sprint_context else None
            },
            'session_token': session_token,
            'history': history,
            'restored': True,
            'submitted': is_submitted
        })

    # Create new session for this chat
    session_token = str(uuid.uuid4())
    session['session_token'] = session_token
    session['sprint_id'] = sprint['id']
    session['member_id'] = member['id']
    session['member_name'] = member['name']
    session['member_role'] = member.get('role', 'Team Member')
    
    # Create session in database
    db.create_session(sprint['id'], session_token, member_id=member['id'])
    
    # Get sprint context for AI
    sprint_context = db.get_sprint_with_context(sprint['id'])
    
    return jsonify({
        'valid': True,
        'member': {
            'id': member['id'],
            'name': member['name'],
            'role': member.get('role', 'Team Member'),
            'email': member.get('email'),
            'has_submitted': is_submitted
        },
        'sprint': {
            'id': sprint['id'],
            'name': sprint.get('name'),
            'start_date': sprint.get('start_date'),
            'end_date': sprint.get('end_date'),
            'goals': sprint_context.get('goals', []) if sprint_context else [],
            'outcomes': sprint_context.get('outcomes') if sprint_context else None,
            'project': sprint_context.get('project') if sprint_context else None
        },
        'session_token': session_token,
        'submitted': is_submitted
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
    
    # Get AI response with context
    try:
        # Build context for AI
        sprint_id = session.get('sprint_id')
        member_name = session.get('member_name', 'Team Member')
        member_role = session.get('member_role', 'Team Member')
        
        # Get sprint context if available
        context = None
        if sprint_id:
            context = db.get_sprint_with_context(sprint_id)
        
        # Get AI response with role awareness
        ai_response = chat_ai.conduct_interview(
            history, 
            user_message,
            member_name=member_name,
            member_role=member_role,
            sprint_context=context
        )
        
        # Parse question number from response [Q:N/8]
        import re
        question_match = re.search(r'\[Q:(\d)/8\]', ai_response)
        question_number = int(question_match.group(1)) if question_match else 0
        
        # Check for interview complete signal
        interview_complete = '[INTERVIEW_COMPLETE]' in ai_response
        
        # Also check for old ready_to_submit signal (backward compat)
        ready_to_submit = '[READY_TO_SUBMIT]' in ai_response or interview_complete
        
        # Clean the markers from the response shown to user
        clean_response = ai_response
        clean_response = re.sub(r'\s*\[Q:\d/8\]', '', clean_response)
        clean_response = clean_response.replace('[INTERVIEW_COMPLETE]', '').strip()
        clean_response = clean_response.replace('[READY_TO_SUBMIT]', '').strip()
        
        # Add AI response to history (with cleaned response)
        history.append({
            'role': 'ai',
            'content': clean_response,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Save updated history
        db.save_conversation_state(session_token, history)
        
        return jsonify({
            'success': True,
            'response': clean_response,
            'message_count': len(history),
            'question_number': question_number,
            'total_questions': 8,
            'interview_complete': interview_complete,
            'ready_to_submit': ready_to_submit
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
    member_id = session.get('member_id')
    
    if not session_token or not sprint_id:
        return jsonify({'error': 'No active session'}), 401
    
    # Use member name from session if available
    user_name = session.get('member_name') or data.get('name', '').strip() or 'Anonymous'
    is_anonymous = data.get('is_anonymous', False)
    
    # Get final conversation
    conversation = db.get_conversation_history(session_token)
    
    if len(conversation) == 0:
        return jsonify({'error': 'No conversation to submit'}), 400
    
    # Generate structured summary
    member_role = session.get('member_role', 'Team Member')
    summary_data = summary_ai.generate_conversation_summary(
        conversation_history=conversation,
        member_name=user_name,
        member_role=member_role
    )
    
    # Save response with summary
    try:
        response_id = db.save_response(
            sprint_id=sprint_id,
            user_name=user_name if not is_anonymous else 'Anonymous',
            is_anonymous=is_anonymous,
            conversation=conversation,
            session_token=session_token,
            summary_data=summary_data
        )
        
        # Mark team member as submitted
        if member_id:
            db.mark_member_submitted_by_id(member_id)
        elif not is_anonymous:
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

@chat_bp.route('/api/chat/current-session', methods=['GET'])
def get_current_session():
    """Retrieve current session info from cookie if active"""
    session_token = session.get('session_token')
    sprint_id = session.get('sprint_id')
    
    print(f"DEBUG: get_current_session - Token: {session_token}, Sprint: {sprint_id}")
    print(f"DEBUG: Session keys: {list(session.keys())}")

    if not session_token or not sprint_id:
        return jsonify({'active': False}), 200
        
    # Verify session still exists in DB
    history = db.get_conversation_history(session_token)
    
    # Get sprint context
    sprint_context = db.get_sprint_with_context(sprint_id)
    if not sprint_context:
        print("DEBUG: Sprint context not found")
        return jsonify({'active': False}), 200
        
    # Get member details
    member_id = session.get('member_id')
    members = db.get_team_members(sprint_id)
    member = next((m for m in members if m.get('id') == member_id), None)
    
    # Fallback to session data if member not found (shouldn't happen)
    if not member:
        member = {
            'id': session.get('member_id'),
            'name': session.get('member_name'),
            'role': session.get('member_role'),
            'email': session.get('email')
        }

    return jsonify({
        'active': True,
        'session_token': session_token,
        'history': history,
        'sprint': {
            'id': sprint_context['id'],
            'name': sprint_context.get('name'),
            'start_date': sprint_context.get('start_date'),
            'end_date': sprint_context.get('end_date'),
            'goals': sprint_context.get('goals', []),
            'outcomes': sprint_context.get('outcomes'),
            'project': sprint_context.get('project')
        },
        'member': member
    })

