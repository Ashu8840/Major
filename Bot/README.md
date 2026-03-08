# SoulSpace RAG Assistant

AI-powered question-answering assistant for SoulSpace using Retrieval-Augmented Generation (RAG).

## Architecture

```
Bot/
├── data/
│   └── knowledge.md          # Q&A knowledge base (1500+ pairs)
├── backend/
│   ├── main.py                # FastAPI server with /chat endpoint
│   ├── rag_engine.py          # RAG pipeline (query expansion + retrieval + generation)
│   ├── vector_store.py        # FAISS vector database + SentenceTransformer embeddings
│   └── markdown_parser.py     # Markdown Q&A parser
└── requirements.txt
```

## Setup

```bash
cd Bot
pip install -r requirements.txt
```

## Run

```bash
python -m backend.main
```

Server starts at `http://localhost:8000`

## API Endpoints

| Endpoint        | Method | Description               |
| --------------- | ------ | ------------------------- |
| `/chat`         | POST   | Send question, get answer |
| `/chat/history` | POST   | Get conversation history  |
| `/chat/reset`   | POST   | Clear conversation        |
| `/health`       | GET    | Health check              |

### POST /chat

```json
{
  "question": "How do I create a diary entry?",
  "userId": "user123"
}
```

Response:

```json
{
  "answer": "Click 'New Entry' in the Diary section...",
  "response": "Click 'New Entry' in the Diary section...",
  "sources": [...],
  "confidence": 0.85
}
```

## RAG Pipeline

1. **Parse** markdown knowledge base into Q&A pairs
2. **Embed** documents using `all-MiniLM-L6-v2` SentenceTransformer
3. **Index** embeddings in FAISS for fast similarity search
4. **Expand** user queries into multiple search variations
5. **Retrieve** top-5 most relevant documents
6. **Generate** answer from retrieved context
