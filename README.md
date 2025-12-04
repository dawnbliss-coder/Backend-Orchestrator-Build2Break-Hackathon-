# HR Workflow Orchestrator

A unified API system that automates HR workflows including resume screening, onboarding plan generation, and policy Q&A using AI agents.

## Features
- **Resume Screening**: Extracts and scores candidate information from PDFs
- **Onboarding Plan Generation**: Creates personalized onboarding schedules
- **Policy Q&A**: Answers candidate policy questions using RAG

## Setup Instructions

### Prerequisites
- Python 3.8+
- MongoDB Atlas account (free tier available)
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hr_management
```

## Project Origin

This project was originally developed during [Hackathon Name] in collaboration 
with [teammate names]. This repository represents my continued development and 
improvements to the original concept.

**Original Team Members:**
- Mahek Desai - [flakes22](https://github.com/flakes22)
- Aishani Sood - [aishani-sood21](https://github.com/aishani-sood21)
- Shrawani Nanda - [shraw06](https://github.com/shraw06)

**My Contributions:**
- implemented Policy Q&A ai chatbot → Answer candidate's policy questions

##  Overview

This orchestrator provides a **unified API endpoint** that processes candidates through a complete HR workflow in one sequential operation:

1. **Resume Screening** → Extract and score candidate information
2. **Onboarding Plan Generation** → Create personalized onboarding schedule
3. **Policy Q&A** → Answer candidate's policy questions

All three agents work together seamlessly through a single API call.

---

##  Architecture

```
┌─────────────────────────────────────────────────┐
│           Orchestrator API (Port 9000)          │
│              /orchestrate endpoint               │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Resume    │ │ Onboarding  │ │  Policy Q&A │
│   Screening │ │    Agent    │ │    Agent    │
│    Agent    │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

##  Project Structure

```
BUILD2BREAK25-ORION/
├── .github/
├── hr_management/
│   ├── policy_service/
│   ├── read_pdfs/
│   └── src/
│       └── hr_management/
│           ├── __pycache__/
│           ├── .env
│           ├── crew.py
│           ├── main.py
│           ├── onboarding_agent.py
│           ├── orchestrator.py              ← Port 9000 (Sequential API)
│           ├── policy_agent.py
│           ├── policy_documents.json
│           ├── policy_qa.py
│           ├── resume_agent.py
│           └── .env
└── README.md
```

---

##  Prerequisites

### Required Software
- Python 3.8+
- MongoDB Atlas account (for candidate storage)
- Gemini API keys

### Required Python Packages

Create `requirements.txt`:

```txt
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
pymongo==4.6.0
requests==2.31.0
crewai==0.1.0
google-generativeai==0.3.1
pdfplumber==0.10.3
pytesseract==0.3.10
Pillow==10.1.0
```


Install dependencies:

```bash
pip install -r requirements.txt
```

---

##  Configuration

### 1. API Keys Setup

Update the following files with your Gemini API keys:

**`resume_agent.py`:**
```python
GEMINI_API_KEY = "YOUR_RESUME_API_KEY"
```

**`onboarding_agent.py`:**
```python
GEMINI_API_KEY = "YOUR_ONBOARDING_API_KEY"
```

**