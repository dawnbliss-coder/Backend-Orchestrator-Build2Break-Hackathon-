import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from typing import List, Dict
import os
from config.settings import settings


class PolicyRAGEngine:
    """RAG engine for policy Q&A using ChromaDB and Gemini"""
    
    def __init__(self):
        genai.configure(api_key=settings.google_api_key)
        self.persist_directory = settings.chroma_persist_directory
        self.collection_name = settings.chroma_collection_name
        self.embeddings = None
        self.model = genai.GenerativeModel(settings.gemini_model)
        self.vector_store = None
        self._initialized = False
    
    async def initialize(self):
        """Async initialization of RAG engine"""
        if self._initialized:
            return
        
        try:
            # Initialize embeddings
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=settings.google_api_key
            )
            
            # Create persist directory
            os.makedirs(self.persist_directory, exist_ok=True)
            
            # Try to load existing vector store
            try:
                self.vector_store = Chroma(
                    persist_directory=self.persist_directory,
                    embedding_function=self.embeddings,
                    collection_name=self.collection_name
                )
                print(f"✅ Loaded existing ChromaDB collection: {self.collection_name}")
            except Exception as e:
                print(f"ℹ️  No existing collection found: {e}")
                self.vector_store = None
            
            self._initialized = True
            
        except Exception as e:
            print(f"❌ Error initializing RAG engine: {e}")
            raise
    
    def load_policy_documents(self, documents: List[Dict]):
        """Load policy documents into vector store"""
        if not self._initialized:
            raise RuntimeError("RAG engine not initialized. Call initialize() first.")
        
        try:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
            
            texts = []
            metadatas = []
            
            for doc in documents:
                content = doc.get('content', '')
                if not content:
                    continue
                
                chunks = text_splitter.split_text(content)
                texts.extend(chunks)
                
                metadata = {
                    'policy_name': doc.get('name', 'Unknown'),
                    'category': doc.get('category', 'General'),
                    'version': doc.get('version', '1.0'),
                    'source': doc.get('source', 'Internal')
                }
                metadatas.extend([metadata for _ in chunks])
            
            if not texts:
                print("⚠️  No text content to index")
                return
            
            # Create new vector store
            self.vector_store = Chroma.from_texts(
                texts=texts,
                embedding=self.embeddings,
                metadatas=metadatas,
                persist_directory=self.persist_directory,
                collection_name=self.collection_name
            )
            
            print(f"✅ Loaded {len(texts)} document chunks into ChromaDB")
            
        except Exception as e:
            print(f"❌ Error loading documents: {e}")
            raise
    
    def ask_question(self, question: str, k: int = None) -> Dict:
        """Ask question about policies using RAG"""
        if not self._initialized:
            return {
                'question': question,
                'answer': 'RAG engine not initialized.',
                'sources': [],
                'confidence': 'error'
            }
        
        try:
            if self.vector_store is None:
                return {
                    'question': question,
                    'answer': 'Policy database is empty. Please upload policy documents first.',
                    'sources': [],
                    'confidence': 'none'
                }
            
            # Use configured k or default
            k = k or settings.rag_top_k_results
            
            # Search for relevant documents
            docs = self.vector_store.similarity_search(question, k=k)
            
            if not docs:
                return {
                    'question': question,
                    'answer': 'No relevant policy information found for your question.',
                    'sources': [],
                    'confidence': 'none'
                }
            
            # Build context from retrieved documents
            context = "\n\n".join([
                f"[Policy: {doc.metadata.get('policy_name', 'Unknown')}]\n{doc.page_content}"
                for doc in docs
            ])
            
            # Create prompt for Gemini
            prompt = f"""You are an expert HR policy assistant. Answer the employee's question based ONLY on the provided company policy documents.


Company Policy Information:
{context}


Employee Question: {question}


Instructions:
1. Provide a clear, direct answer
2. Cite specific policies when applicable
3. If the policy doesn't cover the question, say so
4. Include any important conditions or exceptions
5. Be concise but comprehensive


Answer:"""
            
            # Generate answer using Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=settings.gemini_temperature,
                    max_output_tokens=1024
                )
            )
            answer = response.text.strip()
            
            # Prepare sources
            sources = [{
                'content': doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                'policy_name': doc.metadata.get('policy_name', 'Unknown'),
                'category': doc.metadata.get('category', 'General'),
                'version': doc.metadata.get('version', '1.0')
            } for doc in docs]
            
            # Determine confidence based on number of relevant documents
            if len(docs) >= 4:
                confidence = 'high'
            elif len(docs) >= 2:
                confidence = 'medium'
            else:
                confidence = 'low'
            
            return {
                'question': question,
                'answer': answer,
                'sources': sources,
                'confidence': confidence,
                'num_sources': len(docs)
            }
            
        except Exception as e:
            print(f"❌ Error in RAG query: {e}")
            return {
                'question': question,
                'answer': f"Error processing your question: {str(e)}",
                'sources': [],
                'confidence': 'error'
            }
