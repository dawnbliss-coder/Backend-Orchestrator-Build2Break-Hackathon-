from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from fastapi.staticfiles import StaticFiles
import shutil
import os
from datetime import datetime
from pathlib import Path

from database.mongodb import AsyncMongoDBManager
from resume_screening.extractor import ResumeExtractor
from resume_screening.scorer import ResumeScorer
from onboarding.plan_generator import OnboardingPlanGenerator
from policy_qa.rag_engine import PolicyRAGEngine
from config.settings import settings

# Initialize FastAPI
app = FastAPI(
    title="HR Management System API",
    description="AI-powered HR system with resume screening, onboarding, and policy Q&A",
    version="1.0.0"
)

app.mount("/static", StaticFiles(directory="frontend"))


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
db = None
resume_extractor = None
onboarding_generator = None
policy_rag = None

# Constants
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt'}
MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024


# Pydantic Models
class OnboardingRequest(BaseModel):
    employee_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    department: str = Field(..., min_length=1, max_length=100)
    start_date: str = Field(..., description="Format: YYYY-MM-DD")
    employee_background: Optional[str] = Field(default="", max_length=1000)


class PolicyQuestion(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)


class PolicyDocument(BaseModel):
    name: str
    content: str
    category: Optional[str] = "General"
    version: Optional[str] = "1.0"


# Startup and Shutdown
@app.on_event("startup")
async def startup_event():
    """Initialize all services"""
    global db, resume_extractor, onboarding_generator, policy_rag
    
    try:
        print("🚀 Starting HR Management System...")
        
        # Initialize database
        db = AsyncMongoDBManager()
        await db.connect()
        
        # Initialize AI services
        resume_extractor = ResumeExtractor()
        onboarding_generator = OnboardingPlanGenerator()
        policy_rag = PolicyRAGEngine()
        await policy_rag.initialize()
        
        # Create upload directory
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        print("✅ All services initialized successfully")
        
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global db
    if db:
        await db.close()
        print("✅ Services shut down gracefully")


# Helper Functions
def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )


# API Routes
@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    required_skills: str = Form(""),
    min_experience: int = Form(0)
):
    """Upload and process resume with AI extraction and scoring"""
    file_path = None
    
    try:
        # Validate
        validate_file(file)
        
        # Save file
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._- ")
        file_path = upload_dir / f"{timestamp}_{safe_filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"📄 File saved: {file_path}")
        
        # Extract data using Gemini
        resume_data = resume_extractor.parse_resume(str(file_path))
        
        if 'error' in resume_data:
            raise HTTPException(status_code=400, detail=resume_data['error'])
        
        # Score resume
        skills_list = [s.strip() for s in required_skills.split(',') if s.strip()]
        scorer = ResumeScorer(skills_list, min_experience)
        score_result = scorer.score_resume(resume_data)
        
        # Combine data
        candidate_data = {
            **resume_data,
            **score_result,
            'original_filename': file.filename,
            'upload_date': datetime.utcnow(),
            'required_skills': skills_list,
            'min_experience_required': min_experience
        }
        
        # Save to MongoDB
        candidate_id = await db.save_candidate(candidate_data)
        resume_id = await db.save_resume(candidate_data)
        
        # Clean up file
        if file_path and file_path.exists():
            os.remove(file_path)
        
        return {
            'success': True,
            'candidate_id': candidate_id,
            'resume_id': resume_id,
            'overall_score': score_result['overall_score'],
            'is_qualified': score_result['is_qualified'],
            'matched_skills': score_result['matched_skills'],
            'missing_skills': score_result['missing_skills']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Cleanup on error
        if file_path and Path(file_path).exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")


@app.get("/api/candidates/top")
async def get_top_candidates(limit: int = 10):
    """Get top-scored candidates"""
    try:
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
        
        candidates = await db.get_top_candidates(limit)
        return {
            'success': True,
            'count': len(candidates),
            'candidates': candidates
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/onboarding/generate")
async def generate_onboarding_plan(request: OnboardingRequest):
    """Generate AI-powered onboarding plan"""
    try:
        # Validate date format
        try:
            datetime.strptime(request.start_date, '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Generate plan
        plan = onboarding_generator.generate_plan(
            role=request.role,
            department=request.department,
            employee_name=request.employee_name,
            start_date=request.start_date,
            employee_background=request.employee_background
        )
        
        # Save to MongoDB
        plan_id = await db.save_onboarding_plan(plan)
        plan['_id'] = plan_id
        
        return {
            'success': True,
            'plan_id': plan_id,
            'plan': plan
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")


@app.post("/api/policy/ask")
async def ask_policy_question(question: PolicyQuestion):
    """Ask a question about company policies"""
    try:
        answer = policy_rag.ask_question(question.question)
        return {
            'success': True,
            **answer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/policy/upload")
async def upload_policy_documents(documents: List[PolicyDocument]):
    """Upload policy documents to vector database"""
    try:
        if not documents:
            raise HTTPException(status_code=400, detail="No documents provided")
        
        # Convert to dict format
        docs = [doc.dict() for doc in documents]
        
        # Load into RAG engine
        policy_rag.load_policy_documents(docs)
        
        # Save to MongoDB for backup
        for doc in docs:
            await db.save_policy(doc)
        
        return {
            'success': True,
            'message': f'Successfully uploaded {len(documents)} policy documents',
            'count': len(documents)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading policies: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "connected" if db and db.client else "disconnected",
            "rag_engine": "initialized" if policy_rag and policy_rag._initialized else "not initialized"
        }
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "HR Management System API",
        "version": "1.0.0",
        "endpoints": {
            "resume_upload": "/api/resume/upload",
            "top_candidates": "/api/candidates/top",
            "generate_onboarding": "/api/onboarding/generate",
            "policy_qa": "/api/policy/ask",
            "upload_policies": "/api/policy/upload",
            "health": "/api/health"
        }
    }
