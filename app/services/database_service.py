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
    
    def mark_member_submitted(self, sprint_id: str, user_name: str) -> None:
        """Mark a team member as having submitted"""
        self.client.table('team_members').update({
            'has_submitted': True,
            'submitted_at': datetime.utcnow().isoformat()
        }).eq('sprint_id', sprint_id).eq('name', user_name).execute()
    
    # =====================================================
    # Conversation Session Operations
    # =====================================================
    
    def create_session(self, sprint_id: str, session_token: str) -> Dict:
        """Create a new conversation session"""
        data = {
            'sprint_id': sprint_id,
            'session_token': session_token,
            'conversation_history': []
        }
        response = self.client.table('conversation_sessions').insert(data).execute()
        return response.data[0] if response.data else None
    
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
                     conversation: List[Dict], session_token: str) -> str:
        """Save a completed retrospective response"""
        data = {
            'sprint_id': sprint_id,
            'user_name': user_name if not is_anonymous else 'Anonymous',
            'is_anonymous': is_anonymous,
            'conversation': conversation,
            'session_token': session_token
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
