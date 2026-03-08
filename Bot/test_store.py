"""Quick test of the TF-IDF vector store."""
import os
from backend.vector_store import VectorStore
from backend.markdown_parser import parse_knowledge_base

docs = parse_knowledge_base(os.path.join("data", "knowledge.md"))
print(f"{len(docs)} docs parsed")

vs = VectorStore()
vs.build_index(docs)
vs.save_index()

queries = [
    "how to create journal",
    "dark mode",
    "delete my account",
    "what is soulspace",
    "chat with friends",
]

for q in queries:
    results = vs.search(q, top_k=3)
    print(f"\nQuery: '{q}'")
    for doc, score in results:
        print(f"  [{score:.3f}] {doc['question'][:70]}")
