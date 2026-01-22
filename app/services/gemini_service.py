import google.generativeai as genai
import json
import re
import os
from typing import List, Dict
import google.api_core.exceptions
import time

class GeminiService:
    """Service for all Gemini AI operations"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-3-flash-preview')
        self.generation_config = {
            "response_mime_type": "application/json",
            "temperature": 0.7,
        }
    


    def conduct_interview(self, conversation_history: List[Dict], user_message: str,
                          member_name: str = "Team Member", member_role: str = "Team Member",
                          sprint_context: Dict = None) -> str:
        """
        Continue the retrospective interview conversation.
        Returns the AI's response as a string.
        """
        # Load interviewer prompt template
        system_prompt = self._load_prompt('interviewer.txt')
        
        # Build sprint context section
        sprint_info = self._build_sprint_context(sprint_context) if sprint_context else ""
        
        # Build role-specific guidance
        role_guidance = self._get_role_specific_guidance(member_role)
        
        # Build conversation context
        context = self._build_context(conversation_history)
        
        # Generate AI response
        full_prompt = f"""{system_prompt}

TEAM MEMBER INFORMATION:
- Name: {member_name}
- Role: {member_role}

{sprint_info}

ROLE-SPECIFIC GUIDANCE:
{role_guidance}

{context}

User: {user_message}

Respond naturally and conversationally. Keep your response to 2-3 sentences maximum. 
Ask relevant follow-up questions based on their role when appropriate."""
        
        # Retry logic for transient errors
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Use plain text config for conversational responses
                text_config = {
                    "temperature": 0.7,
                }
                response = self.model.generate_content(full_prompt, generation_config=text_config)
                
                # Check for safety blocks or other issues that don't raise exceptions but return empty/invalid response
                if response.prompt_feedback and response.prompt_feedback.block_reason:
                    print(f"Gemini Blocked Response: {response.prompt_feedback.block_reason}")
                    return "I apologize, but I cannot respond to that specific message due to safety guidelines. Could we please rephrase or move to the next topic?"

                return self._clean_response(response.text)
                
            except google.api_core.exceptions.ResourceExhausted as e:
                print(f"Gemini Rate Limit Hit: {e}")
                return "I'm receiving a lot of messages right now. Please wait a moment (about 30 seconds) and try again."
                
            except google.api_core.exceptions.ServiceUnavailable as e:
                print(f"Gemini Service Unavailable (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1)) # Exponential backoff
                    continue
                return "The AI service is currently experiencing high traffic. Please try again in a few moments."
                
            except Exception as e:
                print(f"Gemini API error (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return "I apologize, but I'm having trouble processing your response due to a technical issue. Could you please try again?"
                
        return "I apologize, but I'm unable to connect to the AI service right now. Please try again later."
    
    def _build_sprint_context(self, sprint_context: Dict) -> str:
        """Build sprint context section for the prompt"""
        if not sprint_context:
            return ""
        
        parts = ["SPRINT CONTEXT:"]
        
        # Sprint name and dates
        parts.append(f"- Sprint: {sprint_context.get('name', 'Unknown Sprint')}")
        parts.append(f"- Dates: {sprint_context.get('start_date', '')} to {sprint_context.get('end_date', '')}")
        
        # Project info
        project = sprint_context.get('project')
        if project:
            parts.append(f"- Project: {project.get('name', '')}")
            if project.get('description'):
                parts.append(f"  Description: {project.get('description')}")
        
        # Sprint goals
        goals = sprint_context.get('goals', [])
        if goals:
            parts.append("- Sprint Goals:")
            for goal in goals:
                goal_text = goal.get('goal_text', '') if isinstance(goal, dict) else str(goal)
                if goal_text:
                    parts.append(f"  • {goal_text}")
        
        # Sprint outcomes (what admin shared)
        outcomes = sprint_context.get('outcomes')
        if outcomes:
            if outcomes.get('progress_summary'):
                parts.append(f"- Progress Summary: {outcomes['progress_summary']}")
            if outcomes.get('what_went_well'):
                parts.append(f"- What Went Well (Admin view): {outcomes['what_went_well']}")
            if outcomes.get('what_went_wrong'):
                parts.append(f"- Challenges (Admin view): {outcomes['what_went_wrong']}")
        
        return "\n".join(parts)
    
    def _get_role_specific_guidance(self, role: str) -> str:
        """Get role-specific interview guidance"""
        role_lower = role.lower()
        
        if 'developer' in role_lower or 'dev' in role_lower or 'engineer' in role_lower:
            return """For developers, focus on:
- Code quality and technical debt
- Development tools and processes
- Code review experience
- Technical challenges and solutions
- Sprint planning accuracy for development tasks"""
        
        elif 'qa' in role_lower or 'test' in role_lower or 'quality' in role_lower:
            return """For QA engineers, focus on:
- Testing coverage and processes
- Bug discovery and communication
- Environment stability
- Test automation opportunities
- Collaboration with developers"""
        
        elif 'design' in role_lower or 'ux' in role_lower or 'ui' in role_lower:
            return """For designers, focus on:
