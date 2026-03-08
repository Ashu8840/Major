"""
Vector Store - TF-IDF based vector search for semantic retrieval.

Handles:
- Generating TF-IDF vectors using scikit-learn
- Building and persisting the vectorizer + matrix
- Searching for similar documents using cosine similarity
"""

import os
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Tuple


# Paths for persisted index
INDEX_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
INDEX_PATH = os.path.join(INDEX_DIR, "tfidf_index.pkl")
DOCS_PATH = os.path.join(INDEX_DIR, "documents.pkl")


class VectorStore:
    """TF-IDF vector store with cosine similarity search."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            stop_words="english",
            sublinear_tf=True,
        )
        self.question_vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
        )
        self.tfidf_matrix = None
        self.question_matrix = None
        self.documents = []
        self.index = None  # Compatibility attribute (stores ntotal-like count)

    @property
    def ntotal(self):
        return len(self.documents) if self.tfidf_matrix is not None else 0

    def build_index(self, documents: List[dict]):
        """
        Build TF-IDF index from a list of document dicts.
        Each dict must have a 'document' key with the text to embed.
        """
        self.documents = documents
        texts = [doc["document"] for doc in documents]
        questions = [doc["question"] for doc in documents]

        print(f"Building TF-IDF index for {len(texts)} documents...")
        self.tfidf_matrix = self.vectorizer.fit_transform(texts)
        self.question_matrix = self.question_vectorizer.fit_transform(questions)

        # Set index compatibility object
        self.index = type("Index", (), {"ntotal": len(documents)})()

        print(f"TF-IDF index built with {len(documents)} vectors.")

    def save_index(self):
        """Persist the TF-IDF vectorizer, matrix, and documents to disk."""
        os.makedirs(INDEX_DIR, exist_ok=True)
        with open(INDEX_PATH, "wb") as f:
            pickle.dump({
                "vectorizer": self.vectorizer,
                "tfidf_matrix": self.tfidf_matrix,
                "question_vectorizer": self.question_vectorizer,
                "question_matrix": self.question_matrix,
            }, f)
        with open(DOCS_PATH, "wb") as f:
            pickle.dump(self.documents, f)
        print(f"Index saved to {INDEX_PATH}")

    def load_index(self) -> bool:
        """Load a previously saved TF-IDF index from disk. Returns True if successful."""
        if os.path.exists(INDEX_PATH) and os.path.exists(DOCS_PATH):
            with open(INDEX_PATH, "rb") as f:
                data = pickle.load(f)
                self.vectorizer = data["vectorizer"]
                self.tfidf_matrix = data["tfidf_matrix"]
                self.question_vectorizer = data.get("question_vectorizer", self.question_vectorizer)
                self.question_matrix = data.get("question_matrix")
            with open(DOCS_PATH, "rb") as f:
                self.documents = pickle.load(f)
            self.index = type("Index", (), {"ntotal": len(self.documents)})()
            print(f"Loaded TF-IDF index with {len(self.documents)} vectors.")
            return True
        return False

    def search(self, query: str, top_k: int = 5) -> List[Tuple[dict, float]]:
        """
        Search the vector store for documents similar to the query.
        Uses both document-level and question-level TF-IDF for better matching.
        Returns list of (document_dict, similarity_score) tuples.
        """
        if self.tfidf_matrix is None:
            raise RuntimeError("Index not built or loaded. Call build_index() or load_index() first.")

        # Transform query using both vectorizers
        query_vec = self.vectorizer.transform([query])
        doc_sim = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Question-level similarity (higher weight since user queries match questions better)
        if self.question_matrix is not None:
            q_vec = self.question_vectorizer.transform([query])
            q_sim = cosine_similarity(q_vec, self.question_matrix).flatten()
            # Combine: 60% question match + 40% document match
            similarities = 0.6 * q_sim + 0.4 * doc_sim
        else:
            similarities = doc_sim

        # Get top-k indices sorted by similarity
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(similarities[idx])
            if score > 0:
                results.append((self.documents[idx], score))

        return results

    def multi_search(self, queries: List[str], top_k: int = 5) -> List[Tuple[dict, float]]:
        """
        Search with multiple queries and merge results, removing duplicates.
        Used for query expansion - search with multiple rephrased queries.
        """
        seen = set()
        merged_results = []

        for query in queries:
            results = self.search(query, top_k=top_k)
            for doc, score in results:
                doc_key = doc["question"]
                if doc_key not in seen:
                    seen.add(doc_key)
                    merged_results.append((doc, score))

        # Sort by score descending
        merged_results.sort(key=lambda x: x[1], reverse=True)
        return merged_results[:top_k]


if __name__ == "__main__":
    from markdown_parser import parse_knowledge_base

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kb_path = os.path.join(base_dir, "data", "knowledge.md")

    docs = parse_knowledge_base(kb_path)
    print(f"Loaded {len(docs)} documents")

    store = VectorStore()
    store.build_index(docs)
    store.save_index()

    # Test search
    results = store.search("How do I create a diary entry?", top_k=3)
    print("\nSearch results for 'How do I create a diary entry?':")
    for doc, score in results:
        print(f"  [{score:.4f}] {doc['question']}")
