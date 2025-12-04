import pdfplumber
import google.generativeai as genai
from typing import Dict
import json
import re
from config.settings import settings


class ResumeExtractor:
    """Extract structured data from resumes using Gemini AI"""
    
    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.model = genai.GenerativeModel(settings.gemini_model)
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF resume"""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting PDF: {e}")
            return ""
    
    def extract_structured_data(self, resume_text: str) -> Dict:
        """Use Gemini AI to extract structured data"""
        
        prompt = f"""Extract information from this resume as JSON:

{{
  "name": "Full name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, Country",
  "summary": "Professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [
    {{"company": "Company", "title": "Title", "duration": "2020-2023", "responsibilities": ["resp1"]}}
  ],
  "education": [
    {{"degree": "Degree", "institution": "University", "year": "2020"}}
  ],
  "certifications": ["cert1"],
  "years_of_experience": 0,
  "languages": ["English"]
}}

Resume:
{resume_text[:3000]}

Return ONLY valid JSON.
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            response_text = response_text.replace('``````', '').strip()
            
            extracted_data = json.loads(response_text)
            extracted_data['raw_text'] = resume_text[:1000]
            
            defaults = {
                'name': None, 'email': None, 'phone': None, 'location': None,
                'summary': None, 'skills': [], 'experience': [], 'education': [],
                'certifications': [], 'years_of_experience': 0, 'languages': []
            }
            
            for key, default_value in defaults.items():
                if key not in extracted_data:
                    extracted_data[key] = default_value
            
            return extracted_data
            
        except Exception as e:
            print(f"AI extraction failed: {e}")
            return self._fallback_extraction(resume_text)
    
    def _fallback_extraction(self, text: str) -> Dict:
        """Regex fallback"""
        email = None
        phone = None
        
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            email = email_match.group()
        
        phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match:
            phone = phone_match.group()
        
        return {
            'name': None, 'email': email, 'phone': phone, 'location': None,
            'summary': None, 'skills': [], 'experience': [], 'education': [],
            'certifications': [], 'years_of_experience': 0, 'languages': [],
            'raw_text': text[:1000], 'extraction_method': 'fallback'
        }
    
    def analyze_resume_quality(self, resume_data: Dict) -> Dict:
        """Analyze quality"""
        
        prompt = f"""Rate this resume as JSON:

{{
  "overall_quality_score": 75,
  "strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1"],
  "keyword_optimization": ["tip1"],
  "presentation_score": 80
}}

Name: {resume_data.get('name', 'N/A')}
Skills: {', '.join(resume_data.get('skills', [])[:15])}
Experience: {resume_data.get('years_of_experience', 0)} years

Return ONLY JSON.
"""
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip().replace('``````', '').strip()
            return json.loads(response_text)
        except Exception as e:
            return {
                'overall_quality_score': 50,
                'strengths': ['Resume submitted'],
                'areas_for_improvement': ['Unable to analyze'],
                'keyword_optimization': [],
                'presentation_score': 50
            }
    
    def parse_resume(self, pdf_path: str) -> Dict:
        """Main parsing method"""
        text = self.extract_text_from_pdf(pdf_path)
        
        if not text or len(text.strip()) < 50:
            return {'error': 'Unable to extract text from PDF', 'raw_text': text}
        
        structured_data = self.extract_structured_data(text)
        quality_analysis = self.analyze_resume_quality(structured_data)
        
        return {**structured_data, 'quality_analysis': quality_analysis}