- Design-to-development handoff
- Feedback and iteration process
- User research incorporation
- Design system improvements
- Cross-functional collaboration"""
        
        elif 'product' in role_lower or 'pm' in role_lower or 'po' in role_lower:
            return """For product managers, focus on:
- Requirements clarity and changes
- Stakeholder communication
- Prioritization effectiveness
- Sprint goal achievement
- Team velocity and predictability"""
        
        elif 'scrum' in role_lower or 'agile' in role_lower:
            return """For Scrum Masters, focus on:
- Team impediments and blockers
- Process improvements
- Team dynamics and morale
- Sprint ceremony effectiveness
- Cross-team dependencies"""
        
        elif 'devops' in role_lower or 'infra' in role_lower or 'ops' in role_lower:
            return """For DevOps engineers, focus on:
- Deployment and CI/CD processes
- Infrastructure stability
- Monitoring and alerting
- Developer experience
- Security and compliance"""
        
        else:
            return """Focus on general sprint experience:
- What worked well
- What could be improved
- Team collaboration
- Process suggestions"""
    
    def _build_context(self, history: List[Dict]) -> str:
        """Build conversation context from history"""
        if not history:
            return "This is the start of the conversation."
        
        context = "Conversation so far:\n"
        # Use last 5 messages for context window management
        for msg in history[-5:]:
            role = "AI" if msg['role'] == 'ai' else "User"
            content = msg['content']
            context += f"{role}: {content}\n"
        return context
    
    def _clean_response(self, text: str) -> str:
        """Remove markdown artifacts from response"""
        # Remove markdown code blocks if present
        cleaned = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.MULTILINE)
        
        # Sometimes Gemini adds quotes around the entire response
        cleaned = cleaned.strip()
        if cleaned.startswith('"') and cleaned.endswith('"'):
            cleaned = cleaned[1:-1]
        
        return cleaned.strip()
    
    def _load_prompt(self, filename: str) -> str:
        """Load prompt template from file"""
        prompt_path = os.path.join(os.path.dirname(__file__), '..', 'prompts', filename)
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            # Fallback default prompt
            return """You are an empathetic AI facilitator conducting a sprint retrospective interview.
Ask thoughtful follow-up questions and keep the conversation natural.
Cover: wins, challenges, blockers, team dynamics, and suggestions for improvement."""
    
    def generate_conversation_summary(self, conversation_history: List[Dict], 
                                       member_name: str = "Team Member",
                                       member_role: str = "Team Member") -> Dict:
        """
        Generate a structured summary from a conversation.
        Returns a dict with categorized feedback points.
        """
        # Build conversation text
        conv_text = ""
        for msg in conversation_history:
            role = "AI" if msg['role'] == 'ai' else "User"
            conv_text += f"{role}: {msg['content']}\n"
        
        prompt = f"""Analyze the following sprint retrospective conversation and extract structured feedback.

CONVERSATION:
{conv_text}

TEAM MEMBER INFO:
- Name: {member_name}
- Role: {member_role}

Extract and return a JSON object with the following structure:
{{
    "went_well": ["list of positive points mentioned"],
    "challenges": ["list of challenges/problems mentioned"],
    "improvements": ["list of improvement suggestions"],
    "team_feedback": ["any feedback about team dynamics or collaboration"],
    "sentiment": "overall sentiment: positive, neutral, or negative",
    "key_quotes": ["2-3 direct quotes that capture important feedback"],
    "summary": "A 2-3 sentence overall summary of the feedback"
}}

