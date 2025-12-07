# Diaryverse AI Chatbot 🤖

A custom AI chatbot built with Hugging Face Transformers - No API keys required!

## Features

✅ **Conversational AI** - Natural dialogue using DialoGPT
✅ **Context-Aware** - Maintains conversation history per user
✅ **Question Answering** - Extract answers from provided context
✅ **Text Generation** - Creative writing assistance
✅ **Local Processing** - No external API calls, all processing on your machine
✅ **GPU Support** - Automatically uses CUDA if available
✅ **RESTful API** - Easy integration with frontend

## Quick Start

### 1. Setup (First Time Only)

```bash
# Run the setup script
setup.bat
```

This will:

- Create a Python virtual environment
- Install all dependencies (PyTorch, Transformers, Flask, etc.)
- Download AI models (~1-2GB on first run)
- Create configuration file

### 2. Start the Server

```bash
# Run the start script
start-bot.bat
```

The server will start on `http://localhost:5001`

### 3. Test the API

```bash
curl -X POST http://localhost:5001/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello! How are you?\"}"
```

## API Endpoints

### 1. Chat - `/chat` (POST)

Send a message and get AI response

**Request:**

```json
{
  "message": "Tell me about yourself",
  "userId": "user123",
  "temperature": 0.7,
  "maxLength": 150
}
```

**Response:**

```json
{
  "response": "I'm an AI assistant created to help you...",
  "timestamp": "2025-11-08T10:30:00",
  "userId": "user123",
  "success": true
}
```

### 2. Reset Conversation - `/chat/reset` (POST)

Clear conversation history for a user

**Request:**

```json
{
  "userId": "user123"
}
```

### 3. Get History - `/chat/history` (POST)

Retrieve conversation history

**Request:**

```json
{
  "userId": "user123"
}
```

**Response:**

```json
{
  "history": ["Hello!", "Hi there! How can I help?"],
  "messageCount": 2,
  "success": true
}
```

### 4. Question Answering - `/qa` (POST)

Extract answers from context

**Request:**

```json
{
  "question": "What is the capital of France?",
  "context": "Paris is the capital and most populous city of France."
}
```

### 5. Text Generation - `/generate` (POST)

Generate creative text

**Request:**

```json
{
  "prompt": "Once upon a time",
  "maxLength": 100,
  "numSequences": 1
}
```

### 6. Health Check - `/health` (GET)

Check if server is running

### 7. Model Info - `/models/info` (GET)

Get information about loaded models

## Configuration

Edit `.env` file to customize:

```env
PORT=5001                              # Server port
DEBUG=False                            # Debug mode
MODEL_NAME=microsoft/DialoGPT-medium   # AI model to use
```

### Available Models

**Conversational Models:**

- `microsoft/DialoGPT-small` - Fast, 117M parameters (~500MB)
- `microsoft/DialoGPT-medium` - Balanced, 345M parameters (~1.4GB) - **Default**
- `microsoft/DialoGPT-large` - High quality, 762M parameters (~3GB)
- `facebook/blenderbot-400M-distill` - Good conversations (~1.6GB)

**Text Generation:**

- `gpt2` - Small, fast (~500MB)
- `gpt2-medium` - Better quality (~1.5GB)
- `gpt2-large` - High quality (~3GB)

## System Requirements

### Minimum:

- Python 3.8 or higher
- 4GB RAM
- 5GB free disk space

### Recommended:

- Python 3.10+
- 8GB+ RAM
- NVIDIA GPU with CUDA support (optional, for faster responses)
- 10GB+ free disk space

## Performance

**Without GPU (CPU only):**

- Response time: 2-5 seconds
- Memory usage: ~2GB

**With GPU (CUDA):**

- Response time: 0.5-1 second
- Memory usage: ~3GB (VRAM)

## Integration with Frontend

Add this to your frontend chat component:

```javascript
// Example React integration
const sendMessage = async (message) => {
  const response = await fetch("http://localhost:5001/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message,
      userId: currentUser.id,
      temperature: 0.7,
      maxLength: 150,
    }),
  });

  const data = await response.json();
  return data.response;
};
```

## Troubleshooting

### Issue: "Module not found" error

**Solution:** Run `setup.bat` again to reinstall dependencies

### Issue: Models downloading slowly

**Solution:** Models are cached after first download. Subsequent starts are fast.

### Issue: Out of memory

**Solution:** Use a smaller model like `microsoft/DialoGPT-small`

### Issue: Server not starting

**Solution:**

1. Check if port 5001 is available
2. Check Python version: `python --version`
3. Check logs in terminal for errors

## Advanced Usage

### Custom Model

Edit `chatbot.py` and change the model initialization:

```python
chatbot = DiaryverseAI(model_name="facebook/blenderbot-400M-distill")
```

### Adjust Response Quality

In API request, adjust parameters:

```json
{
  "message": "Hello",
  "temperature": 0.9, // Higher = more creative (0.0-1.0)
  "maxLength": 200, // Longer responses
  "topP": 0.95, // Nucleus sampling
  "topK": 50 // Top-k sampling
}
```

## Production Deployment

For production use, consider:

1. **Use Gunicorn** instead of Flask dev server:

```bash
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

2. **Add rate limiting** to prevent abuse

3. **Use Redis** for conversation history storage

4. **Add authentication** to protect API

5. **Deploy on GPU server** for better performance

## Architecture

```
Bot/
├── app.py              # Flask API server
├── chatbot.py          # AI models and logic
├── requirements.txt    # Python dependencies
├── setup.bat           # Setup script
├── start-bot.bat       # Start server script
├── .env.example        # Configuration template
└── README.md           # This file

venv/                   # Virtual environment (created by setup)
└── ...

models/                 # Downloaded models (created automatically)
└── ...
```

## License

This chatbot uses open-source models from Hugging Face:

- DialoGPT: MIT License
- GPT-2: Modified MIT License
- DistilBERT: Apache 2.0

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review server logs
3. Ensure all dependencies are installed

---

**Made with ❤️ for Diaryverse**
