from flask import Blueprint, request, jsonify, session
from app.services.database_service import DatabaseService
from app.routes.admin import require_admin
import uuid

project_bp = Blueprint('project', __name__, url_prefix='/api/project')
db = DatabaseService()

# Predefined roles for dropdown
TEAM_ROLES = [
    'Developer',
    'Senior Developer',
    'Tech Lead',
    'Designer',
    'UI/UX Designer',
    'QA Engineer',
    'QA Lead',
    'Product Manager',
    'Product Owner',
    'Scrum Master',
    'DevOps Engineer',
    'Data Analyst',
    'Business Analyst'
]

@project_bp.route('/roles', methods=['GET'])
def get_roles():
    """Get list of predefined roles"""
    return jsonify({'roles': TEAM_ROLES})

@project_bp.route('/create', methods=['POST'])
@require_admin
def create_project():
    """Create a new project with optional team members"""
    data = request.json
    
    project_id = str(uuid.uuid4())
    
    project_data = {
        'id': project_id,
        'name': data['name'],
        'description': data.get('description', ''),
        'created_by': session.get('user_id') # Store User ID for ownership
    }
    
    # Create project
    project = db.create_project(project_data)
    
    return jsonify({
        'success': True,
        'project_id': project_id,
        'project': project
    })

@project_bp.route('/<project_id>', methods=['GET'])
@require_admin
def get_project(project_id):
    """Get project details"""
    project = db.get_project(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Check ownership
    if project.get('created_by') != session.get('user_id'):
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(project)

@project_bp.route('/list', methods=['GET'])
@require_admin
def list_projects():
    """List projects created by current user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'projects': []})
        
    projects = db.get_projects_by_creator(user_id)
    return jsonify({'projects': projects})

@project_bp.route('/<project_id>', methods=['PUT'])
@require_admin
def update_project(project_id):
    """Update project details"""
    data = request.json
    
    updates = {}
    if 'name' in data:
        updates['name'] = data['name']
    if 'description' in data:
        updates['description'] = data['description']
    
    if not updates:
        return jsonify({'error': 'No updates provided'}), 400
    
    # Check existence and ownership first
    existing = db.get_project(project_id)
    if not existing:
         return jsonify({'error': 'Project not found'}), 404
         
    if existing.get('created_by') != session.get('user_id'):
        return jsonify({'error': 'Unauthorized'}), 403
    
    project = db.update_project(project_id, updates)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    return jsonify({
        'success': True,
        'project': project
    })

@project_bp.route('/<project_id>/sprints', methods=['GET'])
@require_admin
def get_project_sprints(project_id):
    """Get all sprints associated with a project"""
    # Check ownership
    project = db.get_project(project_id)
    if not project:
         return jsonify({'error': 'Project not found'}), 404
         
    if project.get('created_by') != session.get('user_id'):
        return jsonify({'error': 'Unauthorized'}), 403
        
    sprints = db.get_sprints_by_project(project_id)
    return jsonify({'sprints': sprints})



@project_bp.route('/<project_id>/team', methods=['GET'])
@require_admin
def get_project_team(project_id):
    """Get all team members associated with a project"""
    # Check ownership
    project = db.get_project(project_id)
    if not project:
         return jsonify({'error': 'Project not found'}), 404
         
    if project.get('created_by') != session.get('user_id'):
        return jsonify({'error': 'Unauthorized'}), 403
        
    members = db.get_project_team_members(project_id)
    return jsonify({'members': members})
