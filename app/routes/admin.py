from flask import Blueprint, request, jsonify, session, render_template
from app.services.database_service import DatabaseService
from functools import wraps
import bcrypt
import os

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
db = DatabaseService()

def require_admin(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/login', methods=['POST'])
def login():
    """Admin login"""
    data = request.json
    password = data.get('password', '')
    
    # Simple password check (in production, use bcrypt)
    admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
    
    if password == admin_password:
        session['is_admin'] = True
        session['admin_name'] = 'Admin'
        return jsonify({'success': True, 'redirect': '/admin/dashboard'})
    else:
        return jsonify({'error': 'Invalid password'}), 401

@admin_bp.route('/logout', methods=['POST'])
def logout():
    """Admin logout"""
    session.clear()
    return jsonify({'success': True})

@admin_bp.route('/dashboard', methods=['GET'])
@require_admin
def dashboard():
    """Admin dashboard data"""
    sprints = db.get_all_sprints()
    return jsonify({'sprints': sprints})
