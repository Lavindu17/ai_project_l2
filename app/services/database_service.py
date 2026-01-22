from supabase import create_client, Client
from typing import List, Dict, Optional
import os
from datetime import datetime

class DatabaseService:
    """Service for all database operations using Supabase"""
    
    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        # Use service role key for admin operations (bypasses RLS)
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.client: Client = create_client(url, key)
    
    # =====================================================
    # Sprint Operations
    # =====================================================
    
    def create_sprint(self, sprint_data: Dict) -> Dict:
        """Create a new sprint"""
        response = self.client.table('sprints').insert(sprint_data).execute()
        return response.data[0] if response.data else None
    
    def get_sprint(self, sprint_id: str) -> Optional[Dict]:
        """Get sprint by ID"""
        response = self.client.table('sprints').select('*').eq('id', sprint_id).execute()
        return response.data[0] if response.data else None
    
    def get_sprint_by_token(self, token: str) -> Optional[Dict]:
        """Get sprint by share token"""
        response = self.client.table('sprints').select('*').eq('share_token', token).execute()
        return response.data[0] if response.data else None
    
    def get_all_sprints(self) -> List[Dict]:
        """Get all sprints ordered by creation date"""
        response = self.client.table('sprints').select('*').order('created_at', desc=True).execute()
        return response.data if response.data else []
    
    def update_sprint_status(self, sprint_id: str, status: str) -> Dict:
        """Update sprint status"""
        response = self.client.table('sprints').update({'status': status}).eq('id', sprint_id).execute()
        return response.data[0] if response.data else None
    
    # =====================================================
    # Team Member Operations
    # =====================================================
    
    def add_team_member(self, sprint_id: str, name: str, role: str = None) -> Dict:
        """Add a team member to a sprint"""
        data = {
            'sprint_id': sprint_id,
            'name': name,
            'role': role
        }
        response = self.client.table('team_members').insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_team_members(self, sprint_id: str) -> List[Dict]:
        """Get all team members for a sprint"""
        response = self.client.table('team_members').select('*').eq('sprint_id', sprint_id).execute()
        return response.data if response.data else []
    
    def get_member_sprints(self, email: str) -> List[Dict]:
        """Get all sprints a member is assigned to"""
        # Join team_members with sprints
        response = self.client.table('team_members').select('sprint:sprints(*)').eq('email', email).execute()
        
        sprints = []
        if response.data:
            for item in response.data:
                if item.get('sprint'):
                    sprints.append(item['sprint'])
        
        # Sort by start_date desc
        sprints.sort(key=lambda x: x.get('start_date', ''), reverse=True)
        return sprints
    
    def mark_member_submitted(self, sprint_id: str, user_name: str) -> None:
        """Mark a team member as having submitted"""
        self.client.table('team_members').update({
            'has_submitted': True,
            'submitted_at': datetime.utcnow().isoformat()
        }).eq('sprint_id', sprint_id).eq('name', user_name).execute()
    
    # =====================================================
    # Conversation Session Operations
    # =====================================================
    
    def create_session(self, sprint_id: str, session_token: str, member_id: str = None) -> Dict:
        """Create a new conversation session"""
        data = {
            'sprint_id': sprint_id,
            'session_token': session_token,
            'conversation_history': [],
            'team_member_id': member_id
        }
        response = self.client.table('conversation_sessions').insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_active_session(self, sprint_id: str, member_id: str) -> Optional[Dict]:
        """Get an existing active session for a team member"""
        # Find session for this member and sprint
        # We order by created_at desc to get the most recent one
        response = self.client.table('conversation_sessions')\
            .select('*')\
            .eq('sprint_id', sprint_id)\
            .eq('team_member_id', member_id)\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
            
        if response.data:
            return response.data[0]
        return None

    def get_conversation_history(self, session_token: str) -> List[Dict]:
        """Get conversation history for a session"""
        response = self.client.table('conversation_sessions').select('conversation_history').eq('session_token', session_token).execute()
        if response.data and len(response.data) > 0:
            return response.data[0].get('conversation_history', [])
        return []
    
    def save_conversation_state(self, session_token: str, conversation: List[Dict]) -> None:
        """Update conversation history for a session"""
        self.client.table('conversation_sessions').update({
            'conversation_history': conversation
        }).eq('session_token', session_token).execute()
    
    # =====================================================
    # Response Operations
    # =====================================================
    
    def save_response(self, sprint_id: str, user_name: str, is_anonymous: bool, 
                     conversation: List[Dict], session_token: str, summary_data: Dict = None) -> str:
        """Save a completed retrospective response"""
        data = {
            'sprint_id': sprint_id,
            'user_name': user_name if not is_anonymous else 'Anonymous',
            'is_anonymous': is_anonymous,
            'conversation': conversation,
            'session_token': session_token,
            'summary_data': summary_data
        }
        response = self.client.table('responses').insert(data).execute()
        return response.data[0]['id'] if response.data else None
    
    def get_sprint_responses(self, sprint_id: str) -> List[Dict]:
        """Get all responses for a sprint"""
        response = self.client.table('responses').select('*').eq('sprint_id', sprint_id).execute()
        return response.data if response.data else []
    
    # =====================================================
    # Analysis Report Operations
    # =====================================================
    
    def save_analysis_report(self, sprint_id: str, report_data: Dict) -> str:
        """Save analysis report"""
        data = {
            'sprint_id': sprint_id,
            'themes': report_data.get('themes', []),
            'recommendations': report_data.get('recommendations', []),
            'sentiment_summary': report_data.get('sentiment_summary', {}),
            'analysis_duration_seconds': report_data.get('analysis_duration_seconds', 0)
        }
        response = self.client.table('analysis_reports').insert(data).execute()
        return response.data[0]['id'] if response.data else None
    
    def get_analysis_report(self, sprint_id: str) -> Optional[Dict]:
        """Get analysis report for a sprint"""
        response = self.client.table('analysis_reports').select('*').eq('sprint_id', sprint_id).execute()
        return response.data[0] if response.data else None
    
    # =====================================================
    # Action Item Operations
    # =====================================================
    
    def create_action_item(self, action_data: Dict) -> str:
        """Create an action item"""
        response = self.client.table('action_items').insert(action_data).execute()
        return response.data[0]['id'] if response.data else None
    
    def update_action_item_status(self, item_id: str, status: str) -> None:
        """Update action item status"""
        update_data = {'status': status}
        if status == 'done':
            update_data['completed_at'] = datetime.utcnow().isoformat()
        self.client.table('action_items').update(update_data).eq('id', item_id).execute()
    
    def get_action_items(self, sprint_id: str) -> List[Dict]:
        """Get all action items for a sprint"""
        response = self.client.table('action_items').select('*').eq('sprint_id', sprint_id).execute()
        return response.data if response.data else []
    
    # =====================================================
    # Project Operations
    # =====================================================
    
    def create_project(self, project_data: Dict) -> Dict:
        """Create a new project"""
        response = self.client.table('projects').insert(project_data).execute()
        return response.data[0] if response.data else None
    
    def get_project(self, project_id: str) -> Optional[Dict]:
        """Get project by ID"""
        response = self.client.table('projects').select('*').eq('id', project_id).execute()
        return response.data[0] if response.data else None
    
    def get_all_projects(self) -> List[Dict]:
        """Get all projects ordered by creation date"""
        response = self.client.table('projects').select('*').order('created_at', desc=True).execute()
        return response.data if response.data else []
    
    def update_project(self, project_id: str, updates: Dict) -> Dict:
        """Update project details"""
        response = self.client.table('projects').update(updates).eq('id', project_id).execute()
        return response.data[0] if response.data else None
    
    def get_project_team_members(self, project_id: str) -> List[Dict]:
        """Get all team members from sprints associated with a project"""
        # First get all sprints for the project
        sprints = self.client.table('sprints').select('id').eq('project_id', project_id).execute()
        if not sprints.data:
            return []
        
        sprint_ids = [s['id'] for s in sprints.data]
        # Get unique team members from those sprints
        members = self.client.table('team_members').select('name, role, email').in_('sprint_id', sprint_ids).execute()
        return members.data if members.data else []
    
    # =====================================================
    # Enhanced Team Member Operations
    # =====================================================
    
    def add_team_member_with_details(self, sprint_id: str, name: str, role: str, 
                                      email: str = None, access_code: str = None) -> Dict:
        """Add a team member with full details including email and access code"""
        import secrets
        import string
        
        # Generate access code if not provided
        if not access_code:
            # Generate 8-character alphanumeric code (excluding confusing characters)
            chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            access_code = ''.join(secrets.choice(chars) for _ in range(8))
        
        data = {
            'sprint_id': sprint_id,
            'name': name,
            'role': role,
            'email': email,
            'access_code': access_code
        }
        response = self.client.table('team_members').insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_team_member_by_code(self, access_code: str) -> Optional[Dict]:
        """Get team member by their unique access code"""
        response = self.client.table('team_members').select('*, sprints(*)').eq('access_code', access_code).execute()
        return response.data[0] if response.data else None
    
    def get_team_member_by_id(self, member_id: str) -> Optional[Dict]:
        """Get team member by ID"""
        response = self.client.table('team_members').select('*').eq('id', member_id).execute()
        return response.data[0] if response.data else None
    
    def update_team_member_invite_sent(self, member_id: str) -> None:
        """Mark that invite was sent to a team member"""
        self.client.table('team_members').update({
            'invite_sent_at': datetime.utcnow().isoformat()
        }).eq('id', member_id).execute()
    
    def mark_member_submitted_by_id(self, member_id: str) -> None:
        """Mark a team member as having submitted by their ID"""
        self.client.table('team_members').update({
            'has_submitted': True,
            'submitted_at': datetime.utcnow().isoformat()
        }).eq('id', member_id).execute()
    
    # =====================================================
    # Sprint Goals Operations
    # =====================================================
    
    def add_sprint_goal(self, sprint_id: str, goal_text: str, display_order: int = 0) -> Dict:
        """Add a goal to a sprint"""
        data = {
            'sprint_id': sprint_id,
            'goal_text': goal_text,
            'display_order': display_order
        }
        response = self.client.table('sprint_goals').insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_sprint_goals(self, sprint_id: str) -> List[Dict]:
        """Get all goals for a sprint ordered by display order"""
        response = self.client.table('sprint_goals').select('*').eq('sprint_id', sprint_id).order('display_order').execute()
        return response.data if response.data else []
    
    def delete_sprint_goals(self, sprint_id: str) -> None:
        """Delete all goals for a sprint"""
        self.client.table('sprint_goals').delete().eq('sprint_id', sprint_id).execute()
    
    # =====================================================
    # Sprint Outcomes Operations
    # =====================================================
    
    def save_sprint_outcomes(self, sprint_id: str, progress_summary: str, 
                             what_went_well: str, what_went_wrong: str) -> Dict:
        """Save or update sprint outcomes (progress, what went right/wrong)"""
        data = {
            'sprint_id': sprint_id,
            'progress_summary': progress_summary,
            'what_went_well': what_went_well,
            'what_went_wrong': what_went_wrong
        }
        # Try to upsert (insert or update)
        response = self.client.table('sprint_outcomes').upsert(data, on_conflict='sprint_id').execute()
        return response.data[0] if response.data else None
    
    def get_sprint_outcomes(self, sprint_id: str) -> Optional[Dict]:
        """Get outcomes for a sprint"""
        response = self.client.table('sprint_outcomes').select('*').eq('sprint_id', sprint_id).execute()
        return response.data[0] if response.data else None
    
    # =====================================================
    # Sprint with Related Data Operations
    # =====================================================
    
    def get_sprint_with_context(self, sprint_id: str) -> Optional[Dict]:
        """Get sprint with project, goals, and outcomes for AI context"""
        sprint = self.get_sprint(sprint_id)
        if not sprint:
            return None
        
        # Get related data
        sprint['goals'] = self.get_sprint_goals(sprint_id)
        sprint['outcomes'] = self.get_sprint_outcomes(sprint_id)
        
        # Get project if exists
        if sprint.get('project_id'):
            sprint['project'] = self.get_project(sprint['project_id'])
        
        return sprint
    
    # =====================================================
    # Sprint Comparison Operations
    # =====================================================
    
    def save_sprint_comparison(self, comparison_data: Dict) -> str:
        """Save sprint comparison"""
        response = self.client.table('sprint_comparisons').insert(comparison_data).execute()
        return response.data[0]['id'] if response.data else None
    
    def get_sprint_comparison(self, current_sprint_id: str, previous_sprint_id: str) -> Optional[Dict]:
        """Get comparison between two sprints"""
        response = self.client.table('sprint_comparisons').select('*').eq('current_sprint_id', current_sprint_id).eq('previous_sprint_id', previous_sprint_id).execute()
        return response.data[0] if response.data else None
