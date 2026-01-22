from flask import Blueprint, request, jsonify, session
from app.services.database_service import DatabaseService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
db = DatabaseService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle login sync from frontend Supabase Auth"""
    data = request.json
    access_token = data.get('access_token')
    user = data.get('user')
    
    if not access_token or not user:
        return jsonify({'error': 'Missing credentials'}), 400
        
    # Note: In production, verify the JWT access_token signature using Supabase secret
    
    # Store user info in server-side session
    session['user_id'] = user['id']
    session['email'] = user['email']
    # role is in user_metadata
    session['role'] = user.get('user_metadata', {}).get('role', 'member')
    session['full_name'] = user.get('user_metadata', {}).get('full_name', 'User')
    
    # Backward compatibility for existing Admin Dashboard checks
    if session['role'] == 'leader':
        session['is_admin'] = True
        session['admin_name'] = session['full_name']
    
    return jsonify({
        'success': True, 
        'role': session['role'],
        'user': {
            'id': session['user_id'],
            'email': session['email'],
            'name': session['full_name']
        }
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Clear server session"""
    session.clear()
    return jsonify({'success': True})
