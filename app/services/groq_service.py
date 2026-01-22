from groq import Groq
import os
import re
from typing import List, Dict
import time

class GroqService:
    """Service for Groq-powered fast chat responses"""
    
    def __init__(self):
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        self.client = Groq(api_key=api_key)
        # Using Llama 3.1 8B Instant for fast responses
        self.model = "llama-3.1-8b-instant"
    
    def conduct_interview(self, conversation_history: List[Dict], user_message: str,
                          member_name: str = "Team Member", member_role: str = "Team Member",
                          sprint_context: Dict = None) -> str:
        """
        Continue the retrospective interview conversation using Groq.
        Returns the AI's response as a string.
        """
        # Load interviewer prompt template
        system_prompt = self._load_prompt('interviewer.txt')
        
        # Build sprint context section
        sprint_info = self._build_sprint_context(sprint_context) if sprint_context else ""
        
        # Build role-specific guidance
        role_guidance = self._get_role_specific_guidance(member_role)
        
        # Build conversation context for Groq
        messages = self._build_groq_messages(
            system_prompt, 
            member_name, 
            member_role, 
            sprint_info, 
            role_guidance,
            conversation_history,
            user_message
        )
        
        # Retry logic for transient errors
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Call Groq API
                chat_completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=300,  # Keep responses concise
                )
                
                response_text = chat_completion.choices[0].message.content
                return self._clean_response(response_text)
                
            except Exception as e:
                error_str = str(e).lower()
                
                # Handle rate limiting
                if 'rate_limit' in error_str or 'rate limit' in error_str:
                    print(f"Groq Rate Limit Hit: {e}")
                    return "I'm receiving a lot of messages right now. Please wait a moment (about 30 seconds) and try again."
                
                # Handle service unavailable
                if 'unavailable' in error_str or 'service' in error_str:
                    print(f"Groq Service Unavailable (Attempt {attempt+1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 * (attempt + 1))  # Exponential backoff
                        continue
                    return "The AI service is currently experiencing high traffic. Please try again in a few moments."
                
                # General error
                print(f"Groq API error (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
                return "I apologize, but I'm having trouble processing your response due to a technical issue. Could you please try again?"
        
        return "I apologize, but I'm unable to connect to the AI service right now. Please try again later."
    
    def _build_groq_messages(self, system_prompt: str, member_name: str, member_role: str,
                              sprint_info: str, role_guidance: str, 
                              conversation_history: List[Dict], user_message: str) -> List[Dict]:
        """Build messages array for Groq API"""
        # Build system message
        system_content = f"""{system_prompt}

TEAM MEMBER INFORMATION:
- Name: {member_name}
- Role: {member_role}

{sprint_info}

ROLE-SPECIFIC GUIDANCE:
{role_guidance}

Keep your responses to 2-3 sentences maximum. Ask relevant follow-up questions based on their role when appropriate."""
        
        messages = [{"role": "system", "content": system_content}]
        
        # Add conversation history (last 5 messages for context window)
        for msg in conversation_history[-10:]:
            role = "assistant" if msg['role'] == 'ai' else "user"
            messages.append({"role": role, "content": msg['content']})
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
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
    
    def _clean_response(self, text: str) -> str:
        """Remove any artifacts from response"""
        # Remove markdown code blocks if present
        cleaned = re.sub(r'^```[a-z]*\s*', '', text, flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
        
        # Sometimes LLMs add quotes around the entire response
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