Be thorough in extracting all feedback points. If a category has no relevant content, use an empty array.
Return ONLY the JSON object, no other text."""

        try:
            response = self.model.generate_content(prompt, generation_config=self.generation_config)
            result_text = response.text.strip()
            
            # Clean up response
            result_text = re.sub(r'^```json\s*', '', result_text, flags=re.MULTILINE)
            result_text = re.sub(r'\s*```$', '', result_text, flags=re.MULTILINE)
            
            return json.loads(result_text)
        except json.JSONDecodeError as e:
            print(f"JSON parse error in summary: {e}")
            return {
                "went_well": [],
                "challenges": [],
                "improvements": [],
                "team_feedback": [],
                "sentiment": "neutral",
                "key_quotes": [],
                "summary": "Unable to generate summary from conversation."
            }
        except Exception as e:
            print(f"Error generating summary: {e}")
            return {
                "went_well": [],
                "challenges": [],
                "improvements": [],
                "team_feedback": [],
                "sentiment": "neutral",
                "key_quotes": [],
                "summary": f"Error generating summary: {str(e)}"
            }
    
    def analyze_responses(self, responses: List[Dict], analysis_type: str = 'themes') -> Dict:
        """
        Analyze responses using Gemini.
        analysis_type: 'themes', 'recommendations', or 'sentiment'
        """
        if analysis_type == 'themes':
            return self._extract_themes(responses)
        elif analysis_type == 'recommendations':
            return self._generate_recommendations(responses)
        elif analysis_type == 'sentiment':
            return self._analyze_sentiment(responses)
        else:
            raise ValueError(f"Unknown analysis type: {analysis_type}")
    
    def _extract_themes(self, responses: List[Dict]) -> Dict:
        """Extract common themes from responses"""
        prompt_template = self._load_prompt('theme_extraction.txt')
        
        # Format responses
        formatted_responses = self._format_responses_for_analysis(responses)
        
        prompt = prompt_template.format(
            team_size=len(responses),
            summaries=formatted_responses
        )
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            cleaned_text = self._clean_json_string(response.text)
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {response.text}")
            return {"themes": []}
        except Exception as e:
            print(f"Theme extraction error: {e}")
            return {"themes": []}
    
    def _generate_recommendations(self, themes: List[Dict]) -> Dict:
        """Generate recommendations based on themes"""
        prompt_template = self._load_prompt('recommendations.txt')
        
        themes_text = json.dumps(themes, indent=2)
        prompt = prompt_template.format(themes=themes_text)
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            cleaned_text = self._clean_json_string(response.text)
            return json.loads(cleaned_text)
        except Exception as e:
            print(f"Recommendations generation error: {e}")
            return {"recommendations": []}
    
    def _analyze_sentiment(self, responses: List[Dict]) -> Dict:
        """Analyze overall sentiment from responses"""
        # Simple implementation - could be enhanced
        positive_count = 0
        neutral_count = 0
        negative_count = 0
        
        for response in responses:
            conversation = response.get('conversation', [])
            # Combine all user messages
            user_text = ' '.join([msg['content'] for msg in conversation if msg['role'] == 'user'])
            
            # Use Gemini to score sentiment
            score = self._get_sentiment_score(user_text)
            
            if score > 0.3:
                positive_count += 1
            elif score < -0.3:
                negative_count += 1
            else:
                neutral_count += 1
        
        total = len(responses)
        if total == 0:
            return {
                'overall_mood': 'neutral',
                'positive_percentage': 0,
                'neutral_percentage': 0,
                'negative_percentage': 0
            }
        
        return {
            'overall_mood': 'positive' if positive_count > negative_count else 'needs_improvement' if negative_count > positive_count else 'neutral',
            'positive_percentage': round((positive_count / total) * 100, 1),
            'neutral_percentage': round((neutral_count / total) * 100, 1),
            'negative_percentage': round((negative_count / total) * 100, 1)
        }
    
    def _get_sentiment_score(self, text: str) -> float:
        """Get sentiment score for text (-1 to 1)"""
        prompt = f"""Analyze the sentiment of this text and return a score between -1 (very negative) and 1 (very positive).
Return ONLY a JSON object with a single 'score' field.

Text: {text[:500]}

Return format: {{"score": 0.5}}"""
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            result = json.loads(self._clean_json_string(response.text))
            return result.get('score', 0.0)
        except:
            return 0.0
    
    def _format_responses_for_analysis(self, responses: List[Dict]) -> str:
        """Format responses for analysis prompts - uses summary_data when available"""
        formatted = ""
        for i, resp in enumerate(responses, 1):
            formatted += f"\n[Response {i}]\n"
            formatted += f"User: {resp.get('user_name', 'Anonymous')}\n"
            
            # Prefer summary_data (structured) over raw conversation
            summary = resp.get('summary_data')
            if summary and isinstance(summary, dict):
                # Use structured summary data
                if summary.get('went_well'):
                    formatted += f"What went well: {', '.join(summary.get('went_well', []))}\n"
                if summary.get('challenges'):
                    formatted += f"Challenges: {', '.join(summary.get('challenges', []))}\n"
                if summary.get('improvements'):
                    formatted += f"Improvement ideas: {', '.join(summary.get('improvements', []))}\n"
                if summary.get('team_feedback'):
                    formatted += f"Team feedback: {', '.join(summary.get('team_feedback', []))}\n"
                if summary.get('sentiment'):
                    formatted += f"Sentiment: {summary.get('sentiment')}\n"
                if summary.get('summary'):
                    formatted += f"Summary: {summary.get('summary')}\n"
            else:
                # Fallback to raw conversation
                conversation = resp.get('conversation', [])
                user_messages = [msg['content'] for msg in conversation if msg['role'] == 'user']
                formatted += f"Feedback: {' '.join(user_messages)}\n"
        
        print(f"DEBUG: Formatted responses for analysis:\n{formatted[:500]}...")
        return formatted
    
    def _clean_json_string(self, json_str: str) -> str:
        """Clean JSON string by removing markdown and other artifacts"""
        # Remove markdown code blocks
        cleaned = re.sub(r'^```json\s*', '', json_str, flags=re.MULTILINE)
        cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
        
        # Remove any preamble before the JSON
        # Look for the first { or [
        first_brace = cleaned.find('{')
        first_bracket = cleaned.find('[')
        
        if first_brace == -1 and first_bracket == -1:
            return cleaned
        
        if first_brace == -1:
            start = first_bracket
        elif first_bracket == -1:
            start = first_brace
        else:
            start = min(first_brace, first_bracket)
        
        cleaned = cleaned[start:]
        
        return cleaned.strip()
