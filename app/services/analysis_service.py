from time import time
from typing import List, Dict
from app.services.gemini_service import GeminiService
from app.services.database_service import DatabaseService

class AnalysisService:
    """Service for analyzing sprint retrospective responses"""
    
    def __init__(self):
        self.ai = GeminiService()
        self.db = DatabaseService()
    
    def analyze_sprint(self, sprint_id: str) -> Dict:
        """
        Main analysis orchestrator.
        Uses Map-Reduce pattern for scalability.
        """
        start_time = time()
        
        # Step 1: Get all responses
        responses = self.db.get_sprint_responses(sprint_id)
        
        if len(responses) == 0:
            return {'error': 'No responses to analyze'}
        
        print(f"Analyzing {len(responses)} responses...")
        
        # Step 2: Extract themes directly from responses
        themes_data = self.ai._extract_themes(responses)
        themes = themes_data.get('themes', [])
        
        print(f"Found {len(themes)} themes")
        
        # Step 3: Generate recommendations based on themes
        recommendations_data = self.ai._generate_recommendations(themes)
        recommendations = recommendations_data.get('recommendations', [])
        
        print(f"Generated {len(recommendations)} recommendation groups")
        
        # Step 4: Analyze sentiment
        sentiment = self.ai._analyze_sentiment(responses)
        
        print(f"Overall mood: {sentiment.get('overall_mood')}")
        
        # Step 5: Save report
        duration = int(time() - start_time)
        report = {
            'sprint_id': sprint_id,
            'themes': themes,
            'recommendations': recommendations,
            'sentiment_summary': sentiment,
            'analysis_duration_seconds': duration
        }
        
        self.db.save_analysis_report(sprint_id, report)
        
        # Update sprint status
        self.db.update_sprint_status(sprint_id, 'analyzed')
        
        print(f"Analysis complete in {duration} seconds")
        
        return report
    
    def compare_sprints(self, current_sprint_id: str, previous_sprint_id: str) -> Dict:
        """Compare two sprint reports to identify trends"""
        
        current_report = self.db.get_analysis_report(current_sprint_id)
        previous_report = self.db.get_analysis_report(previous_sprint_id)
        
        if not current_report or not previous_report:
            return {'error': 'One or both reports not found'}
        
        current_themes = {t['name']: t for t in current_report.get('themes', [])}
        previous_themes = {t['name']: t for t in previous_report.get('themes', [])}
        
        # Find improvements (issues that disappeared)
        resolved_issues = []
        for prev_name, prev_theme in previous_themes.items():
            if prev_name not in current_themes and prev_theme['category'] != 'Success':
                resolved_issues.append({
                    'name': prev_name,
                    'was_mentioned_by': prev_theme.get('percentage', 0)
                })
        
        # Find regressions (new issues)
        new_issues = []
        for curr_name, curr_theme in current_themes.items():
            if curr_name not in previous_themes and curr_theme['category'] != 'Success':
                new_issues.append(curr_theme)
        
        # Find persistent issues
        persistent_issues = []
        for name in set(current_themes.keys()) & set(previous_themes.keys()):
            curr = current_themes[name]
            prev = previous_themes[name]
            
            if curr['category'] != 'Success':
                curr_pct = curr.get('percentage', 0)
                prev_pct = prev.get('percentage', 0)
                trend = 'worse' if curr_pct > prev_pct else 'better'
                persistent_issues.append({
                    'name': name,
                    'trend': trend,
                    'previous_percentage': prev_pct,
                    'current_percentage': curr_pct
                })
        
        comparison = {
            'current_sprint_id': current_sprint_id,
            'previous_sprint_id': previous_sprint_id,
            'improvement_areas': resolved_issues,
            'regression_areas': new_issues,
            'persistent_issues': persistent_issues,
            'overall_trend': 'improving' if len(resolved_issues) > len(new_issues) else 'needs_attention'
        }
        
        self.db.save_sprint_comparison(comparison)
        return comparison
