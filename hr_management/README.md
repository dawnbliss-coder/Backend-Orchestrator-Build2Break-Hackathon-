# AI-Powered HR Management System (Google Gemini)

A comprehensive HR management system leveraging **Google Gemini AI (Free Tier)** and MongoDB for intelligent resume screening, personalized onboarding, and policy Q&A.

## 🚀 Features

### 1. **AI Resume Screening** 
- Intelligent extraction using Gemini 1.5 Flash (FREE)
- Automatic skill matching and scoring
- Resume quality analysis and ATS optimization
- MongoDB storage for candidate profiles

### 2. **AI Onboarding Plan Generation**
- Personalized 2-week onboarding schedules
- Role and department-specific activities
- Day-by-day tasks with goals and deliverables
- Automatic weekend skip logic

### 3. **AI Policy Q&A (RAG)**
- Semantic search through company policies
- Context-aware answers using Gemini
- Source attribution and confidence scoring
- Vector database for efficient retrieval

## 🛠️ Technology Stack

- **AI**: Google Gemini 1.5 Flash (FREE tier)
- **Database**: MongoDB (with async support)
- **Backend**: FastAPI
- **Vector Store**: ChromaDB
- **Embeddings**: Google Generative AI Embeddings (FREE)

## 📦 Installation

```bash
# Clone repository
git clone <your-repo>
cd hr_management

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt