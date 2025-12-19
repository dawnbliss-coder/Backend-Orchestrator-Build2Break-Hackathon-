# AI-Powered HR Management Portal

This is a full-stack enterprise application designed to automate HR workflows. The system integrates Large Language Models (LLMs) to handle document intelligence for company policies, candidate skill assessment, and automated onboarding roadmap generation.

## Core Modules

1. **Knowledge Base (RAG):** Implements Retrieval-Augmented Generation to allow HR professionals to query internal PDF documents. It features automated text extraction, summarization, and vector-based search.
2. **Skill Scoring Engine:** Analyzes candidate resumes against job descriptions to provide a match percentage, identifies skill gaps, and extracts key highlights.
3. **Talent Pool Management:** A persistent database of analyzed candidates with search, filter, and delete capabilities.
4. **Onboarding Module:** Utilizes identified skill gaps to generate structured 30-day training roadmaps for new hires.

## Technical Stack

* **Framework:** Next.js 15 (App Router)
* **AI Engine:** Google Gemini 2.0 Flash
* **Database:** MongoDB Atlas
* **PDF Processing:** pdf2json
* **Styling:** Tailwind CSS

## Environment Variables

The following variables must be defined in a .env.local file:

* MONGODB_URI: Your MongoDB Atlas connection string.
* GEMINI_API_KEY: Your Google AI Studio API key.

## Installation and Execution

### 1. Clone the Project
Navigate to your project directory.

### 2. Install Dependencies
Run the following command to ensure all required Node modules are installed:
npm install

### 3. Run in Development Mode
To start the application locally:
npm run dev

### 4. Access the Dashboard
Open your browser and navigate to http://localhost:3000.

## Key Dependencies Installed

* @google/generative-ai: Interface for Gemini API.
* mongodb: Database driver for candidate and policy storage.
* pdf2json: Technical parser for PDF text extraction.
* lucide-react: Component library for dashboard icons.