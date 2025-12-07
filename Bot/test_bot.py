"""
Test script for Diaryverse AI Chatbot
Run this after starting the server to test all endpoints
"""

import requests
import json
from time import sleep

BASE_URL = "http://localhost:5001"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def test_health():
    print_section("1. Testing Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_chat():
    print_section("2. Testing Chat Endpoint")
    
    messages = [
        "Hello! What's your name?",
        "Can you help me write a diary entry?",
        "Tell me a motivational quote"
    ]
    
    user_id = "test_user_123"
    
    for i, message in enumerate(messages, 1):
        print(f"\n--- Message {i} ---")
        print(f"User: {message}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/chat",
                json={
                    "message": message,
                    "userId": user_id,
                    "temperature": 0.7,
                    "maxLength": 150
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Bot: {data['response']}")
                print(f"✅ Success")
            else:
                print(f"❌ Error: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        sleep(1)  # Small delay between requests

def test_reset():
    print_section("3. Testing Reset Conversation")
    try:
        response = requests.post(
            f"{BASE_URL}/chat/reset",
            json={"userId": "test_user_123"}
        )
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_history():
    print_section("4. Testing Get History")
    try:
        response = requests.post(
            f"{BASE_URL}/chat/history",
            json={"userId": "test_user_123"}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Message count: {data.get('messageCount', 0)}")
        print(f"History: {data.get('history', [])}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_qa():
    print_section("5. Testing Question Answering")
    try:
        response = requests.post(
            f"{BASE_URL}/qa",
            json={
                "question": "What is Diaryverse?",
                "context": "Diaryverse is a digital journaling platform that helps users document their daily thoughts, experiences, and memories. It features mood tracking, AI assistance, and community sharing."
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Question: What is Diaryverse?")
            print(f"Answer: {data.get('answer')}")
            print(f"Confidence: {data.get('confidence', 0):.2%}")
        else:
            print(response.text)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_text_generation():
    print_section("6. Testing Text Generation")
    try:
        response = requests.post(
            f"{BASE_URL}/generate",
            json={
                "prompt": "Today was an amazing day because",
                "maxLength": 80,
                "numSequences": 1
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Generated text:")
            for i, text in enumerate(data.get('results', []), 1):
                print(f"{i}. {text}")
        else:
            print(response.text)
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_model_info():
    print_section("7. Testing Model Info")
    try:
        response = requests.get(f"{BASE_URL}/models/info")
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║       Diaryverse AI Chatbot Test Suite             ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """)
    
    print(f"Testing server at: {BASE_URL}")
    print("Make sure the server is running (start-bot.bat)")
    print()
    
    input("Press Enter to start tests...")
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_health()))
    sleep(1)
    
    results.append(("Chat", test_chat()))
    sleep(1)
    
    results.append(("Reset Conversation", test_reset()))
    sleep(1)
    
    results.append(("Get History", test_history()))
    sleep(1)
    
    results.append(("Question Answering", test_qa()))
    sleep(1)
    
    results.append(("Text Generation", test_text_generation()))
    sleep(1)
    
    results.append(("Model Info", test_model_info()))
    
    # Print summary
    print_section("Test Summary")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:.<40} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Chatbot is working correctly!")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")

if __name__ == "__main__":
    main()
