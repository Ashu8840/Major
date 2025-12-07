import os

# Ensure any Hugging Face token environment variables are cleared so the
# library does not send an invalid Authorization header when downloading
# public models. This forces anonymous access and avoids 401 errors when
# an invalid token is present in the environment.
for _v in ("HUGGINGFACE_HUB_TOKEN", "HF_HUB_TOKEN", "HUGGINGFACE_TOKEN", "HF_TOKEN"):
    os.environ.pop(_v, None)

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from typing import List, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiaryverseAI:
    """
    Custom AI Chatbot for Diaryverse
    Using Hugging Face transformers with local models (no API calls)
    """
    
    def __init__(self, model_name: str = "microsoft/DialoGPT-medium"):
        """
        Initialize the chatbot with a pre-trained model
        
        Available models:
        - microsoft/DialoGPT-small: Fast, lightweight (117M params)
        - microsoft/DialoGPT-medium: Balanced (345M params) - Default
        - microsoft/DialoGPT-large: High quality (762M params)
        - facebook/blenderbot-400M-distill: Good conversational AI
        - facebook/opt-350m: Facebook's OPT model
        """
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing DiaryverseAI with model: {model_name}")
        logger.info(f"Using device: {self.device}")
        
        try:
            # Load tokenizer and model (force anonymous access)
            logger.info("Loading tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_auth_token=False)
            
            logger.info("Loading model... This may take a few minutes on first run.")
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                low_cpu_mem_usage=True,
                use_auth_token=False
            )
            self.model.to(self.device)
            
            # Set pad token if not exists
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            logger.info("Model loaded successfully!")
            
            # Conversation history
            self.conversations = {}
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {e}")
            # Try fallback to smaller model if medium/large failed
            if "medium" in model_name or "large" in model_name:
                logger.info("Attempting fallback to DialoGPT-small...")
                try:
                    self.model_name = "microsoft/DialoGPT-small"
                    self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, use_auth_token=False)
                    self.model = AutoModelForCausalLM.from_pretrained(
                        self.model_name,
                        torch_dtype=torch.float32,
                        low_cpu_mem_usage=True,
                        use_auth_token=False
                    )
                    self.model.to(self.device)
                    if self.tokenizer.pad_token is None:
                        self.tokenizer.pad_token = self.tokenizer.eos_token
                    self.conversations = {}
                    logger.info("Fallback model loaded successfully!")
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed: {fallback_error}")
                    raise
            else:
                raise
    
    def generate_response(
        self, 
        message: str, 
        user_id: str = "default",
        max_length: int = 1000,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50
    ) -> str:
        """
        Generate a response to the user's message
        
        Args:
            message: User's input message
            user_id: Unique identifier for the user (for conversation history)
            max_length: Maximum length of response
            temperature: Controls randomness (0.0-1.0, higher = more random)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            
        Returns:
            Generated response text
        """
        try:
            # Get or create conversation history
            if user_id not in self.conversations:
                self.conversations[user_id] = []
            
            # Add user message to history
            self.conversations[user_id].append(message)
            
            # Prepare input with conversation context
            # Limit history to last 5 exchanges to avoid context overflow
            history = self.conversations[user_id][-10:]
            input_text = " ".join(history) + self.tokenizer.eos_token
            
            # Encode input
            input_ids = self.tokenizer.encode(
                input_text, 
                return_tensors="pt",
                truncation=True,
                max_length=1024
            ).to(self.device)
            
            # Generate response
            with torch.no_grad():
                output = self.model.generate(
                    input_ids,
                    max_length=min(input_ids.shape[1] + max_length, 1024),
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    no_repeat_ngram_size=3,
                    repetition_penalty=1.2
                )
            
            # Decode response
            response = self.tokenizer.decode(
                output[0][input_ids.shape[1]:], 
                skip_special_tokens=True
            ).strip()
            
            # Add response to conversation history
            if response:
                self.conversations[user_id].append(response)
            else:
                response = "I'm here to help! Could you please rephrase your question?"
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I apologize, but I encountered an error. Please try again."
    
    def reset_conversation(self, user_id: str = "default"):
        """Reset conversation history for a user"""
        if user_id in self.conversations:
            self.conversations[user_id] = []
            logger.info(f"Reset conversation for user: {user_id}")
    
    def get_conversation_history(self, user_id: str = "default") -> List[str]:
        """Get conversation history for a user"""
        return self.conversations.get(user_id, [])
    
    def clear_all_conversations(self):
        """Clear all conversation histories"""
        self.conversations = {}
        logger.info("Cleared all conversations")


class DiaryverseAIAdvanced:
    """
    Advanced AI with question-answering and text generation capabilities
    """
    
    def __init__(self):
        """Initialize advanced AI models"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing Advanced AI on device: {self.device}")
        
        try:
            # Question Answering model
            self.qa_pipeline = pipeline(
                "question-answering",
                model="distilbert-base-cased-distilled-squad",
                device=0 if self.device == "cuda" else -1
            )
            
            # Text generation model
            self.text_gen_pipeline = pipeline(
                "text-generation",
                model="gpt2",
                device=0 if self.device == "cuda" else -1
            )
            
            logger.info("Advanced AI models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading advanced models: {e}")
            raise
    
    def answer_question(self, question: str, context: str) -> Dict[str, any]:
        """
        Answer a question based on provided context
        
        Args:
            question: The question to answer
            context: Context text to search for answer
            
        Returns:
            Dictionary with answer and confidence score
        """
        try:
            result = self.qa_pipeline(question=question, context=context)
            return {
                "answer": result["answer"],
                "confidence": result["score"],
                "start": result["start"],
                "end": result["end"]
            }
        except Exception as e:
            logger.error(f"Error in question answering: {e}")
            return {
                "answer": "I couldn't find an answer in the provided context.",
                "confidence": 0.0
            }
    
    def generate_text(
        self, 
        prompt: str, 
        max_length: int = 100,
        num_return_sequences: int = 1
    ) -> List[str]:
        """
        Generate creative text based on a prompt
        
        Args:
            prompt: Starting text for generation
            max_length: Maximum length of generated text
            num_return_sequences: Number of variations to generate
            
        Returns:
            List of generated text sequences
        """
        try:
            results = self.text_gen_pipeline(
                prompt,
                max_length=max_length,
                num_return_sequences=num_return_sequences,
                temperature=0.8,
                top_k=50,
                top_p=0.95,
                do_sample=True
            )
            return [result["generated_text"] for result in results]
        except Exception as e:
            logger.error(f"Error in text generation: {e}")
            return [f"{prompt} (Error: Could not generate text)"]


# Singleton instance
_chatbot_instance = None
_advanced_ai_instance = None

def get_chatbot() -> DiaryverseAI:
    """Get or create chatbot singleton instance"""
    global _chatbot_instance
    if _chatbot_instance is None:
        _chatbot_instance = DiaryverseAI()
    return _chatbot_instance

def get_advanced_ai() -> DiaryverseAIAdvanced:
    """Get or create advanced AI singleton instance"""
    global _advanced_ai_instance
    if _advanced_ai_instance is None:
        _advanced_ai_instance = DiaryverseAIAdvanced()
    return _advanced_ai_instance
