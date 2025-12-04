from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import Optional, List
import os
import sys


class Settings(BaseSettings):
    # Google Gemini API Key
    google_api_key: str = Field(..., description="Google Gemini API key")
    
    # MongoDB Configuration
    mongodb_uri: str = Field(
        default="mongodb://localhost:27017/",
        description="MongoDB connection URI"
    )
    mongodb_db_name: str = Field(
        default="hr_management",
        description="MongoDB database name"
    )
    
    # ChromaDB Configuration
    chroma_persist_directory: str = Field(
        default="./data/chroma_db",
        description="ChromaDB storage directory"
    )
    chroma_collection_name: str = Field(
        default="company_policies",
        description="ChromaDB collection name"
    )
    
    # Application Settings
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8000, description="API port", ge=1024, le=65535)
    environment: str = Field(default="development", description="Environment")
    
    # File Upload Settings
    upload_dir: str = Field(default="uploads/resumes", description="Upload directory")
    max_file_size_mb: int = Field(default=10, description="Max file size in MB")
    allowed_extensions: List[str] = Field(
        default=[".pdf", ".doc", ".docx", ".txt"],
        description="Allowed file extensions"
    )
    
    # AI Model Settings
    gemini_model: str = Field(default="gemini-1.5-flash", description="Gemini model")
    gemini_temperature: float = Field(default=0.1, ge=0.0, le=2.0)
    
    # RAG Settings
    rag_top_k_results: int = Field(default=5, description="Top K results for RAG")
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
    
    @validator('google_api_key')
    def validate_api_key(cls, v):
        """Validate Google API key"""
        if not v or len(v) < 20:
            print("\n⚠️  ERROR: Invalid Google API key!")
            print("Get your free API key: https://makersuite.google.com/app/apikey")
            sys.exit(1)
        return v
    
    @validator('mongodb_uri')
    def validate_mongodb_uri(cls, v):
        """Validate MongoDB URI"""
        if not v.startswith(('mongodb://', 'mongodb+srv://')):
            raise ValueError("Invalid MongoDB URI format")
        return v
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create necessary directories
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.chroma_persist_directory, exist_ok=True)


settings = Settings()
