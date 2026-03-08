"""
RAG Engine - Core Retrieval-Augmented Generation pipeline.

Handles:
- Query expansion (generate multiple search queries from user input)
- Retrieval from vector store
- Context assembly from retrieved documents
- Answer generation using the retrieved context
"""

import os
import re
from typing import List, Dict, Optional
from backend.vector_store import VectorStore
from backend.markdown_parser import parse_knowledge_base


class RAGEngine:
    """RAG pipeline: query expansion -> retrieval -> context building -> answer generation."""

    def __init__(self):
        self.vector_store = VectorStore()
        self.documents = []
        self.is_ready = False
        self._similarity_threshold = 0.25  # Minimum similarity score to include

    def initialize(self):
        """Load knowledge base and build/load the vector index."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        kb_path = os.path.join(base_dir, "data", "knowledge.md")

        # Parse the knowledge base
        self.documents = parse_knowledge_base(kb_path)
        print(f"Loaded {len(self.documents)} Q&A pairs from knowledge base.")

        # Try to load existing index, otherwise build new one
        if self.vector_store.load_index():
            # Verify index matches current documents
            if self.vector_store.index.ntotal == len(self.documents):
                print("Using cached FAISS index.")
            else:
                print("Knowledge base changed. Rebuilding index...")
                self.vector_store.build_index(self.documents)
                self.vector_store.save_index()
        else:
            print("No cached index found. Building new index...")
            self.vector_store.build_index(self.documents)
            self.vector_store.save_index()

        self.is_ready = True
        print("RAG Engine initialized and ready.")

    def expand_query(self, user_question: str) -> List[str]:
        """
        Expand the user query into multiple search variations.
        This improves retrieval by searching with different phrasings.
        """
        queries = [user_question]

        normalized = user_question.lower().strip().rstrip("?").rstrip(".")

        # Variation 1: Rewrite as "How to" instruction
        if not normalized.startswith("how"):
            queries.append(f"How to {normalized}")

        # Variation 2: Rewrite as "What is" question
        if not normalized.startswith("what"):
            queries.append(f"What is {normalized}")

        # Variation 3: Extract key terms and search
        stop_words = {
            "i", "me", "my", "we", "our", "you", "your", "the", "a", "an",
            "is", "are", "was", "were", "be", "been", "being", "have", "has",
            "had", "do", "does", "did", "will", "would", "could", "should",
            "can", "may", "might", "shall", "to", "of", "in", "for", "on",
            "with", "at", "by", "from", "as", "into", "about", "between",
            "through", "during", "before", "after", "it", "this", "that",
            "these", "those", "there", "here", "where", "when", "how", "what",
            "which", "who", "if", "not", "no", "so", "but", "and", "or",
        }
        words = re.findall(r'\b\w+\b', normalized)
        key_terms = [w for w in words if w not in stop_words and len(w) > 2]
        if key_terms:
            queries.append(" ".join(key_terms))

        # Variation 4: Common synonym replacements for SoulSpace features
        synonym_map = {
            "diary": "journal entry",
            "journal": "diary entry",
            "post": "community post",
            "message": "chat message",
            "dm": "direct message",
            "pic": "profile picture",
            "avatar": "profile picture",
            "dark theme": "dark mode",
            "night mode": "dark mode",
            "points": "leaderboard",
            "rank": "leaderboard",
            "stats": "analytics",
            "metrics": "analytics",
            "sign up": "creating an account",
            "register": "creating an account",
            "login": "logging in",
            "sign in": "logging in",
            "delete account": "account deletion",
            "remove account": "account deletion",
            "password": "changing password",
            "friends": "followers",
            "connect": "following a user",
            "ai help": "ai features",
            "grammar": "ai grammar check",
            "writing help": "ai writing suggestions",
        }

        for term, replacement in synonym_map.items():
            if term in normalized:
                modified = normalized.replace(term, replacement)
                queries.append(modified)
                break  # Only one synonym expansion

        return queries

    def retrieve(self, user_question: str, top_k: int = 5) -> List[Dict]:
        """
        Retrieve relevant documents using query expansion and multi-search.
        """
        if not self.is_ready:
            raise RuntimeError("RAG Engine not initialized. Call initialize() first.")

        # Step 1: Expand the query
        expanded_queries = self.expand_query(user_question)

        # Step 2: Multi-search with expanded queries
        results = self.vector_store.multi_search(expanded_queries, top_k=top_k)

        # Step 3: Filter by similarity threshold
        filtered = [
            (doc, score) for doc, score in results
            if score >= self._similarity_threshold
        ]

        # If no results pass threshold, return top result anyway
        if not filtered and results:
            filtered = [results[0]]

        return filtered

    def build_context(self, retrieved: List) -> str:
        """
        Build a structured context block from retrieved documents.
        Includes related Q&A pairs for richer context.
        """
        if not retrieved:
            return "No relevant knowledge found."

        context_parts = []
        for i, (doc, score) in enumerate(retrieved, 1):
            context_parts.append(
                f"Knowledge {i} (relevance: {score:.2f}):\n"
                f"Q: {doc['question']}\n"
                f"A: {doc['answer']}"
            )

        return "\n\n".join(context_parts)

    def generate_answer(self, user_question: str) -> Dict:
        """
        Full RAG pipeline: expand query -> retrieve -> build context -> generate answer.
        
        Returns a dict with 'answer', 'sources', and 'confidence'.
        """
        # Retrieve relevant documents
        retrieved = self.retrieve(user_question, top_k=5)

        if not retrieved:
            return {
                "answer": "I'm sorry, I don't have information about that in my knowledge base. Could you try rephrasing your question about SoulSpace?",
                "sources": [],
                "confidence": 0.0,
            }

        # Build context
        context = self.build_context(retrieved)

        # Get the best matching answer
        best_doc, best_score = retrieved[0]

        # If high confidence (direct match), return the answer directly
        if best_score >= 0.7:
            answer = best_doc["answer"]
        elif best_score >= 0.4:
            # Medium confidence - combine top answers
            answers = []
            for doc, score in retrieved[:3]:
                if score >= 0.3:
                    answers.append(doc["answer"])
            answer = answers[0] if len(answers) == 1 else " ".join(answers[:2])
        else:
            # Low confidence - provide best guess with disclaimer
            answer = (
                f"Based on what I found, here's what might help: {best_doc['answer']} "
                f"If this doesn't answer your question, try asking in a different way."
            )

        sources = [
            {"question": doc["question"], "score": round(score, 3)}
            for doc, score in retrieved[:3]
        ]

        return {
            "answer": answer,
            "sources": sources,
            "confidence": round(best_score, 3),
        }


# Conversation memory for multi-turn chat
class ConversationMemory:
    """Simple in-memory conversation history per user."""

    def __init__(self, max_history: int = 20):
        self.histories: Dict[str, List[Dict]] = {}
        self.max_history = max_history

    def add_message(self, user_id: str, role: str, text: str):
        if user_id not in self.histories:
            self.histories[user_id] = []

        self.histories[user_id].append({"role": role, "text": text})

        # Trim old messages
        if len(self.histories[user_id]) > self.max_history:
            self.histories[user_id] = self.histories[user_id][-self.max_history:]

    def get_history(self, user_id: str) -> List[Dict]:
        return self.histories.get(user_id, [])

    def clear_history(self, user_id: str):
        self.histories.pop(user_id, None)
