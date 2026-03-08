"""
Markdown Parser - Extracts Q&A pairs from the knowledge base markdown file.

Parses the markdown file with format:
### Question
<question text>
### Answer
<answer text>
---

Converts each pair into a document string for embedding.
"""

import re
import os
from typing import List, Dict


def parse_knowledge_base(filepath: str) -> List[Dict[str, str]]:
    """
    Parse the markdown knowledge base and extract Q&A pairs.
    
    Returns a list of dicts with 'question', 'answer', and 'document' keys.
    The 'document' field is the combined string used for embedding.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Knowledge base not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by separator
    blocks = re.split(r"---\s*", content)
    
    documents = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Extract question and answer using ### headers
        question_match = re.search(
            r"###\s*Question\s*\n+(.*?)(?=###\s*Answer)", block, re.DOTALL
        )
        answer_match = re.search(
            r"###\s*Answer\s*\n+(.*)", block, re.DOTALL
        )

        if question_match and answer_match:
            question = question_match.group(1).strip()
            answer = answer_match.group(1).strip()

            if question and answer:
                # Create the document string for embedding
                document = f"Question: {question}\nAnswer: {answer}"
                documents.append({
                    "question": question,
                    "answer": answer,
                    "document": document,
                })

    return documents


def get_document_texts(documents: List[Dict[str, str]]) -> List[str]:
    """Extract just the document strings for embedding."""
    return [doc["document"] for doc in documents]


if __name__ == "__main__":
    # Test the parser
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kb_path = os.path.join(base_dir, "data", "knowledge.md")
    
    docs = parse_knowledge_base(kb_path)
    print(f"Parsed {len(docs)} Q&A pairs from knowledge base.")
    
    if docs:
        print(f"\nSample document:")
        print(f"  Question: {docs[0]['question']}")
        print(f"  Answer: {docs[0]['answer'][:100]}...")
