from typing import Dict, List, Optional
from datetime import datetime


class ResumeScorer:
    """Score resumes based on requirements"""
    
    def __init__(self, required_skills: List[str], min_experience: int = 0):
        self.required_skills = [skill.lower().strip() for skill in required_skills]
        self.min_experience = min_experience
    
    def score_resume(self, resume_data: Dict) -> Dict:
        """
        Score resume based on skills, experience, education, and quality
        Returns scores and matching details
        """
        if not resume_data or 'error' in resume_data:
            return {
                'overall_score': 0,
                'skill_match_score': 0,
                'experience_score': 0,
                'education_score': 0,
                'quality_score': 0,
                'matched_skills': [],
                'missing_skills': self.required_skills,
                'is_qualified': False,
                'scoring_breakdown': {}
            }
        
        # Extract candidate skills (normalize to lowercase)
        candidate_skills = [
            skill.lower().strip() 
            for skill in resume_data.get('skills', [])
        ]
        
        # 1. Skill Matching Score (40%)
        skill_score, matched, missing = self._calculate_skill_score(candidate_skills)
        
        # 2. Experience Score (30%)
        experience_score = self._calculate_experience_score(
            resume_data.get('years_of_experience', 0)
        )
        
        # 3. Education Score (20%)
        education_score = self._calculate_education_score(
            resume_data.get('education', [])
        )
        
        # 4. Quality Score (10%)
        quality_score = self._calculate_quality_score(resume_data)
        
        # Calculate weighted overall score
        overall_score = (
            skill_score * 0.4 +
            experience_score * 0.3 +
            education_score * 0.2 +
            quality_score * 0.1
        )
        
        # Determine qualification
        is_qualified = (
            skill_score >= 60 and 
            experience_score >= 50 and
            overall_score >= 60
        )
        
        return {
            'overall_score': round(overall_score, 2),
            'skill_match_score': round(skill_score, 2),
            'experience_score': round(experience_score, 2),
            'education_score': round(education_score, 2),
            'quality_score': round(quality_score, 2),
            'matched_skills': matched,
            'missing_skills': missing,
            'is_qualified': is_qualified,
            'scoring_breakdown': {
                'skill_weight': '40%',
                'experience_weight': '30%',
                'education_weight': '20%',
                'quality_weight': '10%'
            },
            'evaluation_date': datetime.utcnow().isoformat()
        }
    
    def _calculate_skill_score(self, candidate_skills: List[str]) -> tuple:
        """Calculate skill matching score"""
        if not self.required_skills:
            return 100.0, [], []
        
        matched_skills = []
        missing_skills = []
        
        for required_skill in self.required_skills:
            # Check for exact match or partial match
            is_matched = any(
                required_skill in candidate_skill or 
                candidate_skill in required_skill
                for candidate_skill in candidate_skills
            )
            
            if is_matched:
                matched_skills.append(required_skill)
            else:
                missing_skills.append(required_skill)
        
        if len(self.required_skills) == 0:
            score = 100.0
        else:
            score = (len(matched_skills) / len(self.required_skills)) * 100
        
        return score, matched_skills, missing_skills
    
    def _calculate_experience_score(self, years: int) -> float:
        """Calculate experience score"""
        if self.min_experience == 0:
            return 100.0
        
        if years >= self.min_experience * 1.5:
            return 100.0
        elif years >= self.min_experience:
            return 80.0 + ((years - self.min_experience) / self.min_experience * 20)
        elif years >= self.min_experience * 0.75:
            return 60.0
        elif years >= self.min_experience * 0.5:
            return 40.0
        else:
            return (years / self.min_experience) * 50
    
    def _calculate_education_score(self, education: List[Dict]) -> float:
        """Calculate education score"""
        if not education:
            return 50.0
        
        degree_scores = {
            'phd': 100,
            'doctorate': 100,
            'master': 90,
            'mba': 90,
            'bachelor': 75,
            'associate': 60,
            'diploma': 50,
            'certificate': 40
        }
        
        max_score = 0
        for edu in education:
            degree = edu.get('degree', '').lower()
            for key, score in degree_scores.items():
                if key in degree:
                    max_score = max(max_score, score)
                    break
        
        return max_score if max_score > 0 else 50.0
    
    def _calculate_quality_score(self, resume_data: Dict) -> float:
        """Calculate resume quality score"""
        quality_analysis = resume_data.get('quality_analysis', {})
        
        # Use AI quality score if available
        if 'overall_quality_score' in quality_analysis:
            return quality_analysis['overall_quality_score']
        
        # Fallback: basic quality checks
        score = 50.0
        
        # Has summary
        if resume_data.get('summary'):
            score += 10
        
        # Has certifications
        if resume_data.get('certifications'):
            score += 10
        
        # Has languages
        if resume_data.get('languages') and len(resume_data['languages']) > 1:
            score += 10
        
        # Has multiple experiences
        if len(resume_data.get('experience', [])) >= 2:
            score += 10
        
        # Has education
        if resume_data.get('education'):
            score += 10
        
        return min(score, 100.0)
