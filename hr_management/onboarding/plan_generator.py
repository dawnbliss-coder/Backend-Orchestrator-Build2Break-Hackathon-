import google.generativeai as genai
from datetime import datetime, timedelta
from typing import Dict
import json
from config.settings import settings

class OnboardingPlanGenerator:
    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def generate_plan(self, role: str, department: str, 
                     employee_name: str, start_date: str,
                     employee_background: str = "") -> Dict:
        """Generate personalized onboarding plan using Gemini AI"""
        
        prompt = f"""
Create a comprehensive 2-week onboarding plan for a new employee.

Employee Details:
- Name: {employee_name}
- Role: {role}
- Department: {department}
- Start Date: {start_date}
- Background: {employee_background if employee_background else "General background"}

Generate a day-by-day schedule for 10 working days.

Return as JSON:
{{
  "overview": "Brief overview (2-3 sentences)",
  "days": [
    {{
      "day": 1,
      "theme": "Welcome & Orientation",
      "activities": [
        {{
          "time": "9:00 AM",
          "activity": "Welcome meeting",
          "duration": "1 hour",
          "description": "Introduction to company",
          "owner": "HR Manager"
        }}
      ],
      "goals": ["Goal 1", "Goal 2"],
      "deliverables": ["Deliverable 1"]
    }}
  ],
  "milestones": [
    {{
      "week": 1,
      "milestone": "Complete orientation",
      "success_criteria": ["Criteria 1"]
    }}
  ],
  "resources": ["Resource 1", "Resource 2"]
}}

Return ONLY valid JSON.
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            plan = json.loads(response_text.strip())
            
            plan['employee_name'] = employee_name
            plan['role'] = role
            plan['department'] = department
            plan['start_date'] = start_date
            plan['created_at'] = datetime.utcnow().isoformat()
            
            # Calculate actual dates (skip weekends)
            start = datetime.strptime(start_date, '%Y-%m-%d')
            for day_plan in plan.get('days', []):
                day_num = day_plan.get('day', 1) - 1
                days_to_add = 0
                temp_date = start
                
                while days_to_add < day_num:
                    temp_date += timedelta(days=1)
                    if temp_date.weekday() < 5:
                        days_to_add += 1
                
                day_plan['date'] = temp_date.strftime('%Y-%m-%d')
                day_plan['day_of_week'] = temp_date.strftime('%A')
            
            return plan
            
        except Exception as e:
            print(f"Error generating plan: {e}")
            return self._generate_fallback_plan(employee_name, role, department, start_date)
    
    def _generate_fallback_plan(self, employee_name: str, role: str, 
                                department: str, start_date: str) -> Dict:
        """Generate basic fallback plan"""
        return {
            'employee_name': employee_name,
            'role': role,
            'department': department,
            'start_date': start_date,
            'overview': f'Standard onboarding plan for {role}',
            'days': [{
                'day': 1,
                'date': start_date,
                'theme': 'Welcome & Setup',
                'activities': [{
                    'time': '9:00 AM',
                    'activity': 'Welcome & Orientation',
                    'duration': '2 hours',
                    'description': 'Company introduction',
                    'owner': 'HR'
                }],
                'goals': ['Complete orientation'],
                'deliverables': ['Signed documents']
            }],
            'milestones': [{
                'week': 1,
                'milestone': 'Complete setup',
                'success_criteria': ['Access granted']
            }],
            'resources': ['Employee handbook'],
            'created_at': datetime.utcnow().isoformat()
        }