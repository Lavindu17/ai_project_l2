from flask import Blueprint, request, jsonify, render_template, session
from app.services.database_service import DatabaseService
from app.routes.admin import require_admin
import uuid

sprint_bp = Blueprint('sprint', __name__, url_prefix='/api/sprint')
db = DatabaseService()

@sprint_bp.route('/create', methods=['POST'])
@require_admin
def create_sprint():
    """Create a new sprint and generate share token"""
    data = request.json
    
    # Generate unique IDs and token
    sprint_id = str(uuid.uuid4())
    share_token = str(uuid.uuid4())[:8]  # Short token
    
    sprint_data = {
        'id': sprint_id,
        'name': data['name'],
        'start_date': data['start_date'],
        'end_date': data['end_date'],
        'share_token': share_token,
        'status': 'collecting',
        'created_by': session.get('admin_name', 'Admin')
    }
    
    # Create sprint
    sprint = db.create_sprint(sprint_data)
    
    # Add team members if provided
    team_members = data.get('team_members', [])
    for member in team_members:
        db.add_team_member(sprint_id, member.get('name'), member.get('role'))
    
    # Generate share URL
    share_url = f"{request.url_root}chat/{share_token}"
    
    return jsonify({
        'success': True,
        'sprint_id': sprint_id,
        'share_url': share_url,
        'share_token': share_token
    })

@sprint_bp.route('/<sprint_id>', methods=['GET'])
@require_admin
def get_sprint(sprint_id):
    """Get sprint details"""
    sprint = db.get_sprint(sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404
    
    return jsonify(sprint)

@sprint_bp.route('/<sprint_id>/status', methods=['GET'])
@require_admin
def sprint_status(sprint_id):
    """Get real-time submission status"""
    members = db.get_team_members(sprint_id)
    responses = db.get_sprint_responses(sprint_id)
    
    total = len(members)
    submitted = sum(1 for m in members if m.get('has_submitted', False))
    
    return jsonify({
        'total': total,
        'submitted': submitted,
        'pending': total - submitted,
        'percentage': round((submitted / total * 100), 1) if total > 0 else 0,
        'members': members,
        'response_count': len(responses)
    })

@sprint_bp.route('/<sprint_id>/close', methods=['PATCH'])
@require_admin
def close_sprint(sprint_id):
    """Close a sprint (stop accepting responses)"""
    db.update_sprint_status(sprint_id, 'closed')
    return jsonify({'success': True, 'message': 'Sprint closed'})

@sprint_bp.route('/list', methods=['GET'])
@require_admin
def list_sprints():
    """List all sprints"""
    sprints = db.get_all_sprints()
    return jsonify({'sprints': sprints})
