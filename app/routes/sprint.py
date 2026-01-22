from flask import Blueprint, request, jsonify, render_template, session
from app.services.database_service import DatabaseService
from app.routes.admin import require_admin
import uuid

sprint_bp = Blueprint('sprint', __name__, url_prefix='/api/sprint')
db = DatabaseService()

@sprint_bp.route('/my-sprints', methods=['GET'])
def get_my_sprints():
    """Get sprints for logged-in member"""
    email = session.get('email')
    
    if not email:
        return jsonify({'error': 'Unauthorized'}), 401
    
    sprints = db.get_member_sprints(email)
    
    # Enrich with status info (e.g., has user submitted?)
    # For now just return sprints
    return jsonify({'sprints': sprints})

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
        'created_by': session.get('admin_name', 'Admin'),
        'project_id': data.get('project_id')  # Optional project association
    }
    
    # Create sprint
    sprint = db.create_sprint(sprint_data)
    
    # Add team members with enhanced details (name, role, email, access_code)
    team_members = data.get('team_members', [])
    created_members = []
    for member in team_members:
        if member.get('email'):
            # Use enhanced method with email and auto-generated code
            created = db.add_team_member_with_details(
                sprint_id, 
                member.get('name'), 
                member.get('role', 'Developer'),
                member.get('email')
            )
        else:
            # Fallback to basic method
            created = db.add_team_member(sprint_id, member.get('name'), member.get('role'))
        if created:
            created_members.append(created)
    
    # Add sprint goals if provided
    goals = data.get('goals', [])
    for idx, goal in enumerate(goals):
        if isinstance(goal, str) and goal.strip():
            db.add_sprint_goal(sprint_id, goal.strip(), idx)
        elif isinstance(goal, dict) and goal.get('text'):
            db.add_sprint_goal(sprint_id, goal['text'].strip(), idx)
    
    # Generate share URL
    share_url = f"{request.url_root}chat/{share_token}"
    
    return jsonify({
        'success': True,
        'sprint_id': sprint_id,
        'share_url': share_url,
        'share_token': share_token,
        'team_members': created_members
    })

@sprint_bp.route('/<sprint_id>', methods=['GET'])
@require_admin
def get_sprint(sprint_id):
    """Get sprint details with goals and outcomes"""
    sprint = db.get_sprint_with_context(sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404
    
    # Also get team members
    sprint['team_members'] = db.get_team_members(sprint_id)
    
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

# =====================================================
# Sprint Goals Endpoints
# =====================================================

@sprint_bp.route('/<sprint_id>/goals', methods=['GET'])
@require_admin
def get_sprint_goals(sprint_id):
    """Get all goals for a sprint"""
    goals = db.get_sprint_goals(sprint_id)
    return jsonify({'goals': goals})

@sprint_bp.route('/<sprint_id>/goals', methods=['POST'])
@require_admin
def add_sprint_goals(sprint_id):
    """Add or update goals for a sprint"""
    data = request.json
    goals = data.get('goals', [])
    
    # Clear existing goals and add new ones
    db.delete_sprint_goals(sprint_id)
    
    created_goals = []
    for idx, goal in enumerate(goals):
        if isinstance(goal, str) and goal.strip():
            created = db.add_sprint_goal(sprint_id, goal.strip(), idx)
            created_goals.append(created)
        elif isinstance(goal, dict) and goal.get('text'):
            created = db.add_sprint_goal(sprint_id, goal['text'].strip(), idx)
            created_goals.append(created)
    
    return jsonify({
        'success': True,
        'goals': created_goals
    })

# =====================================================
# Sprint Outcomes Endpoints
# =====================================================

@sprint_bp.route('/<sprint_id>/outcomes', methods=['GET'])
@require_admin
def get_sprint_outcomes(sprint_id):
    """Get outcomes for a sprint"""
    outcomes = db.get_sprint_outcomes(sprint_id)
    return jsonify({'outcomes': outcomes})

@sprint_bp.route('/<sprint_id>/outcomes', methods=['POST'])
@require_admin
def save_sprint_outcomes(sprint_id):
    """Save or update sprint outcomes (progress, what went right/wrong)"""
    data = request.json
    
    outcomes = db.save_sprint_outcomes(
        sprint_id,
        data.get('progress_summary', ''),
        data.get('what_went_well', ''),
        data.get('what_went_wrong', '')
    )
    
    return jsonify({
        'success': True,
        'outcomes': outcomes
    })

# =====================================================
# Team Member & Invite Endpoints
# =====================================================

@sprint_bp.route('/<sprint_id>/members', methods=['GET'])
@require_admin
def get_team_members(sprint_id):
    """Get all team members with their access codes"""
    members = db.get_team_members(sprint_id)
    return jsonify({'members': members})

@sprint_bp.route('/<sprint_id>/members', methods=['POST'])
@require_admin
def add_team_member(sprint_id):
    """Add a new team member to a sprint"""
    data = request.json
    
    member = db.add_team_member_with_details(
        sprint_id,
        data.get('name'),
        data.get('role', 'Developer'),
        data.get('email')
    )
    
    if not member:
        return jsonify({'error': 'Failed to add team member'}), 500
    
    return jsonify({
        'success': True,
        'member': member
    })

@sprint_bp.route('/<sprint_id>/generate-codes', methods=['POST'])
@require_admin
def generate_invite_codes(sprint_id):
    """Generate access codes for team members who don't have them"""
    import secrets
    
    members = db.get_team_members(sprint_id)
    updated_members = []
    
    for member in members:
        if not member.get('access_code'):
            # Generate new code
            chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            code = ''.join(secrets.choice(chars) for _ in range(8))
            
            # Update member with code
            db.client.table('team_members').update({
                'access_code': code
            }).eq('id', member['id']).execute()
            
            member['access_code'] = code
        
        updated_members.append(member)
    
    return jsonify({
        'success': True,
        'members': updated_members
    })

@sprint_bp.route('/<sprint_id>/invite-links', methods=['GET'])
@require_admin
def get_invite_links(sprint_id):
    """Get invite links for all team members"""
    members = db.get_team_members(sprint_id)
    sprint = db.get_sprint(sprint_id)
    
    base_url = request.url_root.rstrip('/')
    
    # Try to get frontend URL from Referer header (for Vite proxy setup)
    referer = request.headers.get('Referer', '')
    if referer:
        # Extract origin from referer (e.g., http://localhost:5173/admin/dashboard -> http://localhost:5173)
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    invite_links = []
    for member in members:
        if member.get('access_code'):
            invite_links.append({
                'name': member['name'],
                'email': member.get('email'),
                'role': member.get('role'),
                'access_code': member['access_code'],
                'link': f"{base_url}/retro/{member['access_code']}",
                'has_submitted': member.get('has_submitted', False)
            })
    
    return jsonify({
        'sprint_name': sprint.get('name') if sprint else '',
        'invite_links': invite_links
    })

