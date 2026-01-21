from flask import Blueprint, request, jsonify, render_template
from app.services.analysis_service import AnalysisService
from app.services.database_service import DatabaseService
from app.routes.admin import require_admin

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api')
analysis_service = AnalysisService()
db = DatabaseService()

@analysis_bp.route('/sprint/<sprint_id>/analyze', methods=['POST'])
@require_admin
def analyze_sprint(sprint_id):
    """Trigger AI analysis for a sprint"""
    # Check if sprint exists
    sprint = db.get_sprint(sprint_id)
    if not sprint:
        return jsonify({'error': 'Sprint not found'}), 404
    
    # Check if there are responses
    responses = db.get_sprint_responses(sprint_id)
    if len(responses) == 0:
        return jsonify({'error': 'No responses to analyze'}), 400
    
    # Update status to analyzing
    db.update_sprint_status(sprint_id, 'analyzing')
    
    try:
        # Run analysis
        report = analysis_service.analyze_sprint(sprint_id)
        
        if 'error' in report:
            return jsonify(report), 400
        
        return jsonify({
            'success': True,
            'message': f'Analysis complete in {report["analysis_duration_seconds"]} seconds',
            'report_id': sprint_id,
            'themes_count': len(report.get('themes', [])),
            'recommendations_count': len(report.get('recommendations', []))
        })
    
    except Exception as e:
        print(f"Analysis error: {e}")
        # Revert status
        db.update_sprint_status(sprint_id, 'collecting')
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@analysis_bp.route('/sprint/<sprint_id>/report', methods=['GET'])
@require_admin
def get_report(sprint_id):
    """Get analysis report for a sprint"""
    report = db.get_analysis_report(sprint_id)
    
    if not report:
        return jsonify({'error': 'Report not found. Run analysis first.'}), 404
    
    return jsonify(report)



@analysis_bp.route('/sprint/<sprint_id>/report/export', methods=['GET'])
@require_admin
def export_report(sprint_id):
    """Export report as JSON"""
    report = db.get_analysis_report(sprint_id)
    
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    response = jsonify(report)
    response.headers['Content-Disposition'] = f'attachment; filename=sprint_{sprint_id}_report.json'
    return response

@analysis_bp.route('/sprint/<current_id>/compare/<previous_id>', methods=['POST'])
@require_admin
def compare_sprints(current_id, previous_id):
    """Compare current sprint with previous sprint"""
    try:
        comparison = analysis_service.compare_sprints(current_id, previous_id)
        
        if 'error' in comparison:
            return jsonify(comparison), 400
        
        return jsonify({
            'success': True,
            'comparison': comparison
        })
    
    except Exception as e:
        print(f"Comparison error: {e}")
        return jsonify({'error': f'Comparison failed: {str(e)}'}), 500

@analysis_bp.route('/action-items', methods=['POST'])
@require_admin
def create_action_item():
    """Create an action item"""
    data = request.json
    
    action_id = db.create_action_item(data)
    
    return jsonify({
        'success': True,
        'action_id': action_id
    })

@analysis_bp.route('/action-items/<item_id>', methods=['PATCH'])
@require_admin
def update_action_item(item_id):
    """Update action item status"""
    data = request.json
    status = data.get('status')
    
    if status not in ['pending', 'in_progress', 'done', 'cancelled']:
        return jsonify({'error': 'Invalid status'}), 400
    
    db.update_action_item_status(item_id, status)
    
    return jsonify({'success': True})

@analysis_bp.route('/sprint/<sprint_id>/action-items', methods=['GET'])
@require_admin
def get_action_items(sprint_id):
    """Get all action items for a sprint"""
    items = db.get_action_items(sprint_id)
    return jsonify({'action_items': items})
