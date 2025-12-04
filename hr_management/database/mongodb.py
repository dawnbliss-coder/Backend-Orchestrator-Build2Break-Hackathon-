from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from datetime import datetime
from typing import Dict, List, Optional
from bson import ObjectId
from config.settings import settings


class AsyncMongoDBManager:
    """Async MongoDB manager with connection pooling"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.resumes = None
        self.candidates = None
        self.onboarding_plans = None
        self.policies = None
    
    async def connect(self):
        """Initialize MongoDB connection"""
        try:
            self.client = AsyncIOMotorClient(
                settings.mongodb_uri,
                maxPoolSize=50,
                minPoolSize=10,
                serverSelectionTimeoutMS=5000
            )
            
            # Test connection
            await self.client.admin.command('ping')
            
            self.db = self.client[settings.mongodb_db_name]
            self.resumes = self.db.resumes
            self.candidates = self.db.candidates
            self.onboarding_plans = self.db.onboarding_plans
            self.policies = self.db.policies
            
            # Create indexes
            await self._create_indexes()
            
            print(f"✅ Connected to MongoDB: {settings.mongodb_db_name}")
            
        except ConnectionFailure as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✅ MongoDB connection closed")
    
    async def _create_indexes(self):
        """Create database indexes"""
        try:
            await self.candidates.create_index("email", unique=True)
            await self.candidates.create_index("overall_score")
            await self.resumes.create_index("candidate_id")
            await self.resumes.create_index("upload_date")
            await self.onboarding_plans.create_index("employee_name")
            print("✅ Database indexes created")
        except Exception as e:
            print(f"⚠️  Index warning: {e}")
    
    async def save_resume(self, resume_data: Dict) -> str:
        """Save resume data"""
        try:
            resume_data['upload_date'] = datetime.utcnow()
            result = await self.resumes.insert_one(resume_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving resume: {e}")
            raise
    
    async def save_candidate(self, candidate_data: Dict) -> str:
        """Save or update candidate"""
        try:
            candidate_data['updated_at'] = datetime.utcnow()
            email = candidate_data.get('email')
            
            if not email:
                candidate_data['created_at'] = datetime.utcnow()
                result = await self.candidates.insert_one(candidate_data)
                return str(result.inserted_id)
            
            existing = await self.candidates.find_one({"email": email})
            
            if existing:
                await self.candidates.update_one(
                    {"email": email},
                    {"$set": candidate_data}
                )
                return str(existing['_id'])
            else:
                candidate_data['created_at'] = datetime.utcnow()
                result = await self.candidates.insert_one(candidate_data)
                return str(result.inserted_id)
                
        except DuplicateKeyError:
            existing = await self.candidates.find_one({"email": candidate_data.get('email')})
            if existing:
                return str(existing['_id'])
            raise
        except Exception as e:
            print(f"Error saving candidate: {e}")
            raise
    
    async def get_candidate(self, candidate_id: str) -> Optional[Dict]:
        """Get candidate by ID"""
        try:
            result = await self.candidates.find_one({"_id": ObjectId(candidate_id)})
            if result:
                result['_id'] = str(result['_id'])
            return result
        except Exception as e:
            print(f"Error getting candidate: {e}")
            return None
    
    async def get_top_candidates(self, limit: int = 10) -> List[Dict]:
        """Get top-scored candidates"""
        try:
            cursor = self.candidates.find().sort("overall_score", -1).limit(limit)
            candidates = await cursor.to_list(length=limit)
            
            for candidate in candidates:
                candidate['_id'] = str(candidate['_id'])
            
            return candidates
        except Exception as e:
            print(f"Error getting top candidates: {e}")
            return []
    
    async def save_onboarding_plan(self, plan_data: Dict) -> str:
        """Save onboarding plan"""
        try:
            plan_data['created_at'] = datetime.utcnow()
            result = await self.onboarding_plans.insert_one(plan_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving onboarding plan: {e}")
            raise
    
    async def save_policy(self, policy_data: Dict) -> str:
        """Save company policy"""
        try:
            policy_data['created_at'] = datetime.utcnow()
            result = await self.policies.insert_one(policy_data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error saving policy: {e}")
            raise
    
    async def get_all_policies(self) -> List[Dict]:
        """Get all policies"""
        try:
            cursor = self.policies.find()
            policies = await cursor.to_list(length=None)
            
            for policy in policies:
                policy['_id'] = str(policy['_id'])
            
            return policies
        except Exception as e:
            print(f"Error getting policies: {e}")
            return []
