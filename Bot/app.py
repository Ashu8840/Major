from flask import Flask, request, jsonify
from flask_cors import CORS
from chatbot import get_chatbot, get_advanced_ai
import logging
from datetime import datetime
import os
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:3000')
TRAINING_QUERY_URL = f"{BACKEND_API_URL}/api/chatbot-training/query"

# Global variables for AI models
chatbot = None
advanced_ai = None

def query_training_data(question):
    """Query the backend for trained responses"""
    try:
        response = requests.post(
            TRAINING_QUERY_URL,
            json={"question": question},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('matched'):
                logger.info(f"Found trained response for: {question[:50]}...")
                return data.get('answer')
        
        return None
        
    except Exception as e:
        logger.warning(f"Failed to query training data: {e}")
        return None

def initialize_chatbot():
    """Initialize the chatbot model at startup"""
    global chatbot
    try:
        logger.info("Loading AI models... This may take a minute on first run.")
        logger.info("Initializing chatbot...")
        chatbot = get_chatbot()
        logger.info("Chatbot ready!")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize chatbot: {e}")
        return False

@app.before_request
def lazy_load_advanced():
    """Lazy load advanced AI only when needed"""
    global advanced_ai
    if advanced_ai is None and request.endpoint in ['answer_question', 'generate_text']:
        logger.info("Initializing advanced AI...")
        advanced_ai = get_advanced_ai()
        logger.info("Advanced AI ready!")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Diaryverse AI Chatbot",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": chatbot is not None
    })

@app.route('/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint
    
    Request body:
    {
        "message": "User's message",
        "userId": "unique_user_id" (optional),
        "temperature": 0.7 (optional),
        "maxLength": 1000 (optional)
    }
    
    Response:
    {
        "response": "AI's response",
        "timestamp": "ISO timestamp",
        "userId": "user_id"
    }
    """
    try:
        data = request.json
        
        if not data or 'message' not in data:
            return jsonify({
                "error": "Missing 'message' in request body"
            }), 400
        
        message = data['message'].strip()
        user_id = data.get('userId', 'default')
        temperature = data.get('temperature', 0.7)
        max_length = data.get('maxLength', 150)
        
        if not message:
            return jsonify({
                "error": "Message cannot be empty"
            }), 400
        
        logger.info(f"Received message from user {user_id}: {message[:50]}...")
        
        # Step 1: Check training data first
        trained_response = query_training_data(message)
        
        if trained_response:
            logger.info("Using trained response")
            return jsonify({
                "response": trained_response,
                "timestamp": datetime.now().isoformat(),
                "userId": user_id,
                "success": True,
                "source": "training"
            })
        
        # Step 2: Fall back to AI model
        logger.info("No trained response found, using AI model")
        response = chatbot.generate_response(
            message=message,
            user_id=user_id,
            max_length=max_length,
            temperature=temperature
        )
        
        logger.info(f"Generated response: {response[:50]}...")
        
        return jsonify({
            "response": response,
            "timestamp": datetime.now().isoformat(),
            "userId": user_id,
            "success": True,
            "source": "ai"
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "success": False
        }), 500

@app.route('/chat/reset', methods=['POST'])
def reset_conversation():
    """
    Reset conversation history for a user
    
    Request body:
    {
        "userId": "unique_user_id" (optional)
    }
    """
    try:
        data = request.json or {}
        user_id = data.get('userId', 'default')
        
        chatbot.reset_conversation(user_id)
        
        return jsonify({
            "message": "Conversation reset successfully",
            "userId": user_id,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error resetting conversation: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "success": False
        }), 500

@app.route('/chat/history', methods=['POST'])
def get_history():
    """
    Get conversation history for a user
    
    Request body:
    {
        "userId": "unique_user_id" (optional)
    }
    """
    try:
        data = request.json or {}
        user_id = data.get('userId', 'default')
        
        history = chatbot.get_conversation_history(user_id)
        
        return jsonify({
            "history": history,
            "userId": user_id,
            "messageCount": len(history),
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "success": False
        }), 500

@app.route('/qa', methods=['POST'])
def answer_question():
    """
    Question Answering endpoint
    
    Request body:
    {
        "question": "Your question",
        "context": "Text context to search for answer"
    }
    """
    try:
        data = request.json
        
        if not data or 'question' not in data or 'context' not in data:
            return jsonify({
                "error": "Missing 'question' or 'context' in request body"
            }), 400
        
        question = data['question']
        context = data['context']
        
        result = advanced_ai.answer_question(question, context)
        
        return jsonify({
            **result,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error in QA endpoint: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "success": False
        }), 500

@app.route('/generate', methods=['POST'])
def generate_text():
    """
    Text generation endpoint
    
    Request body:
    {
        "prompt": "Starting text",
        "maxLength": 100 (optional),
        "numSequences": 1 (optional)
    }
    """
    try:
        data = request.json
        
        if not data or 'prompt' not in data:
            return jsonify({
                "error": "Missing 'prompt' in request body"
            }), 400
        
        prompt = data['prompt']
        max_length = data.get('maxLength', 100)
        num_sequences = data.get('numSequences', 1)
        
        results = advanced_ai.generate_text(
            prompt=prompt,
            max_length=max_length,
            num_return_sequences=num_sequences
        )
        
        return jsonify({
            "results": results,
            "prompt": prompt,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error in text generation endpoint: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "success": False
        }), 500

@app.route('/models/info', methods=['GET'])
def models_info():
    """Get information about loaded models"""
    return jsonify({
        "chatbot": {
            "model": chatbot.model_name if chatbot else "Not loaded",
            "device": chatbot.device if chatbot else "N/A",
            "loaded": chatbot is not None
        },
        "advanced_ai": {
            "loaded": advanced_ai is not None,
            "qa_model": "distilbert-base-cased-distilled-squad",
            "text_gen_model": "gpt2"
        },
        "success": True
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "success": False
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "Internal server error",
        "success": False
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Diaryverse AI Chatbot Server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    # Initialize chatbot before starting server
    if not initialize_chatbot():
        logger.error("Failed to initialize chatbot. Exiting.")
        exit(1)
    
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
